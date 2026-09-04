import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import Clientes from "./Clientes";

/**
 * Caracterização da PAGINAÇÃO COMO ELA VIVE em Clientes.
 *
 * Molde de `Produtos.paginacao.test.tsx` (Task 2). Diferença: Clientes NÃO
 * agrega — cada cliente do fixture vira uma linha da tabela (Produtos soma
 * `itens` por código; aqui não há nada parecido), então o fixture já é uma
 * lista de N clientes, com N = pageSize + 2.
 *
 * `clientesTabela` só mantém quem tem `numeroComprasPeriodo > 0`
 * (Clientes.tsx ~linha 258), então cada cliente do fixture precisa de pelo
 * menos uma nota cujo `cliente.cpf_cnpj` bata (depois de normalizado) com o
 * `cpf_cnpj` do cliente enriquecido — daí a nota 1-para-1 com o cliente.
 *
 * A ordenação padrão é por `ultimaCompra` decrescente (Clientes.tsx ~linha
 * 93). Por isso cada nota tem uma `data_emissao` distinta: com datas
 * repetidas o comparador (`aVal > bVal ? 1 : -1`, nunca 0) desempata de
 * forma não determinística — defeito conhecido da tela, não desta task.
 *
 * Página de 15 itens, 17 clientes: duas páginas, a segunda com 2.
 */
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, username: "erick", role: "admin" } }),
}));

const CLIENTES_ENRIQUECIDOS = Array.from({ length: 17 }, (_, i) => ({
  id: i + 1,
  nome: `Cliente ${String(i + 1).padStart(2, "0")}`,
  cpf_cnpj: `11.111.111/0001-${String(i + 1).padStart(2, "0")}`,
  email: `cliente${i + 1}@exemplo.com`,
  fone: `8199999${String(i + 1).padStart(4, "0")}`,
  totalComprado: 100 + i,
  numeroCompras: 1,
  ultimaCompra: new Date(`2026-01-${String(i + 1).padStart(2, "0")}`),
  status: "ativo" as const,
  ticketMedio: 100 + i,
}));

const NOTAS = Array.from({ length: 17 }, (_, i) => ({
  id: i + 1,
  numero: 1000 + i + 1,
  data_emissao: `2026-01-${String(i + 1).padStart(2, "0")}`,
  valor_nota: 100 + i,
  valor_produtos: 100 + i,
  cliente: {
    id: i + 1,
    nome: `Cliente ${String(i + 1).padStart(2, "0")}`,
    cpf_cnpj: `11.111.111/0001-${String(i + 1).padStart(2, "0")}`,
  },
  nome_vendedor: "Vendedor A",
  tipo: null,
  itens: [
    { codigo: "P1", descricao: "Item", quantidade: "1", valor_total: String(100 + i) },
  ],
  observacoes: null,
}));

vi.mock("../context/DataContext", () => ({
  useData: () => ({
    clientes: CLIENTES_ENRIQUECIDOS.map(({ id, nome, cpf_cnpj, email, fone }) => ({
      id,
      nome,
      cpf_cnpj,
      email,
      fone,
    })),
    clientesEnriquecidos: CLIENTES_ENRIQUECIDOS,
    notas: NOTAS,
    carregando: false,
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

/**
 * O preset de período em Clientes, depois da adoção do `periodoDoPreset`.
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

function campoData(rotulo: "Início" | "Fim"): HTMLInputElement {
  const campo = blocoDoFiltro(rotulo).querySelector("input");
  if (!campo) throw new Error(`campo "${rotulo}" nao existe`);
  return campo as HTMLInputElement;
}

function seletorDePreset(): HTMLSelectElement {
  const campo = blocoDoFiltro("Período").querySelector("select");
  if (!campo) throw new Error("seletor de preset nao existe");
  return campo as HTMLSelectElement;
}

function escolherPreset(valor: string): void {
  fireEvent.change(seletorDePreset(), { target: { value: valor } });
}

describe("preset de periodo em Clientes", () => {
  it("oferece as seis opcoes, na ordem da lista compartilhada", () => {
    render(<Clientes />);
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
    render(<Clientes />);
    escolherPreset("mesAtual");

    expect(campoData("Início")).toHaveValue("2026-03-01");
    expect(campoData("Fim")).toHaveValue("2026-03-31");
  });

  it("Ultimos 30 dias conta 30 dias para tras", () => {
    render(<Clientes />);
    escolherPreset("30dias");

    expect(campoData("Início")).toHaveValue("2026-02-13");
    expect(campoData("Fim")).toHaveValue("2026-03-15");
  });

  it("Ultimos 7 dias nao mudou — e o unico preset que sobreviveu igual", () => {
    render(<Clientes />);
    escolherPreset("7dias");

    expect(campoData("Início")).toHaveValue("2026-03-08");
    expect(campoData("Fim")).toHaveValue("2026-03-15");
  });

  it("Ano atual vai do 1 de janeiro ao 31 de dezembro", () => {
    // Antes terminava HOJE, porque o `switch` não sobrescrevia o `fim` que já
    // tinha sido inicializado com a data de hoje.
    render(<Clientes />);
    escolherPreset("anoAtual");

    expect(campoData("Início")).toHaveValue("2026-01-01");
    expect(campoData("Fim")).toHaveValue("2026-12-31");
  });

  it("Todos limpa as duas datas", () => {
    render(<Clientes />);
    escolherPreset("anoAtual");
    escolherPreset("todos");

    expect(campoData("Início")).toHaveValue("");
    expect(campoData("Fim")).toHaveValue("");
  });

  it("Personalizado nao mexe nas datas que ja estavam la", () => {
    render(<Clientes />);
    escolherPreset("anoAtual");
    escolherPreset("custom");

    expect(campoData("Início")).toHaveValue("2026-01-01");
    expect(campoData("Fim")).toHaveValue("2026-12-31");
  });
});
