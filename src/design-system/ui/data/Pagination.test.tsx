import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("conta em frase, nao em fracao", () => {
    render(
      <Pagination page={1} pageSize={10} total={84} itemLabel="notas" onPageChange={() => {}} />,
    );
    expect(screen.getByText(/Mostrando 1 a 10 de 84 notas/)).toBeInTheDocument();
  });

  it("nao deixa voltar da primeira pagina", async () => {
    const aoMudar = vi.fn();
    render(
      <Pagination page={1} pageSize={10} total={84} itemLabel="notas" onPageChange={aoMudar} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /anterior/i }));
    expect(aoMudar).not.toHaveBeenCalled();
  });

  it("avanca de pagina", async () => {
    const aoMudar = vi.fn();
    render(
      <Pagination page={1} pageSize={10} total={84} itemLabel="notas" onPageChange={aoMudar} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /pr[óo]xima/i }));
    expect(aoMudar).toHaveBeenCalledWith(2);
  });

  it("na ultima pagina a contagem nao passa do total", () => {
    render(
      <Pagination page={9} pageSize={10} total={84} itemLabel="notas" onPageChange={() => {}} />,
    );
    expect(screen.getByText(/Mostrando 81 a 84 de 84 notas/)).toBeInTheDocument();
  });

  it("usa 'registros' como substantivo padrao quando itemLabel nao e passado", () => {
    render(<Pagination page={1} pageSize={10} total={84} onPageChange={() => {}} />);
    expect(screen.getByText(/Mostrando 1 a 10 de 84 registros/)).toBeInTheDocument();
  });

  it("com total zero nao renderiza nada — paginar o nada nao significa coisa alguma", () => {
    const { container } = render(
      <Pagination page={1} pageSize={10} total={0} onPageChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("com total zero nao sobra nem botao de pagina nem frase de vazio", () => {
    // O vazio e assunto da tabela acima (`TableEmpty`). Aqui sobravam uma
    // segunda frase, dois botoes desabilitados e um botao de pagina "1".
    render(<Pagination page={1} pageSize={10} total={0} onPageChange={() => {}} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("Nenhum resultado encontrado.")).not.toBeInTheDocument();
  });

  it("com um registro so continua paginando — o corte e no zero, nao no pouco", () => {
    render(<Pagination page={1} pageSize={10} total={1} itemLabel="notas" onPageChange={() => {}} />);
    expect(screen.getByText(/Mostrando 1 a 1 de 1 notas/)).toBeInTheDocument();
  });
});
