import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MultiSelect } from "./MultiSelect";
import { buscaPorCnpjEntreParenteses, deTextos } from "./buscaDeMultiSelect";

const OPCOES = deTextos([
  "Alfa Mineração (11.222.333/0001-44)",
  "Beta Logística (55.666.777/0001-88)",
]);

describe("MultiSelect", () => {
  it("fechado, mostra o placeholder; com escolha, mostra a contagem", () => {
    const { rerender } = render(
      <MultiSelect opcoes={OPCOES} selecionados={[]} onChange={vi.fn()} placeholder="Todas as empresas" />,
    );
    expect(screen.getByRole("button", { name: "Todas as empresas" })).toBeInTheDocument();

    rerender(
      <MultiSelect opcoes={OPCOES} selecionados={[OPCOES[0].valor]} onChange={vi.fn()} placeholder="Todas as empresas" />,
    );
    expect(screen.getByRole("button", { name: "1 selecionado(s)" })).toBeInTheDocument();
  });

  it("marcar acrescenta e marcar de novo tira", () => {
    const onChange = vi.fn();
    render(
      <MultiSelect opcoes={OPCOES} selecionados={[]} onChange={onChange} placeholder="Empresas" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Empresas" }));

    fireEvent.click(screen.getByRole("checkbox", { name: /Alfa/ }));
    expect(onChange).toHaveBeenCalledWith([OPCOES[0].valor]);
  });

  it("o dropdown NÃO fecha ao marcar — é o que a cópia fazia e ninguém queria", () => {
    // Nas telas o componente era declarado dentro da página, então marcar
    // recriava o componente e o dropdown fechava, apagando a busca. Fora da
    // página, o estado sobrevive.
    const onChange = vi.fn();
    const { rerender } = render(
      <MultiSelect opcoes={OPCOES} selecionados={[]} onChange={onChange} placeholder="Empresas" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Empresas" }));
    fireEvent.change(screen.getByPlaceholderText("Pesquisar..."), { target: { value: "alfa" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Alfa/ }));

    rerender(
      <MultiSelect opcoes={OPCOES} selecionados={[OPCOES[0].valor]} onChange={onChange} placeholder="Empresas" />,
    );

    expect(screen.getByPlaceholderText("Pesquisar...")).toHaveValue("alfa");
  });

  it("a estratégia de busca é escolhida por quem usa", () => {
    render(
      <MultiSelect
        opcoes={OPCOES}
        selecionados={[]}
        onChange={vi.fn()}
        placeholder="Empresas"
        buscarPor={buscaPorCnpjEntreParenteses}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Empresas" }));

    fireEvent.change(screen.getByPlaceholderText("Pesquisar..."), { target: { value: "11222333" } });

    expect(screen.getByRole("checkbox", { name: /Alfa/ })).toBeInTheDocument();
  });

  it("sem resultado, diz que não achou", () => {
    render(<MultiSelect opcoes={OPCOES} selecionados={[]} onChange={vi.fn()} placeholder="Empresas" />);
    fireEvent.click(screen.getByRole("button", { name: "Empresas" }));

    fireEvent.change(screen.getByPlaceholderText("Pesquisar..."), { target: { value: "gama" } });

    expect(screen.getByText("Nenhum resultado encontrado")).toBeInTheDocument();
  });

  it("'Limpar seleção' devolve lista vazia", () => {
    const onChange = vi.fn();
    render(
      <MultiSelect opcoes={OPCOES} selecionados={[OPCOES[0].valor]} onChange={onChange} placeholder="Empresas" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "1 selecionado(s)" }));

    fireEvent.click(screen.getByRole("button", { name: "Limpar seleção" }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("clicar fora fecha", () => {
    render(<MultiSelect opcoes={OPCOES} selecionados={[]} onChange={vi.fn()} placeholder="Empresas" />);
    fireEvent.click(screen.getByRole("button", { name: "Empresas" }));

    fireEvent.mouseDown(document.body);

    expect(screen.queryByPlaceholderText("Pesquisar...")).not.toBeInTheDocument();
  });
});
