/**
 * As contas do Gerenciamento Financeiro, sem React.
 *
 * A tela agrega dois fluxos que a API entrega separados — notas de venda e
 * notas de serviço — em uma série por ano e mês, e daí tira tudo o que
 * mostra: KPI de ano, comparativo mensal, acumulado, variação ano contra ano
 * e o balancete. Nada disso estava escrito fora da tela, e é o número que a
 * diretoria lê. Aqui as contas ficam testáveis por fora e a tela vira
 * composição.
 */

/**
 * A janela de anos da tela. É lista fechada, e não `ano atual − 4`, porque a
 * base do Tiny começa em 2022 — antes disso não há nota para comparar.
 */
export const ANOS = [2022, 2023, 2024, 2025, 2026] as const;
export type Ano = (typeof ANOS)[number];

/** Os pares que a tela compara: cada ano contra o anterior. */
export const PARES_YOY: [Ano, Ano][] = [
  [2022, 2023],
  [2023, 2024],
  [2024, 2025],
  [2025, 2026],
];

export const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

/** O que entra na conta: só venda, só serviço, ou os dois. */
export type TipoDeReceita = "combinado" | "vendas" | "servicos";

/**
 * O plano de contas do Tiny, pelo número que abre a categoria. É o que
 * transforma "3 - CUSTOS E DESPESAS FIXAS - SERVIÇOS DE APOIO" no grupo "3":
 * o Tiny não tem campo de grupo, o grupo mora no começo do texto.
 */
export const GRUPOS_DE_CATEGORIA: Record<string, string> = {
  "1": "1 - CUSTOS E DESPESAS FIXAS - EQUIPE",
  "2": "2 - CUSTOS E DESPESAS FIXAS - SEDE",
  "3": "3 - CUSTOS E DESPESAS FIXAS - SERVIÇOS DE APOIO",
  "4": "4 - CUSTOS E DESPESAS FIXAS - GERAIS",
  "5": "5 - CUSTOS E DESPESAS FIXAS - DIRETORIA",
  "6": "6 - CUSTOS E DESPESAS VARIÁVEIS - MATERIAIS",
  "7": "7 - CUSTOS E DESPESAS VARIÁVEIS - IMPOSTO INDIRETO",
  "8": "8 - CUSTOS E DESPESAS VARIÁVEIS - IMPOSTO DIRETO",
  "9": "9 - CUSTOS E DESPESAS - FINANCEIRAS",
  "10": "10 - OUTROS CUSTOS",
  "11": "11 - RECEITAS - VENDAS",
  "12": "12 - RECEITAS - SERVIÇO",
};

/** Rótulo das duas linhas de entrada, que não vêm do plano de contas. */
export const ROTULO_DE_ENTRADA: Record<string, string> = {
  vendas: "RECEITAS - VENDAS",
  servicos: "RECEITAS - SERVIÇO",
};

/**
 * Dinheiro na tela. Zero vira travessão de propósito: nesta tela zero quase
 * sempre é mês que ainda não aconteceu, não valor apurado. É a regra do
 * design — "zero como dado ainda não existente mostra —".
 */
