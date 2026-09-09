import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ModalObservacoesDaNota from "./ModalObservacoesDaNota";

/**
 * O modal que busca o texto ao abrir.
 *
 * O texto das observações saiu da listagem de vendas — eram ~1,7 MB de campo
 * livre em toda carga da tela, e é o conteúdo mais sensível da nota. O que se
 * trava aqui é o que essa mudança introduziu: uma busca assíncrona por trás
 * de um clique, com tudo o que isso traz — a espera, a falha, e a resposta
 * que chega depois de o modal já ter fechado.
 */

const fetchObservacoesDaVenda = vi.hoisted(() => vi.fn());
vi.mock("../services/notasapi", () => ({ fetchObservacoesDaVenda }));

beforeEach(() => {
  fetchObservacoesDaVenda.mockReset();
});

describe("ModalObservacoesDaNota", () => {
  it("mostra o texto da nota pedida", async () => {
    fetchObservacoesDaVenda.mockResolvedValue("Entregue na portaria.");
    render(<ModalObservacoesDaNota idNota={42} onClose={vi.fn()} />);

    expect(await screen.findByText("Entregue na portaria.")).toBeInTheDocument();
    expect(fetchObservacoesDaVenda).toHaveBeenCalledWith(42);
  });

  it("avisa enquanto busca, em vez de piscar vazio", async () => {
    fetchObservacoesDaVenda.mockReturnValue(new Promise(() => {}));
    render(<ModalObservacoesDaNota idNota={1} onClose={vi.fn()} />);

    expect(screen.getByText("Carregando…")).toBeInTheDocument();
  });

  it("distingue falha de nota sem observação", async () => {
    // As duas situações mostravam o mesmo vazio antes de o texto sair da
    // listagem, porque não havia busca que pudesse falhar. Agora há.
    fetchObservacoesDaVenda.mockRejectedValue(new Error("rede"));
    const { unmount } = render(
      <ModalObservacoesDaNota idNota={1} onClose={vi.fn()} />,
    );
    expect(
      await screen.findByText(/Não foi possível carregar as observações/),
    ).toBeInTheDocument();
    unmount();

    fetchObservacoesDaVenda.mockResolvedValue(null);
    render(<ModalObservacoesDaNota idNota={2} onClose={vi.fn()} />);
    expect(
      await screen.findByText("Esta nota não tem observações."),
    ).toBeInTheDocument();
  });

  it("troca de nota sem deixar a resposta antiga vencer a nova", async () => {
    // O caso que o `ativo` do efeito existe para fechar: clicar numa nota,
    // fechar, clicar noutra, e a primeira resposta chegar por último. Sem a
    // guarda, o modal mostraria a observação da nota errada — que aqui é
    // dado de outro cliente.
    let responderPrimeira: (texto: string) => void = () => {};
    fetchObservacoesDaVenda.mockImplementationOnce(
      () => new Promise<string>((resolve) => (responderPrimeira = resolve)),
    );
    const { rerender } = render(
      <ModalObservacoesDaNota idNota={1} onClose={vi.fn()} />,
    );

    fetchObservacoesDaVenda.mockResolvedValueOnce("da segunda nota");
    rerender(<ModalObservacoesDaNota idNota={2} onClose={vi.fn()} />);
    await screen.findByText("da segunda nota");

    responderPrimeira("da PRIMEIRA nota");
    await waitFor(() => {
      expect(screen.queryByText("da PRIMEIRA nota")).not.toBeInTheDocument();
    });
    expect(screen.getByText("da segunda nota")).toBeInTheDocument();
  });
});
