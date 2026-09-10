import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Produtos from "./Produtos";

/**
 * Caracterização dos quatro KPIs de Produtos e dos dois gráficos.
 *
 * Os KPIs saem de `calcularKpis` (`produtos/produtos.ts`) e são desenhados por
 * `produtos/KpisDeProdutos.tsx`; a evolução e o ranking saem de
 * `evolucaoDoResumo` e `rankingPorValor` (mesmo arquivo) e chegam a
 * `produtos/GraficosDeProdutos.tsx`. A citação anterior era a
 * `Produtos.tsx:551-625` da tela pré-decomposição — hoje o arquivo tem 247
 * linhas e nada disso mora mais lá.
 *
 * Os gráficos entraram na Task 3 de 2026-09-10: eram o maior buraco da rede
 * junto do recorte — plantar `dadosEvolucao → []` deixava os 45 testes verdes.
 *
 * Os mocks de `useAuth` e `recharts` vêm de `Produtos.multiselect.test.tsx` —
 * molde que já monta a tela com sucesso. O mock de dados é o da fonte NOVA:
 * a tela deixou de ler o `DataContext` (item 9.4) e passou a receber o
 * resumo já agregado pelo Postgres via `useComercial` — o falso mora em
 * `comercial/hooksFalsos` (ver o docblock de lá para o porquê de mocar o
 * hook, e não a rede). Este arquivo nasceu contra a fonte antiga; a Task 1
 * de 2026-09-10 trocou só a falsificação, sem mexer no fixture nem nas
 * asserções.
 *
 * As duas notas abaixo têm itens de códigos diferentes (P1 e P2), com
 * quantidade e valor escolhidos para que os quatro números saiam distintos
 * entre si:
 *   - quantidade total vendida: 3 + 5 = 8
 *   - faturamento total: 300 + 1000 = R$ 1.300,00
 *   - ticket médio: 1300 / 8 = R$ 162,50
 *   - produto mais vendido: P2 "Tubo descartável" (5 > 3), Qtd: 5
 * Nenhum dos quatro coincide com outro — uma troca entre eles (por exemplo,
 * faturamento e ticket médio) faria pelo menos um teste falhar.
 */
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, username: "erick", role: "admin" } }),
}));

const { NOTAS } = vi.hoisted(() => ({
  NOTAS: [
    {
      id: 1,
      data_emissao: "2026-01-10",
      valor_nota: 300,
      cliente: { nome: "Alfa Mineração", cpf_cnpj: "11.222.333/0001-44" },
      nome_vendedor: "Vendedor A",
      itens: [
        {
          codigo: "P1",
          descricao: "Bafômetro Phoebus",
          quantidade: "3",
          valor_total: "300",
        },
      ],
    },
    {
      id: 2,
      data_emissao: "2026-02-10",
      valor_nota: 1000,
      cliente: { nome: "Beta Logística", cpf_cnpj: "55.666.777/0001-88" },
      nome_vendedor: "Vendedor B",
      itens: [
        {
          codigo: "P2",
          descricao: "Tubo descartável",
          quantidade: "5",
          valor_total: "1000",
        },
      ],
    },
  ],
}));

// A tela deixou de ler o `DataContext` (item 9.4): a agregação vem somada do
// banco. O falso mora em `comercial/hooksFalsos`, e para esta tela o que
// importa é o `por_produto` — é ele que virou a tabela.
vi.mock("./comercial/useComercial", async (original) => {
  const real = await original<typeof import("./comercial/useComercial")>();
  const { criarHooksFalsos, resumoDeProdutos } = await import("./comercial/hooksFalsos");
  return { ...real, ...criarHooksFalsos(NOTAS, resumoDeProdutos) };
});

