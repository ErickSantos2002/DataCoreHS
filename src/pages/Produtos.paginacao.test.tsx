import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Produtos from "./Produtos";

/**
 * Caracterização da PAGINAÇÃO COMO ELA VIVE em Produtos.
 *
 * Não é a tela, e não é o MultiSelect (esse tem arquivo próprio ao lado):
 * é o rodapé. O que se fixa aqui é o contrato que a adoção do `Pagination`
 * do design system tem de preservar — quantas linhas cabem numa página, o
 * que a frase de contagem diz, e o que os botões fazem nos extremos.
 *
 * Produtos AGREGA: `produtosAgregados` soma os `itens` das notas por
 * `codigo`, então uma nota com 12 itens de código distinto vira 12 linhas de
 * tabela. É por isso que o fixture é uma nota só.
 *
 * A ordenação padrão da tabela é por `quantidadeVendida` decrescente. O
 * comparador de `produtosTabela` (`aVal > bVal ? 1 : -1`) nunca devolve 0,
 * então com quantidades empatadas o resultado depende de como o V8 quebra o
 * empate — não é o comportamento da tela, é um acidente do motor JS. Por
 * isso cada item tem uma quantidade distinta (12 a 1, decrescente com o
 * código): a ordenação fica determinística e a página 1 sai exatamente
 * "Produto 01".."Produto 10", igual à intenção original do fixture.
 *
 * Página de 10 itens, 12 produtos: duas páginas, a segunda com 2.
 */
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, username: "erick", role: "admin" } }),
}));

const ITENS = Array.from({ length: 12 }, (_, i) => ({
  codigo: `P${String(i + 1).padStart(2, "0")}`,
  descricao: `Produto ${String(i + 1).padStart(2, "0")}`,
  quantidade: String(12 - i),
  valor_total: "100",
}));

const NOTAS = [
  {
    id: 1,
    data_emissao: "2026-01-10",
    valor_nota: 1200,
    cliente: { nome: "Alfa Mineração", cpf_cnpj: "11.222.333/0001-44" },
    nome_vendedor: "Vendedor A",
    itens: ITENS,
  },
];

vi.mock("../context/DataContext", () => ({
  useData: () => ({ notas: NOTAS, carregando: false }),
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

/** O `<tbody>` da tabela, escopado — o card "Produto Mais Vendido" também
 * mostra o nome do produto, então uma busca sem escopo por "Produto 01"
 * acha os dois e `getByText` reclama de elemento duplicado. */
function corpoDaTabela(): HTMLElement {
  const corpo = document.querySelector("tbody");
  if (!corpo) throw new Error("tbody nao encontrado");
  return corpo as HTMLElement;
}

/** As linhas de dado da tabela — o `<tbody>`, sem o cabeçalho. */
function linhasDaTabela(): HTMLElement[] {
  return within(corpoDaTabela()).queryAllByRole("row");
}

describe("paginacao em Produtos", () => {
  it("corta a tabela em 10 linhas por pagina", () => {
    render(<Produtos />);

    expect(linhasDaTabela()).toHaveLength(10);
    expect(within(corpoDaTabela()).getByText("Produto 01")).toBeInTheDocument();
    expect(within(corpoDaTabela()).queryByText("Produto 11")).not.toBeInTheDocument();
  });

  it("a frase de contagem diz o intervalo e o total", () => {
    render(<Produtos />);

    expect(screen.getByText(/Mostrando/)).toHaveTextContent(
      "Mostrando 1 a 10 de 12 produtos",
    );
  });

  it("Proximo leva a segunda pagina, que tem o resto", () => {
    render(<Produtos />);

    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));

    expect(linhasDaTabela()).toHaveLength(2);
    expect(within(corpoDaTabela()).getByText("Produto 11")).toBeInTheDocument();
    expect(within(corpoDaTabela()).queryByText("Produto 01")).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando/)).toHaveTextContent(
      "Mostrando 11 a 12 de 12 produtos",
    );
  });

  it("Anterior volta para a primeira", () => {
    render(<Produtos />);

    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));

    expect(within(corpoDaTabela()).getByText("Produto 01")).toBeInTheDocument();
    expect(screen.getByText(/Mostrando/)).toHaveTextContent(
      "Mostrando 1 a 10 de 12 produtos",
    );
  });

  it("os extremos desabilitam", () => {
    render(<Produtos />);

    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));

    expect(screen.getByRole("button", { name: "Próximo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
  });
});
