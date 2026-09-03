import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Servicos from "./Servicos";

/**
 * Caracterização da PAGINAÇÃO COMO ELA VIVE em Serviços.
 *
 * Molde de `Produtos.paginacao.test.tsx` (Task 2). Diferença: Serviços NÃO
 * agrega — cada serviço do fixture vira uma linha da tabela —, então o
 * fixture já é uma lista de N serviços, com N = pageSize + 2.
 *
 * A ordenação padrão é por `data_emissao` decrescente (Servicos.tsx ~linha
 * 76). Por isso cada serviço tem uma `data_emissao` distinta: com datas
 * repetidas o comparador (`aVal > bVal ? 1 : -1`, nunca 0) desempata de
 * forma não determinística — defeito conhecido da tela, não desta task.
 *
 * Página de 15 itens, 17 serviços: duas páginas, a segunda com 2.
 */
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, username: "erick", role: "admin" } }),
}));

const SERVICOS_ENRIQUECIDOS = Array.from({ length: 17 }, (_, i) => ({
  id: i + 1,
  numero_nfse: String(1000 + i + 1),
  data_emissao: `2026-01-${String(i + 1).padStart(2, "0")}`,
  valor_servico: 100 + i,
  razao_social_tomador: `Cliente ${String(i + 1).padStart(2, "0")}`,
  cpf_cnpj_tomador: `11.111.111/0001-${String(i + 1).padStart(2, "0")}`,
  cidade_tomador: "Recife",
  uf_tomador: "PE",
  discriminacao_servico: `Servico ${String(i + 1).padStart(2, "0")}`,
  valor_servico_numero: 100 + i,
  mes: "janeiro",
  ano: 2026,
}));

vi.mock("../context/ServicosContext", () => ({
  useServicos: () => ({
    servicos: SERVICOS_ENRIQUECIDOS,
    servicosEnriquecidos: SERVICOS_ENRIQUECIDOS,
    carregando: false,
    erro: null,
    atualizarServicos: vi.fn(),
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

describe("paginacao em Servicos", () => {
  it("corta a tabela em 15 linhas por pagina", () => {
    render(<Servicos />);
    expect(linhasDaTabela()).toHaveLength(15);
  });

  it("a frase de contagem diz o intervalo e o total", () => {
    render(<Servicos />);
    expect(screen.getByText(/Mostrando/)).toHaveTextContent(
      "Mostrando 1 a 15 de 17 registros",
    );
  });

  it("Proximo leva a segunda pagina, que tem o resto", () => {
    render(<Servicos />);
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(linhasDaTabela()).toHaveLength(2);
    expect(screen.getByText(/Mostrando/)).toHaveTextContent(
      "Mostrando 16 a 17 de 17 registros",
    );
  });

  it("Anterior volta para a primeira", () => {
    render(<Servicos />);
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(linhasDaTabela()).toHaveLength(15);
    expect(screen.getByText(/Mostrando/)).toHaveTextContent(
      "Mostrando 1 a 15 de 17 registros",
    );
  });

  it("os extremos desabilitam", () => {
    render(<Servicos />);
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
  });

  it("com filtro que nao casa nada, a tabela diz que esta vazia", () => {
    render(<Servicos />);

    fireEvent.change(screen.getByPlaceholderText("Pesquisar..."), {
      target: { value: "zzzzz-nao-existe" },
    });

    expect(linhasDaTabela()).toHaveLength(1);
    expect(screen.getByText("Nenhum resultado encontrado.")).toBeInTheDocument();
  });
});