export function formatarMoeda(valor: number): string {
  return valor === 0
    ? "—"
    : valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Rótulo curto do eixo do gráfico: `R$ 1.2M`, `R$ 340K`. */
export function formatarValorAbreviado(valor: number): string {
  if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `R$ ${(valor / 1_000).toFixed(0)}K`;
  return `R$ ${valor}`;
}

/** Percentual na tela: uma casa e sinal explícito quando positivo. */
export function formatarVariacao(valor: number | null): string {
  if (valor === null) return "—";
  return `${valor >= 0 ? "+" : ""}${valor.toFixed(1)}%`;
}

/** A chave da série de variação de um par de anos — `var20262025`. */
export function chaveDaVariacao(base: Ano, comp: Ano): string {
  return `var${comp}${base}`;
}

/**
 * O valor de uma conta a pagar, que o Tiny manda ora número, ora texto.
 *
 * ⚠️ NÃO é o `converterParaNumero` de `src/lib/dinheiro.ts`, e a diferença é
 * um defeito: aqui, sem vírgula no texto, o ponto é lido como decimal, então
 * `"1.234"` vale 1,234 e não mil duzentos e trinta e quatro. O comportamento
 * está preservado de propósito — trocá-lo muda número de balancete e é
 * conserto, não migração. Fixado em `GerenciamentoFinanceiro.test.tsx`.
 */
export function lerValorDaConta(valor: string | number | undefined): number {
  if (typeof valor === "number") return valor;
  if (!valor) return 0;
  const texto = valor.toString().replace(/R\$/g, "").replace(/\s/g, "");
  if (texto.includes(",")) {
    return parseFloat(texto.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return parseFloat(texto) || 0;
}

/** O número que abre a categoria, ou `outros` quando não há número. */
export function prefixoDaCategoria(
  categoria: string | null | undefined,
): string {
  if (!categoria) return "outros";
  const achado = categoria.match(/^(\d+)/);
  return achado ? achado[1] : "outros";
}

/** Só o que a tela lê de uma nota de venda. */
export interface NotaDeVenda {
  data_emissao: string;
  valor_nota: number;
}

/** Só o que a tela lê de uma nota de serviço já enriquecida. */
export interface ServicoDoAno {
  ano: number;
  data_emissao: string;
  valor_servico_numero: number;
}

/** Só o que o balancete lê de uma conta a pagar. */
export interface ContaDoBalancete {
  data_emissao: string;
  categoria: string | null;
  valor: string | number;
}

/** Doze meses por ano da janela. */
export type SeriePorAnoMes = Record<number, number[]>;

function serieZerada(): SeriePorAnoMes {
  const serie: SeriePorAnoMes = {};
  for (const ano of ANOS) serie[ano] = Array(12).fill(0);
  return serie;
}

/**
 * Soma as notas de venda por ano e mês.
 *
 * Nota de ano fora da janela é descartada em silêncio — o `if (ano in serie)`
 * é o que impede que a base histórica de 2021 apareça somada em 2022.
 */
export function somarVendas(notas: NotaDeVenda[]): SeriePorAnoMes {
  const serie = serieZerada();
  for (const nota of notas) {
    const [anoTexto, mesTexto] = nota.data_emissao.split("-");
    const ano = Number(anoTexto);
    const mes = Number(mesTexto) - 1;
    if (ano in serie) serie[ano][mes] += Number(nota.valor_nota || 0);
  }
  return serie;
}

/**
 * Soma os serviços por ano e mês.
 *
 * O ano vem do campo `ano` que o contexto já calculou, e o mês da data — é
 * assim que a tela sempre leu, e mudar para ler os dois da data mudaria
 * número em qualquer serviço cujo `ano` divirja da `data_emissao`.
 */
export function somarServicos(servicos: ServicoDoAno[]): SeriePorAnoMes {
  const serie = serieZerada();
  for (const servico of servicos) {
    const mes = Number(servico.data_emissao.split("-")[1]) - 1;
    if (servico.ano in serie) {
      serie[servico.ano][mes] += servico.valor_servico_numero;
    }
  }
  return serie;
}

/** Aplica o filtro de tipo às duas séries. */
export function combinarPorTipo(
  tipo: TipoDeReceita,
  vendas: SeriePorAnoMes,
  servicos: SeriePorAnoMes,
): SeriePorAnoMes {
  const serie: SeriePorAnoMes = {};
  for (const ano of ANOS) {
    serie[ano] = Array(12)
      .fill(0)
      .map((_, mes) => {
        const venda = tipo !== "servicos" ? vendas[ano][mes] : 0;
        const servico = tipo !== "vendas" ? servicos[ano][mes] : 0;
        return venda + servico;
      });
  }
  return serie;
}

/** O total do ano inteiro de uma série. */
export function somaDoAno(serie: SeriePorAnoMes, ano: number): number {
  return (serie[ano] ?? Array(12).fill(0)).reduce(
    (soma: number, valor: number) => soma + valor,
    0,
  );
}

/**
 * Crescimento percentual de `base` para `comp`.
 *
 * Base zerada devolve `null`, não `Infinity`: mês que ainda não aconteceu
 * não tem crescimento, e a tela mostra travessão no lugar.
 */
export function crescimento(base: number, comp: number): number | null {
  return base > 0 ? ((comp - base) / base) * 100 : null;
}

export interface KpiDeAno {
  ano: Ano;
  total: number;
  /** Quantas notas entraram, já respeitando o filtro de tipo. */
  quantidade: number;
  /** Contra o ano anterior da janela; `null` quando não há com o que comparar. */
  crescimento: number | null;
}

export function kpisPorAno(
  total: SeriePorAnoMes,
  notas: NotaDeVenda[],
  servicos: ServicoDoAno[],
  tipo: TipoDeReceita,
): KpiDeAno[] {
  return ANOS.map((ano, indice) => {
    const totalDoAno = somaDoAno(total, ano);
    const totalAnterior = indice > 0 ? somaDoAno(total, ANOS[indice - 1]) : 0;
    const deVendas =
      tipo !== "servicos"
        ? notas.filter((n) => Number(n.data_emissao.split("-")[0]) === ano)
            .length
        : 0;
    const deServicos =
      tipo !== "vendas" ? servicos.filter((s) => s.ano === ano).length : 0;
    return {
      ano,
      total: totalDoAno,
      quantidade: deVendas + deServicos,
      // Ano sem faturamento não exibe crescimento: dizer "−100% vs 2025" num
      // ano que ainda nem começou seria ler o futuro como queda.
      crescimento:
        totalDoAno > 0 ? crescimento(totalAnterior, totalDoAno) : null,
    };
  });
}

/** Um mês, com a variação de cada um dos quatro pares de anos. */
export type PontoDeVariacao = Record<string, string | number | null>;

export function variacaoMensal(total: SeriePorAnoMes): PontoDeVariacao[] {
  return MESES.map((mes, indice) => {
    const ponto: PontoDeVariacao = { mes };
    for (const [base, comp] of PARES_YOY) {
      ponto[chaveDaVariacao(base, comp)] = crescimento(
        total[base][indice],
        total[comp][indice],
      );
    }
    return ponto;
  });
}

/** Um mês, com uma série por ano ligado. */
export type PontoAnual = Record<string, string | number>;

export function pontosComparativos(
  total: SeriePorAnoMes,
  anosAtivos: Set<Ano>,
): PontoAnual[] {
  return MESES.map((mes, indice) => {
    const ponto: PontoAnual = { mes };
    for (const ano of ANOS) {
      if (anosAtivos.has(ano)) ponto[ano.toString()] = total[ano][indice];
    }
    return ponto;
  });
}

/** O mesmo comparativo, acumulado de janeiro até o mês. */
export function pontosAcumulados(
  total: SeriePorAnoMes,
  anosAtivos: Set<Ano>,
): PontoAnual[] {
  return MESES.map((mes, indice) => {
    const ponto: PontoAnual = { mes };
    for (const ano of ANOS) {
      if (!anosAtivos.has(ano)) continue;
      ponto[ano.toString()] = total[ano]
        .slice(0, indice + 1)
        .reduce((soma, valor) => soma + valor, 0);
    }
    return ponto;
  });
}

/**
 * Liga ou desliga um ano, sem nunca deixar a seleção vazia.
 *
 * Desligar o último ano deixaria o gráfico em branco e sem pista de como
 * voltar — o guarda de tamanho é o que impede.
 */
export function alternarAno(anosAtivos: Set<Ano>, ano: Ano): Set<Ano> {
  const proximo = new Set(anosAtivos);
  if (proximo.has(ano)) {
    if (proximo.size > 1) proximo.delete(ano);
  } else {
    proximo.add(ano);
  }
  return proximo;
}

export interface Balancete {
  /** Doze meses de cada linha de entrada, por chave (`vendas`, `servicos`). */
  entradas: Record<string, number[]>;
  /** Doze meses de cada grupo de saída, pelo prefixo da categoria. */
  saidas: Record<string, number[]>;
  totalEntradasMes: number[];
  totalSaidasMes: number[];
  saldoMes: number[];
  /** As chaves de entrada na ordem de exibição. */
  linhasDeEntrada: string[];
  /** Os grupos de saída na ordem de exibição — numérica, não alfabética. */
  linhasDeSaida: string[];
  pontosDoGrafico: { mes: string; Entradas: number; Saídas: number }[];
  totalEntradasAno: number;
  totalSaidasAno: number;
  saldoDoAno: number;
}

/**
 * O balancete de um ano: entradas de venda e serviço contra as contas a pagar
 * agrupadas pelo plano de contas.
 *
 * ⚠️ Conta cuja categoria não começa por número cai no grupo `outros`, que
 * **não entra em `linhasDeSaida`** e portanto não vira linha na tela — mas
 * continua somando em `totalSaidasMes`. O balancete fecha com um valor que
 * nenhuma linha visível explica. Defeito preservado de propósito: qual dos
 * dois lados corrigir é decisão de negócio. Fixado no teste da tela.
 */
export function montarBalancete(
  vendas: SeriePorAnoMes,
  servicos: SeriePorAnoMes,
  contas: ContaDoBalancete[],
  ano: number,
): Balancete {
  const entradas: Record<string, number[]> = {
    vendas: [...(vendas[ano] ?? Array(12).fill(0))],
    servicos: [...(servicos[ano] ?? Array(12).fill(0))],
  };

  const saidas: Record<string, number[]> = {};
  for (const conta of contas) {
    if (!conta.data_emissao) continue;
    const partes = conta.data_emissao.split("-");
    if (Number(partes[0]) !== ano) continue;
    const mes = Number(partes[1]) - 1;
    const grupo = prefixoDaCategoria(conta.categoria);
    if (!saidas[grupo]) saidas[grupo] = Array(12).fill(0);
    saidas[grupo][mes] += lerValorDaConta(conta.valor);
  }

  const porMes = (linhas: Record<string, number[]>) =>
    Array(12)
      .fill(0)
      .map((_, mes) =>
        Object.values(linhas).reduce((soma, valores) => soma + valores[mes], 0),
      );

  const totalEntradasMes = porMes(entradas);
  const totalSaidasMes = porMes(saidas);
  const saldoMes = totalEntradasMes.map(
    (entrada, mes) => entrada - totalSaidasMes[mes],
  );

  const totalEntradasAno = totalEntradasMes.reduce((a, b) => a + b, 0);
  const totalSaidasAno = totalSaidasMes.reduce((a, b) => a + b, 0);

  return {
    entradas,
    saidas,
    totalEntradasMes,
    totalSaidasMes,
    saldoMes,
    linhasDeEntrada: ["vendas", "servicos"].filter(
      (chave) => chave in entradas,
    ),
    // Ordem numérica, não alfabética: como texto, "10" viria antes de "2".
    linhasDeSaida: Object.keys(saidas)
      .filter((grupo) => grupo !== "outros")
      .sort((a, b) => Number(a) - Number(b)),
    pontosDoGrafico: MESES.map((mes, indice) => ({
      mes,
      Entradas: totalEntradasMes[indice],
      Saídas: totalSaidasMes[indice],
    })),
    totalEntradasAno,
    totalSaidasAno,
    saldoDoAno: totalEntradasAno - totalSaidasAno,
  };
}
