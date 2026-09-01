import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import GerenciamentoFinanceiro from "./GerenciamentoFinanceiro";

/**
 * Teste de caracterização da tela de Gerenciamento Financeiro.
 *
 * Fixa o comportamento que existia ANTES da migração para o design system.
 * É a primeira tela da Fase 3 com **abas**, e o que ela faz de próprio —
 * agregar vendas e serviços por ano e mês, contar transação, calcular
 * variação ano contra ano e montar o balancete a partir do prefixo da
 * categoria da conta a pagar — não está escrito em nenhum outro lugar.
 *
 * Tudo é observado pela tela renderizada. As duas abas que são componente à
 * parte (`CentroCustoTab` e `MetaTab`) têm teste próprio e aqui entram como
 * dublê que **escreve as props recebidas na tela**: o que se afirma não é o
 * dublê, é a conta que a página fez para preencher a prop — em especial o
 * faturamento do ano anterior, que nasce aqui e é consumido lá.
 */

const estadoVendas = vi.hoisted(() => ({
  notas: [] as Record<string, unknown>[],
  carregando: false,
  erro: null as string | null,
}));
vi.mock("../context/VendasContext", () => ({
  useVendas: () => estadoVendas,
}));

const estadoServicos = vi.hoisted(() => ({
  servicosEnriquecidos: [] as Record<string, unknown>[],
  carregando: false,
  erro: null as string | null,
}));
vi.mock("../context/ServicosContext", () => ({
  useServicos: () => estadoServicos,
}));

const estadoPagar = vi.hoisted(() => ({
  contas: [] as Record<string, unknown>[],
  carregando: false,
  erro: null as string | null,
}));
vi.mock("../context/ContasPagarContext", () => ({
  useContasPagar: () => estadoPagar,
}));

// A tela chama `useContasReceber()` e descarta o retorno — o provider existe
// só para a busca acontecer. Sem o dublê o hook estoura por falta de provider.
const estadoReceber = vi.hoisted(() => ({
  contas: [] as Record<string, unknown>[],
  carregando: false,
  erro: null as string | null,
}));
vi.mock("../context/ContasReceberContext", () => ({
  useContasReceber: () => estadoReceber,
}));

vi.mock("./financeiro/AbaCentroCusto", () => ({
  default: ({
    anoCentro,
    setAnoCentro,
  }: {
    anoCentro: number;
    setAnoCentro: (a: number) => void;
  }) => (
    <div>
      <p>centro de custo · ano {anoCentro}</p>
      <button type="button" onClick={() => setAnoCentro(2023)}>
        trocar ano do centro
      </button>
    </div>
  ),
}));

vi.mock("./financeiro/AbaComissao", () => ({
  default: () => <p>calculadora de comissão</p>,
}));

vi.mock("./financeiro/AbaMeta", () => ({
  default: ({
    faturamentoAnoAnterior,
    anoAnterior,
  }: {
    faturamentoAnoAnterior?: number;
    anoAnterior?: number;
  }) => (
    <p>
      meta · ano {String(anoAnterior)} · faturamento{" "}
      {String(faturamentoAnoAnterior)}
    </p>
  ),
}));

/**
 * Dublê do recharts.
 *
 * Em jsdom o `ResponsiveContainer` mede 0x0 e o recharts de verdade não
 * desenha nada — não dá para ler o que o gráfico recebeu. O dublê troca cada
 * gráfico por uma lista com um item por ponto, escrito como `chave=valor` na
 * ordem em que a tela montou o objeto. Assim o teste fixa o que interessa
 * (o que agrupa, o que acumula, quais séries entram) sem depender de pixel.
 * Mesmo idioma de `ContasReceber.test.tsx`.
 */
