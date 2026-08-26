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

  it("mostra a frase de vazio com ponto final quando o total e zero", () => {
    render(<Pagination page={1} pageSize={10} total={0} onPageChange={() => {}} />);
    expect(screen.getByText("Nenhum resultado encontrado.")).toBeInTheDocument();
  });
});