/**
 * Dublê do recharts.
 *
 * Em jsdom o `ResponsiveContainer` mede 0x0 e o recharts de verdade não
 * desenha nada — os gráficos de Produtos ficariam invisíveis ao teste sem
 * quebrar (recharts engole a falta de tamanho em silêncio). Por isso o dublê
 * dos dois gráficos desta tela ESCREVE a série que recebeu num atributo: sem
 * isso não há como afirmar o que chegou até eles, e a revisão da Task 2
 * mostrou o preço disso — trocar a evolução da tela por `[]` deixava os 45
 * testes verdes. As peças de dentro (eixos, barras, linha) continuam mudas,
 * porque o que se prova aqui é o dado, não o desenho.
 */
vi.mock("recharts", () => {
  const semDesenho = () => null;
  const comSerie =
    (id: string) =>
    ({ data, children }: { data?: unknown[]; children?: React.ReactNode }) => (
      <div data-testid={id} data-serie={JSON.stringify(data ?? [])}>
        {children}
      </div>
    );
  return {
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
      <div>{children}</div>
    ),
    BarChart: comSerie("grafico-ranking"),
    LineChart: comSerie("grafico-evolucao"),
    PieChart: ({ children }: { children?: React.ReactNode }) => (
      <div>{children}</div>
    ),
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
 * A série que chegou a um dos dois gráficos, lida do dublê do recharts.
 *
 * Ler o atributo (e não uma exportação da tela) é o que mantém o teste sobre a
 * tela renderizada: o caminho percorrido é o mesmo da pessoa que abre a página
 * — resumo do servidor, conta pura, componente de gráfico.
 */
function serieDoGrafico(id: string): Record<string, unknown>[] {
  return JSON.parse(screen.getByTestId(id).dataset.serie ?? "[]");
}

describe("gráficos de Produtos", () => {
  it("a evolução recebe um ponto por mês, com a quantidade de itens do mês", () => {
    render(<Produtos />);

    // Janeiro tem as 3 unidades da nota 1 e fevereiro as 5 da nota 2 — os
    // mesmos números do KPI de quantidade, separados por mês.
    const serie = serieDoGrafico("grafico-evolucao");
    expect(serie.map((ponto) => ponto.total)).toEqual([3, 5]);
    expect(String(serie[0].mes)).toMatch(/jan/i);
    expect(String(serie[1].mes)).toMatch(/fev/i);
  });

  it("o ranking recebe os produtos do maior valor para o menor", () => {
    render(<Produtos />);

    // O card se chama "Top 10 Produtos (Valor)": a primeira barra tem de ser a
    // de quem mais faturou. Com o `sort` invertido, seria o item mais barato
    // com o título intacto.
    expect(serieDoGrafico("grafico-ranking")).toEqual([
      { produto: "Tubo descartável", valor: 1000 },
      { produto: "Bafômetro Phoebus", valor: 300 },
    ]);
  });
});

describe("KPIs de Produtos", () => {
  it("quantidade total vendida soma as quantidades dos itens", () => {
    render(<Produtos />);

    expect(screen.getByText("Quantidade Total Vendida")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("faturamento total soma o valor dos itens", () => {
    render(<Produtos />);

    expect(screen.getByText("Faturamento Total")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.300,00")).toBeInTheDocument();
  });

  it("ticket médio por produto divide faturamento pela quantidade", () => {
    render(<Produtos />);

    expect(screen.getByText("Ticket Médio por Produto")).toBeInTheDocument();
    expect(screen.getByText("R$ 162,50")).toBeInTheDocument();
  });

  it("produto mais vendido é o de maior quantidade, com a quantidade dele", () => {
    render(<Produtos />);

    // A tabela também lista "Tubo descartável" (é um dos dois produtos), por
    // isso a busca usa o `title` do card do KPI — só ele carrega o atributo
    // — em vez de `getByText`, que acharia as duas ocorrências.
    expect(screen.getByText("Produto Mais Vendido")).toBeInTheDocument();
    expect(screen.getByTitle("Tubo descartável")).toBeInTheDocument();
    expect(screen.getByText("Qtd: 5")).toBeInTheDocument();
  });
});