type DadoGrafico = Record<string, unknown>;
type PropsGrafico = {
  data?: DadoGrafico[];
  dataKey?: string | number;
  children?: ReactNode;
};
vi.mock("recharts", () => {
  const semDesenho = () => null;
  const Lista = ({ data = [] }: PropsGrafico) => (
    <ul>
      {data.map((dado, i) => (
        <li key={i}>
          {Object.entries(dado)
            .map(([chave, valor]) => `${chave}=${String(valor)}`)
            .join(" ")}
        </li>
      ))}
    </ul>
  );
  const Grafico = ({ data, children }: PropsGrafico) => (
    <div>
      <Lista data={data} />
      {children}
    </div>
  );
  return {
    ResponsiveContainer: ({ children }: PropsGrafico) => <div>{children}</div>,
    BarChart: Grafico,
    LineChart: Grafico,
    // Os quatro gráficos de variação recebem o MESMO array e se distinguem
    // só pelo `dataKey`. Sem anunciá-lo aqui não daria para provar que cada
    // cartão plota o par de anos que o título dele promete.
    Bar: ({ dataKey, children }: PropsGrafico) => (
      <div>
        <span>série {String(dataKey)}</span>
        {children}
      </div>
    ),
    Line: ({ dataKey }: PropsGrafico) => <span>série {String(dataKey)}</span>,
    XAxis: semDesenho,
    YAxis: semDesenho,
    CartesianGrid: semDesenho,
    Tooltip: semDesenho,
    Legend: semDesenho,
    ReferenceLine: semDesenho,
    Cell: semDesenho,
  };
});

