import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Estoque from "./Estoque";

/**
 * Caracterização da PAGINAÇÃO COMO ELA VIVE em Estoque.
 *
 * Molde de `Produtos.paginacao.test.tsx` (Task 2). Diferença: Estoque NÃO
 * agrega — cada produto do fixture vira uma linha da tabela —, então o
 * fixture já é uma lista de N produtos, com N = pageSize + 2.
 *
 * A ordenação padrão é por `nome` ascendente (Estoque.tsx ~linha 153). Por
 * isso cada produto tem um nome distinto e crescente ("Produto 01".."Produto
 * 17"): com nomes repetidos o comparador (`aVal > bVal ? 1 : -1`, nunca 0)
 * desempata de forma não determinística — defeito conhecido da tela, não
 * desta task.
 *
 * Página de 15 itens, 17 produtos: duas páginas, a segunda com 2.
 */
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, username: "erick", role: "admin" } }),
}));

const PRODUTOS_ESTOQUE = Array.from({ length: 17 }, (_, i) => ({
  id: i + 1,
  nome: `Produto ${String(i + 1).padStart(2, "0")}`,
  codigo: `P${String(i + 1).padStart(2, "0")}`,
  unidade: "UN",
  preco: 100 + i,
  saldo: 10 + i,
  situacao: "A" as const,
}));

vi.mock("../context/EstoqueContext", () => ({
  useEstoque: () => ({
    produtos: PRODUTOS_ESTOQUE,
    carregando: false,
    atualizarProdutos: vi.fn(),
  }),
}));

vi.mock("recharts", () => {
  const semDesenho = () => null;
  return {
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
      <div>{children}</div>
    ),
    BarChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    LineChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    PieChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Bar: semDesenho,
    Line: semDesenho,
    Pie: semDesenho,
    Cell: semDesenho,
    XAxis: semDesenho,
    YAxis: semDesenho,
    Tooltip: semDesenho,
    CartesianGrid: semDesenho,
    Legend: semDesenho,
  };
});

/** As linhas de dado da tabela — o `<tbody>`, sem o cabeçalho. */
function linhasDaTabela(): HTMLElement[] {
  const corpo = document.querySelector("tbody");
  if (!corpo) throw new Error("tbody nao encontrado");
  return within(corpo as HTMLElement).queryAllByRole("row");
}

describe("paginacao em Estoque", () => {
  it("corta a tabela em 15 linhas por pagina", () => {
    render(<Estoque />);
    expect(linhasDaTabela()).toHaveLength(15);
  });

  it("a frase de contagem diz o intervalo e o total", () => {
    render(<Estoque />);
    expect(screen.getByText(/Mostrando/)).toHaveTextContent(
      "Mostrando 1 a 15 de 17 registros",
    );
  });

  it("Proximo leva a segunda pagina, que tem o resto", () => {
    render(<Estoque />);
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(linhasDaTabela()).toHaveLength(2);
    expect(screen.getByText(/Mostrando/)).toHaveTextContent(
      "Mostrando 16 a 17 de 17 registros",
    );
  });

  it("Anterior volta para a primeira", () => {
    render(<Estoque />);
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(linhasDaTabela()).toHaveLength(15);
    expect(screen.getByText(/Mostrando/)).toHaveTextContent(
      "Mostrando 1 a 15 de 17 registros",
    );
  });

  it("os extremos desabilitam", () => {
    render(<Estoque />);
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByRole("button", { name: "Próximo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
  });
});
