import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
 * `codigo`, então uma nota com 17 itens de código distinto vira 17 linhas de
 * tabela. É por isso que o fixture é uma nota só.
 *
 * A ordenação padrão da tabela é por `quantidadeVendida` decrescente. O
 * comparador de `produtosTabela` (`aVal > bVal ? 1 : -1`) nunca devolve 0,
 * então com quantidades empatadas o resultado depende de como o V8 quebra o
 * empate — não é o comportamento da tela, é um acidente do motor JS. Por
 * isso cada item tem uma quantidade distinta (17 a 1, decrescente com o
 * código): a ordenação fica determinística e a página 1 sai exatamente
 * "Produto 01".."Produto 15", igual à intenção original do fixture.
 *
 * Página de 15 itens, 17 produtos: duas páginas, a segunda com 2.
 */
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, username: "erick", role: "admin" } }),
}));

const ITENS = Array.from({ length: 17 }, (_, i) => ({
  codigo: `P${String(i + 1).padStart(2, "0")}`,
  descricao: `Produto ${String(i + 1).padStart(2, "0")}`,
  quantidade: String(17 - i),
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

/**
 * O preset de período em Produtos, depois da adoção do `periodoDoPreset`.
 *
 * O relógio é fixado em 15/03/2026 porque as asserções falam de "mês atual" e
 * "ano atual": sem relógio fixo o teste passaria hoje e falharia em abril.
 * Só o `Date` é falso — os timers de verdade continuam rodando.
 */
const HOJE = new Date("2026-03-15T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(HOJE);
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * O bloco de um filtro, achado pelo TEXTO do rótulo.
 *
 * Não dá para usar `getByLabelText`: as cinco telas não têm um único
 * `htmlFor` — os `<label>` são irmãos do campo, não estão associados a ele.
 * É lacuna de acessibilidade real, registrada no documento de divergências,
 * e consertá-la é mudança de markup numa tela que segue em PENDENTES_FASE_3.
 * Este é o mesmo contorno que `ContasPagar.test.tsx:435` usa.
 */
function blocoDoFiltro(rotulo: string): HTMLElement {
  const etiqueta = screen.getByText(rotulo);
  if (!etiqueta.parentElement) throw new Error(`filtro "${rotulo}" sem bloco`);
  return etiqueta.parentElement;
}

function campoData(rotulo: "Data Início" | "Data Fim"): HTMLInputElement {
  const campo = blocoDoFiltro(rotulo).querySelector("input");
  if (!campo) throw new Error(`campo "${rotulo}" nao existe`);
  return campo as HTMLInputElement;
}

function seletorDePreset(): HTMLSelectElement {
  const campo = blocoDoFiltro("Período Rápido").querySelector("select");
  if (!campo) throw new Error("seletor de preset nao existe");
  return campo as HTMLSelectElement;
}

function escolherPreset(valor: string): void {
  fireEvent.change(seletorDePreset(), { target: { value: valor } });
}

describe("preset de periodo em Produtos", () => {
  it("oferece as seis opcoes, na ordem da lista compartilhada", () => {
    render(<Produtos />);
    expect(Array.from(seletorDePreset().options).map((o) => o.value)).toEqual([
      "todos",
      "7dias",
      "30dias",
      "mesAtual",
      "anoAtual",
      "custom",
    ]);
  });

  it("Mes atual vai do dia 1 ao ULTIMO dia do mes, e nao ate hoje", () => {
    // Este é o caso que muda. Antes, "Mês atual" era o RÓTULO da chave
    // `30dias`, e devolvia 01/03 a 15/03 — o mês até hoje. Agora a chave
    // `mesAtual` existe e devolve o mês do calendário inteiro.
    render(<Produtos />);
    escolherPreset("mesAtual");

    expect(campoData("Data Início")).toHaveValue("2026-03-01");
    expect(campoData("Data Fim")).toHaveValue("2026-03-31");
  });

  it("Ultimos 30 dias conta 30 dias para tras", () => {
    render(<Produtos />);
    escolherPreset("30dias");

    expect(campoData("Data Início")).toHaveValue("2026-02-13");
    expect(campoData("Data Fim")).toHaveValue("2026-03-15");
  });

  it("Ultimos 7 dias nao mudou — e o unico preset que sobreviveu igual", () => {
    render(<Produtos />);
    escolherPreset("7dias");

    expect(campoData("Data Início")).toHaveValue("2026-03-08");
    expect(campoData("Data Fim")).toHaveValue("2026-03-15");
  });

  it("Ano atual vai do 1 de janeiro ao 31 de dezembro", () => {
    // Antes terminava HOJE, porque o `switch` não sobrescrevia o `fim` que já
    // tinha sido inicializado com a data de hoje.
    render(<Produtos />);
    escolherPreset("anoAtual");

    expect(campoData("Data Início")).toHaveValue("2026-01-01");
    expect(campoData("Data Fim")).toHaveValue("2026-12-31");
  });

  it("Todos limpa as duas datas", () => {
    render(<Produtos />);
    escolherPreset("anoAtual");
    escolherPreset("todos");

    expect(campoData("Data Início")).toHaveValue("");
    expect(campoData("Data Fim")).toHaveValue("");
  });

  it("Personalizado nao mexe nas datas que ja estavam la", () => {
    render(<Produtos />);
    escolherPreset("anoAtual");
    escolherPreset("custom");

    expect(campoData("Data Início")).toHaveValue("2026-01-01");
    expect(campoData("Data Fim")).toHaveValue("2026-12-31");
  });
});