/** Texto com o espaço duro do `Intl` normalizado para espaço comum. */
function texto(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** O cartão de um título — o bloco que contém o gráfico ou a tabela dele. */
function cartao(titulo: string | RegExp): HTMLElement {
  return screen.getByText(titulo).parentElement as HTMLElement;
}

/** Os pontos de um gráfico, um por item da lista do dublê. */
function pontos(titulo: string | RegExp): string[] {
  return within(cartao(titulo))
    .getAllByRole("listitem")
    .map((li) => texto(li));
}

/** As células de uma linha de tabela achada pelo rótulo da primeira coluna. */
function linha(titulo: string | RegExp, rotulo: string): string[] {
  const linhas = within(cartao(titulo)).getAllByRole("row");
  const achada = linhas.find((l) => texto(l.firstElementChild) === rotulo);
  if (!achada) throw new Error(`linha "${rotulo}" não encontrada`);
  return within(achada)
    .getAllByRole("cell")
    .map((c) => texto(c));
}

/** A última célula de uma linha — a coluna de total do ano. */
function total(celulas: string[]): string {
  return celulas[celulas.length - 1];
}

/**
 * O cartão de KPI de um ano.
 *
 * O número do ano aparece em três lugares (o botão que liga o ano, o cartão e
 * o cabeçalho da tabela); o cartão é o único cujo bloco fala em transações.
 */
function kpi(ano: number): string {
  const cartao = screen
    .getAllByText(String(ano))
    .map((el) => el.parentElement)
    .find((pai) => (pai?.textContent ?? "").includes("transações"));
  if (!cartao) throw new Error(`cartão do ano ${ano} não encontrado`);
  return texto(cartao);
}

/**
 * Um KPI do topo do Balancete.
 *
 * "Saldo do Período" é rótulo do KPI e também da última linha da tabela; o
 * escopo do cartão do seletor de ano separa os dois sem depender de tag.
 */
function kpiBalancete(rotulo: string): string {
  const cartaoAno = screen.getByText("Ano:").parentElement as HTMLElement;
  return texto(within(cartaoAno).getByText(rotulo).parentElement);
}

/**
 * Um controle clicável pelo nome, seja ele `button` ou `tab`.
 *
 * O seletor é tolerante de propósito: a migração troca os botões de aba
 * feitos à mão pelo primitivo `Tabs`, que renderiza `role="tab"`. O que o
 * teste afirma é que existe um controle com aquele nome e que clicá-lo troca
 * o conteúdo — não com que papel ARIA ele nasceu.
 */
function controle(nome: string | RegExp): HTMLElement {
  const botoes = screen.queryAllByRole("button", { name: nome });
  if (botoes.length > 0) return botoes[0];
  return screen.getByRole("tab", { name: nome });
}

function abrirAba(nome: string) {
  fireEvent.click(controle(nome));
}

/**
 * Base fechada, com número redondo, usada na maior parte do arquivo.
 *
 * Vendas: jan/25 150.000 (duas notas) · fev/25 200.000 · jan/26 300.000, mais
 * uma nota de 2021 que está FORA da janela de anos da tela.
 * Serviços: jan/25 50.000 · mar/26 20.000.
 *
 * → 2025 combinado 400.000 em 4 transações · 2026 combinado 320.000 em 2.
 */
function baseFechada() {
  estadoVendas.notas = [
    { id: 1, data_emissao: "2025-01-15", valor_nota: 100_000 },
    { id: 2, data_emissao: "2025-01-20", valor_nota: 50_000 },
    { id: 3, data_emissao: "2025-02-10", valor_nota: 200_000 },
    { id: 4, data_emissao: "2026-01-10", valor_nota: 300_000 },
    { id: 5, data_emissao: "2021-01-10", valor_nota: 999_999 },
  ];
  estadoServicos.servicosEnriquecidos = [
    {
      id: 1,
      ano: 2025,
      data_emissao: "2025-01-05",
      valor_servico_numero: 50_000,
    },
    {
      id: 2,
      ano: 2026,
      data_emissao: "2026-03-01",
      valor_servico_numero: 20_000,
    },
  ];
}

/** Contas a pagar de 2026 usadas no balancete. */
function contasDoBalancete() {
  estadoPagar.contas = [
    {
      id: 1,
      data_emissao: "2026-01-05",
      categoria: "1 - CUSTOS E DESPESAS FIXAS - EQUIPE",
      valor: "1.000,00",
    },
    {
      id: 2,
      data_emissao: "2026-01-20",
      categoria: "10 - OUTROS CUSTOS",
      valor: "2.000,00",
    },
    { id: 3, data_emissao: "2026-02-01", categoria: null, valor: "500,00" },
    {
      id: 4,
      data_emissao: "2025-01-01",
      categoria: "1 - CUSTOS E DESPESAS FIXAS - EQUIPE",
      valor: "9.999,00",
    },
    { id: 5, data_emissao: "", categoria: "1 - EQUIPE", valor: "77,00" },
    // Março fecha empatado com a entrada de serviço do mês: 20.000 de cada
    // lado. É o que dá o mês de saldo exatamente zero. E o prefixo "2" é o
    // que separa ordenação numérica de ordenação alfabética: como texto,
    // "10" viria antes de "2".
    {
      id: 6,
      data_emissao: "2026-03-15",
      categoria: "2 - CUSTOS E DESPESAS FIXAS - SEDE",
      valor: "20.000,00",
    },
  ];
}

beforeEach(() => {
  // A tela lê `new Date().getFullYear()` para decidir qual é o ano anterior.
  // Sem relógio fixo, o teste do faturamento do ano passado passaria a
  // depender do dia em que roda.
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-01T12:00:00"));
  estadoVendas.notas = [];
  estadoVendas.carregando = false;
  estadoServicos.servicosEnriquecidos = [];
  estadoServicos.carregando = false;
  estadoPagar.contas = [];
  estadoPagar.carregando = false;
  estadoVendas.erro = null;
  estadoServicos.erro = null;
  estadoPagar.erro = null;
  estadoReceber.erro = null;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Financeiro — carregando", () => {
  it.each([
    ["vendas", () => (estadoVendas.carregando = true)],
    ["serviços", () => (estadoServicos.carregando = true)],
    ["contas a pagar", () => (estadoPagar.carregando = true)],
  ])("espera enquanto %s ainda está carregando", (_nome, ligar) => {
    ligar();
    render(<GerenciamentoFinanceiro />);

    expect(
      screen.getByText(/Carregando dados financeiros/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Balancete")).not.toBeInTheDocument();
  });
});

describe("Financeiro — falha de carga", () => {
  it("avisa qual busca falhou, em vez de abrir zerada em silêncio", () => {
    // Sem o aviso, a API caída dá uma tela igualzinha à de um mês sem
    // faturamento: cinco anos com "Sem dados" e nenhuma pista de que o
    // número não existe porque a rede caiu.
    baseFechada();
    estadoVendas.erro = "Não foi possível carregar as notas de venda.";
    render(<GerenciamentoFinanceiro />);

    expect(
      screen.getByText("Não foi possível carregar as notas de venda."),
    ).toBeInTheDocument();
  });

  it("lista as quatro quando tudo cai de uma vez", () => {
    estadoVendas.erro = "Não foi possível carregar as notas de venda.";
    estadoServicos.erro = "Não foi possível carregar as notas de serviço.";
    estadoPagar.erro = "Não foi possível carregar as contas a pagar.";
    estadoReceber.erro = "Não foi possível carregar as contas a receber.";
    render(<GerenciamentoFinanceiro />);

    for (const frase of [
      "Não foi possível carregar as notas de venda.",
      "Não foi possível carregar as notas de serviço.",
      "Não foi possível carregar as contas a pagar.",
      "Não foi possível carregar as contas a receber.",
    ]) {
      expect(screen.getByText(frase)).toBeInTheDocument();
    }
  });

  it("o aviso acompanha a pessoa para qualquer aba", () => {
    // O dado que faltou alimenta mais de uma aba; o aviso preso à Visão Geral
    // sumiria justamente para quem foi olhar o Balancete.
    baseFechada();
    estadoPagar.erro = "Não foi possível carregar as contas a pagar.";
    render(<GerenciamentoFinanceiro />);

    abrirAba("Balancete");

    expect(
      screen.getByText("Não foi possível carregar as contas a pagar."),
    ).toBeInTheDocument();
  });

  it("sem falha nenhuma, nenhum aviso", () => {
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    expect(
      screen.queryByText(/Não foi possível carregar/),
    ).not.toBeInTheDocument();
  });
});

describe("Financeiro — as quatro abas", () => {
  it("abre na Visão Geral", () => {
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    expect(screen.getByText("Comparativo Mensal")).toBeInTheDocument();
    expect(screen.queryByText(/^Balancete —/)).not.toBeInTheDocument();
  });

  it("cada aba mostra o seu conteúdo e esconde o das outras", () => {
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    abrirAba("Balancete");
    expect(screen.getByText("Balancete — 2026")).toBeInTheDocument();
    expect(screen.queryByText("Comparativo Mensal")).not.toBeInTheDocument();

    abrirAba("Centro de Custo");
    expect(screen.getByText(/centro de custo/)).toBeInTheDocument();
    expect(screen.queryByText("Balancete — 2026")).not.toBeInTheDocument();

    abrirAba("Meta");
    expect(screen.getByText(/^meta ·/)).toBeInTheDocument();
    expect(screen.queryByText(/centro de custo/)).not.toBeInTheDocument();

    abrirAba("Calculadora de Comissão");
    expect(screen.getByText(/calculadora de comissão/)).toBeInTheDocument();
    expect(screen.queryByText(/^meta ·/)).not.toBeInTheDocument();

    abrirAba("Visão Geral");
    expect(screen.getByText("Comparativo Mensal")).toBeInTheDocument();
  });

  it("o ano do Centro de Custo é da página e sobrevive à troca de aba", () => {
    // O estado mora aqui de propósito: sair para o Balancete e voltar não
    // pode devolver a aba de custo ao ano padrão.
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    abrirAba("Centro de Custo");
    expect(screen.getByText("centro de custo · ano 2025")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "trocar ano do centro" }),
    );
    expect(screen.getByText("centro de custo · ano 2023")).toBeInTheDocument();

    abrirAba("Balancete");
    abrirAba("Centro de Custo");

    expect(screen.getByText("centro de custo · ano 2023")).toBeInTheDocument();
  });
});

describe("Financeiro — KPIs por ano", () => {
  it("soma vendas e serviços do ano e conta as transações", () => {
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    // 2025: 350.000 de venda + 50.000 de serviço, em 3 notas + 1 serviço.
    expect(kpi(2025)).toContain("R$ 400.000,00");
    expect(kpi(2025)).toContain("4 transações");
  });

  it("ano fora da janela da tela não entra em ano nenhum", () => {
    // A nota de 2021 existe na base e não pode vazar para 2022.
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    expect(kpi(2022)).toContain("Sem dados");
    expect(kpi(2022)).toContain("0 transações");
  });

  it("ano sem faturamento diz que não tem dado em vez de mostrar zero", () => {
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    expect(kpi(2023)).toContain("Sem dados");
  });

  it("o crescimento compara com o ano anterior da própria lista", () => {
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    // 320.000 contra 400.000 = −20%.
    expect(kpi(2026)).toContain("-20.0% vs 2025");
  });

  it("sem ano anterior com faturamento, o crescimento não é exibido", () => {
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    expect(kpi(2025)).not.toContain("vs 2024");
  });

  it("o filtro de tipo muda total e contagem", () => {
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    fireEvent.click(controle("Vendas"));
    expect(kpi(2025)).toContain("R$ 350.000,00");
    expect(kpi(2025)).toContain("3 transações");

    fireEvent.click(controle("Serviços"));
    expect(kpi(2025)).toContain("R$ 50.000,00");
    expect(kpi(2025)).toContain("1 transações");

    fireEvent.click(controle("Combinado"));
    expect(kpi(2025)).toContain("R$ 400.000,00");
  });
});

describe("Financeiro — anos ativos e os gráficos", () => {
  it("o comparativo mensal traz só os anos ligados", () => {
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    // Todos os cinco anos ligados por padrão.
    // O ano é chave numérica e por isso o `Object.entries` o traz antes do
    // `mes`, que é chave de texto — é a ordem que o dublê imprime.
    expect(pontos("Comparativo Mensal")[0]).toBe(
      "2022=0 2023=0 2024=0 2025=200000 2026=300000 mes=Jan",
    );

    fireEvent.click(screen.getByRole("button", { name: "2022" }));

    expect(pontos("Comparativo Mensal")[0]).toBe(
      "2023=0 2024=0 2025=200000 2026=300000 mes=Jan",
    );
  });

  it("não deixa desligar o último ano ligado", () => {
    // Sem o guarda a tela fica com gráfico vazio e sem como voltar.
    baseFechada();
    render(<GerenciamentoFinanceiro />);
    for (const ano of ["2022", "2023", "2024", "2025"]) {
      fireEvent.click(screen.getByRole("button", { name: ano }));
    }
    expect(pontos("Comparativo Mensal")[0]).toBe("2026=300000 mes=Jan");

    fireEvent.click(screen.getByRole("button", { name: "2026" }));

    expect(pontos("Comparativo Mensal")[0]).toBe("2026=300000 mes=Jan");
  });

  it("clicar de novo num ano desligado o traz de volta", () => {
    baseFechada();
    render(<GerenciamentoFinanceiro />);
    fireEvent.click(screen.getByRole("button", { name: "2022" }));

    fireEvent.click(screen.getByRole("button", { name: "2022" }));

    expect(pontos("Comparativo Mensal")[0]).toContain("2022=0");
  });

  it("o acumulado do ano soma mês a mês, sem zerar em fevereiro", () => {
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    const ytd = pontos("Acumulado no Ano (YTD)");
    expect(ytd[0]).toContain("2025=200000");
    // Jan 200.000 + Fev 200.000 = 400.000, e o valor se mantém até dezembro.
    expect(ytd[1]).toContain("2025=400000");
    expect(ytd[11]).toContain("2025=400000");
  });

  it("cada cartão de variação plota o par de anos que o título promete", () => {
    // Os quatro cartões recebem o mesmo array; o que os separa é a série.
    // Trocar um par aqui mostraria o crescimento errado com o título certo.
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    expect(texto(cartao("2023 vs 2022"))).toContain("série var20232022");
    expect(texto(cartao("2026 vs 2025"))).toContain("série var20262025");
  });

  it("a variação mensal é nula quando o ano base não teve faturamento", () => {
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    const variacao = pontos("2026 vs 2025");
    // Jan: 200.000 → 300.000 = +50%. Fev: 200.000 → 0 = −100%.
    expect(variacao[0]).toContain("var20262025=50");
    expect(variacao[1]).toContain("var20262025=-100");
    // Mar: base zerada — dividir por zero seria Infinity, então é nulo.
    expect(variacao[2]).toContain("var20262025=null");
  });
});

describe("Financeiro — tabela mensal comparativa", () => {
  it("cada mês traz os cinco anos e as quatro variações", () => {
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    expect(linha("Tabela Mensal Comparativa", "Jan")).toEqual([
      "Jan",
      "—",
      "—",
      "—",
      "R$ 200.000,00",
      "R$ 300.000,00",
      "—",
      "—",
      "—",
      "+50.0%",
    ]);
  });

  it("mês sem faturamento nenhum aparece com travessão, não com zero", () => {
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    expect(linha("Tabela Mensal Comparativa", "Abr")).toEqual([
      "Abr",
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
    ]);
  });

  it("a linha de total usa os totais do ano, não a média das variações", () => {
    // A média das variações mensais de 2026 vs 2025 daria outro número; o que
    // vale é (320.000 − 400.000) ÷ 400.000.
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    expect(linha("Tabela Mensal Comparativa", "Total")).toEqual([
      "Total",
      "—",
      "—",
      "—",
      "R$ 400.000,00",
      "R$ 320.000,00",
      "—",
      "—",
      "—",
      "-20.0%",
    ]);
  });

  it("o filtro de tipo também muda a tabela", () => {
    baseFechada();
    render(<GerenciamentoFinanceiro />);

    fireEvent.click(controle("Serviços"));

    expect(linha("Tabela Mensal Comparativa", "Jan")[4]).toBe("R$ 50.000,00");
    expect(linha("Tabela Mensal Comparativa", "Mar")[5]).toBe("R$ 20.000,00");
  });
});

describe("Financeiro — balancete", () => {
  beforeEach(() => {
    baseFechada();
    contasDoBalancete();
  });

  it("as entradas são as vendas e os serviços do ano escolhido", () => {
    render(<GerenciamentoFinanceiro />);
    abrirAba("Balancete");

    // A primeira célula é o rótulo da linha; janeiro é a segunda.
    const vendas = linha("Balancete — 2026", "RECEITAS - VENDAS");
    expect(vendas[1]).toBe("R$ 300.000,00"); // Jan
    expect(total(vendas)).toBe("R$ 300.000,00"); // total do ano
    const servicos = linha("Balancete — 2026", "RECEITAS - SERVIÇO");
    expect(servicos[3]).toBe("R$ 20.000,00"); // Mar
  });

  it("as saídas são agrupadas pelo número que abre a categoria", () => {
    render(<GerenciamentoFinanceiro />);
    abrirAba("Balancete");

    expect(
      total(linha("Balancete — 2026", "1 - CUSTOS E DESPESAS FIXAS - EQUIPE")),
    ).toBe("R$ 1.000,00");
    expect(total(linha("Balancete — 2026", "10 - OUTROS CUSTOS"))).toBe(
      "R$ 2.000,00",
    );
  });

  it("os grupos de saída são ordenados por número, não por texto", () => {
    // Ordenado como texto, "10" viria antes de "1".
    render(<GerenciamentoFinanceiro />);
    abrirAba("Balancete");

    const rotulos = within(cartao("Balancete — 2026"))
      .getAllByRole("row")
      .map((l) => texto(l.firstElementChild))
      .filter((r) => /^\d+ - /.test(r));
    expect(rotulos).toEqual([
      "1 - CUSTOS E DESPESAS FIXAS - EQUIPE",
      "2 - CUSTOS E DESPESAS FIXAS - SEDE",
      "10 - OUTROS CUSTOS",
    ]);
  });

  // ── DEFEITO PRESERVADO ───────────────────────────────────────────────────
  // Conta cuja categoria não começa por número cai no grupo "outros", que é
  // filtrado da listagem — mas continua somando no total de saídas. O
  // balancete fecha com um valor que nenhuma linha visível explica: aqui as
  // linhas somam 3.000,00 e o total diz 3.500,00.
  //
  // Fica fixado como está para que a migração não o mude sem querer; o
  // conserto é a fase seguinte, e a decisão de qual dos dois lados está certo
  // (mostrar a linha "outros" ou tirá-la do total) é do Erick.
  it("conta sem categoria numérica soma no total mas não tem linha", () => {
    render(<GerenciamentoFinanceiro />);
    abrirAba("Balancete");

    expect(screen.queryByText(/outros - Outros/i)).not.toBeInTheDocument();
    // Fevereiro: nenhuma linha visível, e mesmo assim 500,00 no total.
    expect(linha("Balancete — 2026", "Total de saídas")[2]).toBe("R$ 500,00");
    expect(total(linha("Balancete — 2026", "Total de saídas"))).toBe(
      "R$ 23.500,00",
    );
  });

  it("conta de outro ano ou sem data de emissão não entra", () => {
    render(<GerenciamentoFinanceiro />);
    abrirAba("Balancete");

    // A conta de 9.999,00 é de 2025 e a de 77,00 não tem data.
    expect(kpiBalancete("Total Saídas")).toContain("R$ 23.500,00");
  });

  it("o saldo do período é entradas menos saídas, mês a mês e no ano", () => {
    render(<GerenciamentoFinanceiro />);
    abrirAba("Balancete");

    const saldo = linha("Balancete — 2026", "Saldo do Período");
    expect(saldo[1]).toBe("R$ 297.000,00"); // Jan: 300.000 − 3.000
    expect(saldo[2]).toBe("-R$ 500,00"); // Fev: 0 − 500
    expect(total(saldo)).toBe("R$ 296.500,00"); // 320.000 − 23.500
  });

  it("mês sem entrada nem saída fica com travessão, não com saldo zero", () => {
    render(<GerenciamentoFinanceiro />);
    abrirAba("Balancete");

    expect(linha("Balancete — 2026", "Saldo do Período")[4]).toBe("—"); // Abr
  });

  it("mês que fecha empatado mostra travessão, igual a mês sem movimento", () => {
    // Comportamento preservado: `formatBRL` devolve travessão para zero, então
    // março (20.000 de entrada e 20.000 de saída) fica visualmente idêntico a
    // abril, que não teve movimento nenhum. O guarda `temDados` do código só
    // muda a COR do travessão, não o texto — quem migrar a tela precisa saber
    // que a distinção que parece existir ali não chega ao texto.
    render(<GerenciamentoFinanceiro />);
    abrirAba("Balancete");

    const saldo = linha("Balancete — 2026", "Saldo do Período");
    expect(saldo[3]).toBe("—"); // Mar: 20.000 − 20.000
    expect(saldo[4]).toBe("—"); // Abr: sem movimento
  });

  it("os KPIs do topo repetem os totais do ano", () => {
    render(<GerenciamentoFinanceiro />);
    abrirAba("Balancete");

    expect(kpiBalancete("Total Entradas")).toContain("R$ 320.000,00");
    expect(kpiBalancete("Total Saídas")).toContain("R$ 23.500,00");
    expect(kpiBalancete("Saldo do Período")).toContain("R$ 296.500,00");
  });

  it("trocar o ano do balancete troca entradas e saídas", () => {
    render(<GerenciamentoFinanceiro />);
    abrirAba("Balancete");

    fireEvent.click(screen.getByRole("button", { name: "2025" }));

    expect(screen.getByText("Balancete — 2025")).toBeInTheDocument();
    expect(kpiBalancete("Total Entradas")).toContain("R$ 400.000,00");
    expect(kpiBalancete("Total Saídas")).toContain("R$ 9.999,00");
  });

  it("o gráfico do balancete recebe entrada e saída de cada mês", () => {
    render(<GerenciamentoFinanceiro />);
    abrirAba("Balancete");

    const dados = pontos("Entradas vs Saídas — 2026");
    expect(dados[0]).toBe("mes=Jan Entradas=300000 Saídas=3000");
    expect(dados[1]).toBe("mes=Fev Entradas=0 Saídas=500");
    expect(dados[2]).toBe("mes=Mar Entradas=20000 Saídas=20000");
  });

  // ── DEFEITO PRESERVADO ───────────────────────────────────────────────────
  // O `toNum` da tela só trata o ponto como milhar quando há vírgula no
  // texto; sem vírgula ele faz `parseFloat("1.234")` e para no primeiro
  // ponto. É o mesmo defeito que `src/lib/dinheiro.ts` já fechou para as
  // telas de Contas — e a troca por `converterParaNumero` é conserto, não
  // migração, então fica para a fase seguinte com o número fixado aqui.
  it("valor sem centavos é lido dividido por mil (defeito preservado)", () => {
    estadoPagar.contas = [
      {
        id: 1,
        data_emissao: "2026-01-05",
        categoria: "1 - EQUIPE",
        valor: "1.234",
      },
    ];
    render(<GerenciamentoFinanceiro />);
    abrirAba("Balancete");

    expect(kpiBalancete("Total Saídas")).toContain("R$ 1,23");
  });

  it.each([
    ["texto brasileiro com símbolo", "R$ 1.234,56"],
    ["texto brasileiro sem símbolo", "1.234,56"],
    ["texto com ponto decimal", "1234.56"],
    ["número puro", 1234.56],
  ])("lê o valor da conta em %s", (_rotulo, valor) => {
    estadoPagar.contas = [
      { id: 1, data_emissao: "2026-01-05", categoria: "1 - EQUIPE", valor },
    ];
    render(<GerenciamentoFinanceiro />);
    abrirAba("Balancete");

    expect(kpiBalancete("Total Saídas")).toContain("R$ 1.234,56");
  });
});

describe("Financeiro — o que a página entrega para a aba Meta", () => {
  it("passa o faturamento do ano anterior somando vendas e serviços", () => {
    baseFechada();
    render(<GerenciamentoFinanceiro />);
    abrirAba("Meta");

    // Relógio em 2026 → ano anterior 2025 → 350.000 + 50.000.
    expect(screen.getByText(/^meta ·/).textContent).toContain(
      "ano 2025 · faturamento 400000",
    );
  });

  it("o filtro de tipo da Visão Geral não mexe no que a Meta recebe", () => {
    // A base do PL é o faturamento inteiro; se o filtro vazasse para cá, o
    // bônus da empresa mudaria conforme o botão que alguém deixou clicado.
    baseFechada();
    render(<GerenciamentoFinanceiro />);
    fireEvent.click(controle("Vendas"));

    abrirAba("Meta");

    expect(screen.getByText(/^meta ·/).textContent).toContain(
      "faturamento 400000",
    );
  });

  it("sem faturamento no ano anterior, entrega zero", () => {
    estadoVendas.notas = [
      { id: 1, data_emissao: "2026-01-10", valor_nota: 300_000 },
    ];
    render(<GerenciamentoFinanceiro />);
    abrirAba("Meta");

    expect(screen.getByText(/^meta ·/).textContent).toContain("faturamento 0");
  });
});
