/**
 * A regra das duas telas de Contas, separada das telas.
 *
 * `Contas a Receber` e `Contas a Pagar` eram gêmeas: 83% das linhas
 * idênticas, 277 divergentes em 1641. Este arquivo é o lado que não muda
 * entre elas — filtro, KPI, gráfico, busca, ordenação, paginação e planilha
 * —, escrito uma vez e exercitado por `contas.test.ts`.
 *
 * O que difere de PROPÓSITO entra por parâmetro, nunca por cópia:
 *
 *  - **o que conta como quitado**: Receber aceita `recebido` ou `pago`,
 *    Pagar aceita só `pago`;
 *  - **qual campo de data manda no filtro de período**: Receber usa `data`,
 *    Pagar usa `data_emissao`.
 *
 * A Fase 1 trouxe o comportamento linha a linha, defeitos inclusive; a Fase 2
 * fechou os 18 do levantamento de 31/08/2026 aqui dentro, numa edição só para
 * as duas telas — que é exatamente o que este arquivo existe para permitir.
 * Onde o comportamento mudou de propósito, o comentário no lugar diz o que
 * era antes e por que deixou de ser.
 *
 * O que o levantamento registrou e NÃO foi mexido continua marcado como
 * comportamento preservado no teste: categoria vazia como fatia à parte,
 * contraparte agrupada pelo nome cru (caixa e espaço sobrando contam como
 * cadastros diferentes) e conta sem situação que não dá para filtrar.
 */

import { dataDeCalendario, diaLocal } from "../../lib/datas";
import { periodoDoMes, type Periodo } from "../../lib/periodo";

/** Os campos que as duas telas leem de uma conta, já enriquecida pelo contexto. */
export interface ContaBase {
  id: number;
  id_tiny: number;
  vencimento: string;
  situacao: string | null;
  categoria: string | null;
  cliente_nome: string;
  cliente_cpf_cnpj: string | null;
  nro_documento: string | null;
  historico: string | null;
  liquidacao: string | null;
  cliente_cidade: string | null;
  cliente_uf: string | null;
  valor_numero: number;
  saldo_numero: number;
  ano: number;
  vencida: boolean;
}

/**
 * As duas divergências de domínio do par, num tipo só.
 *
 * `campoDaEmissao` existe porque a API entrega o mesmo dado com dois nomes:
 * `contas_receber.data` e `contas_pagar.data_emissao`. A coluna que sai disso
 * se chama "Emissão" nas duas telas.
 *
 * SUPOSIÇÃO NÃO CONFIRMADA CONTRA O TINY: que `contas_receber.data` é mesmo a
 * data de EMISSÃO da conta, e não outra coisa (competência, cadastro). A
 * decisão do Erick em 31/08/2026 foi preservar o comportamento atual
 * exatamente como está e travá-lo por teste, em vez de unificar às cegas. Se
 * a conferência contra o Tiny disser outra coisa, é aqui que muda — e o
 * rótulo "Emissão" da coluna e da planilha muda junto.
 */
export interface DialetoDeContas<C extends ContaBase> {
  /**
   * O NOME do campo que guarda a data de emissão — `data` em Contas a
   * Receber, `data_emissao` em Contas a Pagar.
   *
   * É nome de campo, e não uma função que lê o campo, porque a tabela
   * precisa do nome para ORDENAR por ele. Com os dois separados dava para a
   * tela filtrar por um campo e ordenar por outro sem ninguém perceber.
   */
  campoDaEmissao: Extract<keyof C, string>;
  /** Situações que contam como quitada, em minúscula. */
  situacoesQuitadas: readonly string[];
  /** Nome da série de quitado nos dados do gráfico ("recebido" / "pago"). */
  chaveQuitado: string;
}

/** A data de emissão de uma conta, seja qual for o nome que a API deu a ela. */
export function emissaoDe<C extends ContaBase>(conta: C, dialeto: DialetoDeContas<C>): string {
  return String(conta[dialeto.campoDaEmissao]);
}

export interface Ordenacao {
  campo: string;
  direcao: "asc" | "desc";
}

export interface FiltrosDeContas {
  situacao: string[];
  categoria: string[];
  contraparte: string[];
  dataInicio: string;
  dataFim: string;
}

export interface KpisDeContas {
  totalAberto: number;
  totalQuitado: number;
  contasVencidas: number;
  aVencer30: number;
  mediaMensal: number;
}

export interface PontoDeCategoria {
  name: string;
  value: number;
}

export interface PontoDeContraparte {
  nome: string;
  valor: number;
}

/** Um ponto do gráfico de evolução: `label` mais a série de quitado e a de aberto. */
export type PontoDeEvolucao = Record<string, string | number>;

export interface Evolucao {
  dados: PontoDeEvolucao[];
  titulo: string;
  modo: "anual" | "mensal";
  /** O ano do modo mensal; `null` no anual. */
  ano: number | null;
}

export const MESES_ABREV = [
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
] as const;

export const ITENS_POR_PAGINA = 15;

export const ORDENACAO_INICIAL: Ordenacao = { campo: "vencimento", direcao: "asc" };

/** No máximo oito fatias na pizza de categoria, contando a de "Outros". */
export const FATIAS_DE_CATEGORIA = 8;

/** O nome da fatia que junta tudo o que não coube nas sete maiores. */
export const FATIA_DE_OUTROS = "Outros";

/** No máximo dez barras no ranking de cliente/fornecedor. */
export const BARRAS_DE_CONTRAPARTE = 10;

// ── Formatação ─────────────────────────────────────────────────────────────

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** O eixo Y dos gráficos: R$ 1,2M · R$ 340,0K · R$ 900. */
export function formatarValorAbreviado(valor: number): string {
  if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `R$ ${(valor / 1_000).toFixed(1)}K`;
  return `R$ ${valor.toLocaleString("pt-BR")}`;
}

// ── Situação ───────────────────────────────────────────────────────────────

/** Se a conta já foi quitada, segundo o dialeto da tela. */
export function estaQuitada<C extends ContaBase>(
  situacao: string | null,
  dialeto: DialetoDeContas<C>,
): boolean {
  return dialeto.situacoesQuitadas.includes(situacao?.toLowerCase() ?? "");
}

/** As duas situações que a tela desenha em amarelo enquanto estão no prazo. */
export function estaEmAberto(situacao: string | null): boolean {
  const s = situacao?.toLowerCase() ?? "";
  return s === "pendente" || s === "aberto";
}

// ── As duas grandezas de uma conta ─────────────────────────────────────────
//
// O painel somava GRANDEZAS DIFERENTES no mesmo lugar: conta quitada entrava
// pelo valor cheio e conta em aberto pelo saldo. Uma nota de R$ 1.000 com
// R$ 900 já recebidos aparecia como R$ 100 em "aberto", e os R$ 900 que de
// fato entraram não apareciam em lugar nenhum (defeito 1.1).
//
// As três funções abaixo são a decisão do Erick em 31/08/2026, e valem para
// os KPIs e para os TRÊS gráficos de uma vez — é o que faz o topo da tela e o
// gráfico logo abaixo fecharem entre si.

/**
 * O que já entrou (ou saiu) por uma conta: o valor menos o que ainda falta.
 *
 * De TODAS as contas, quitadas ou não — o recebimento parcial de uma conta em
 * aberto é dinheiro que entrou do mesmo jeito.
 */
export function quitadoDe<C extends ContaBase>(conta: C): number {
  return conta.valor_numero - conta.saldo_numero;
}

/** O que ainda falta receber (ou pagar) por uma conta; zero se já quitou. */
export function abertoDe<C extends ContaBase>(conta: C, dialeto: DialetoDeContas<C>): number {
  return estaQuitada(conta.situacao, dialeto) ? 0 : conta.saldo_numero;
}

/**
 * O faturado de uma conta — o que entrou mais o que ainda falta.
 *
 * É a base dos três gráficos, e é ela que faz o gráfico fechar com o painel:
 * a soma dos gráficos é, por construção, `totalQuitado + totalAberto`. Numa
 * conta em aberto dá o valor cheio; numa quitada dá o que de fato entrou (que
 * é o valor cheio sempre que o saldo foi zerado, como o Tiny faz).
 */
export function faturadoDe<C extends ContaBase>(conta: C, dialeto: DialetoDeContas<C>): number {
  return quitadoDe(conta) + abertoDe(conta, dialeto);
}

// ── Opções dos filtros ─────────────────────────────────────────────────────

/**
 * Os valores distintos e NÃO VAZIOS de um campo, na ordem do alfabeto
 * brasileiro.
 *
 * `localeCompare` com `pt-BR`, e não `.sort()` cru: o `sort` sem comparador
 * ordena por código UTF-16, e aí "Água" cai depois de "Zinco" na lista que a
 * pessoa lê (defeito 1.11).
 *
 * O vazio some das três listas. Situação e categoria já o tiravam; a de
 * cliente/fornecedor não, e um `cliente_nome` em branco virava uma opção
 * clicável escrita "(vazio)" — que não filtrava nada de útil e ainda dava a
 * entender que existe um cadastro chamado assim.
 */
export function opcoesDistintas(valores: (string | null)[]): string[] {
  return Array.from(new Set(valores.map((valor) => valor ?? "")))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// ── Período ────────────────────────────────────────────────────────────────

/** O ano inteiro, para o clique numa barra do gráfico anual. */
export function periodoDoAno(ano: string): Periodo {
  return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` };
}

/**
 * O período que o clique numa barra do gráfico de evolução impõe, ou `null`
 * quando a barra não corresponde a período nenhum.
 */
export function periodoDaBarra(
  rotulo: string | undefined,
  modo: Evolucao["modo"],
  ano: number | null,
): Periodo | null {
  if (!rotulo) return null;
  if (modo === "anual") return periodoDoAno(rotulo);
  if (!ano) return null;
  const indice = MESES_ABREV.indexOf(rotulo as (typeof MESES_ABREV)[number]);
  if (indice === -1) return null;
  return periodoDoMes(ano, indice);
}

// ── Filtro ─────────────────────────────────────────────────────────────────

/**
 * Os cinco filtros do topo, aplicados em conjunto (é E entre campos, OU
 * dentro de cada multi-seleção). As bordas de data são inclusivas.
 */
export function filtrarContas<C extends ContaBase>(
  contas: C[],
  filtros: FiltrosDeContas,
  dialeto: DialetoDeContas<C>,
): C[] {
  return contas.filter((conta) => {
    if (filtros.situacao.length > 0 && !filtros.situacao.includes(conta.situacao ?? "")) {
      return false;
    }
    if (filtros.categoria.length > 0 && !filtros.categoria.includes(conta.categoria ?? "")) {
      return false;
    }
    if (filtros.contraparte.length > 0 && !filtros.contraparte.includes(conta.cliente_nome)) {
      return false;
    }
    const emissao = emissaoDe(conta, dialeto);
    if (filtros.dataInicio && emissao < filtros.dataInicio) return false;
    if (filtros.dataFim && emissao > filtros.dataFim) return false;
    return true;
  });
}

// ── KPIs ───────────────────────────────────────────────────────────────────

/**
 * Os cinco números do topo.
 *
 * `totalAberto` é a soma dos SALDOS das contas não quitadas — o que ainda
 * falta. `totalQuitado` é a soma de `valor − saldo` de TODAS as contas — o
 * que de fato entrou (ou saiu), inclusive o recebimento parcial de uma conta
 * que ainda está em aberto (defeito 1.1).
 *
 * Com isso `totalAberto + totalQuitado` é o FATURADO da base, e a média
 * mensal — que sempre foi a soma dos dois dividida pelos meses distintos de
 * EMISSÃO — vira uma grandeza real: a média mensal faturada, coerente com o
 * divisor ser mês de emissão (defeito 1.2). O rótulo na tela diz isso.
 */
export function calcularKpis<C extends ContaBase>(
  contas: C[],
  dialeto: DialetoDeContas<C>,
  agora: Date,
): KpisDeContas {
  const hoje = new Date(agora);
  hoje.setHours(0, 0, 0, 0);
  const em30Dias = new Date(hoje);
  em30Dias.setDate(hoje.getDate() + 30);

  let totalAberto = 0;
  let totalQuitado = 0;
  let contasVencidas = 0;
  let aVencer30 = 0;

  for (const conta of contas) {
    const quitada = estaQuitada(conta.situacao, dialeto);
    totalQuitado += quitadoDe(conta);
    totalAberto += abertoDe(conta, dialeto);

    if (conta.vencida) contasVencidas += 1;

    const [ano, mes, dia] = conta.vencimento.split("-");
    const vencimento = new Date(Number(ano), Number(mes) - 1, Number(dia));
    if (vencimento >= hoje && vencimento <= em30Dias && !quitada) aVencer30 += 1;
  }

  const mesesComDados = new Set(contas.map((conta) => emissaoDe(conta, dialeto).slice(0, 7))).size;
  const mediaMensal = mesesComDados > 0 ? (totalAberto + totalQuitado) / mesesComDados : 0;

  return { totalAberto, totalQuitado, contasVencidas, aVencer30, mediaMensal };
}

// ── Gráficos ───────────────────────────────────────────────────────────────

/**
 * A evolução: anual quando a base tem mais de um ano, mensal quando tem um só.
 *
 * No modo mensal desenha os doze meses, inclusive os zerados; no anual só os
 * anos que têm conta. A série de quitado leva o nome do dialeto (`recebido`
 * ou `pago`) porque é esse nome que aparece na legenda e no tooltip.
 */
export function montarEvolucao<C extends ContaBase>(
  contas: C[],
  dialeto: DialetoDeContas<C>,
  agora: Date,
): Evolucao {
  const anosPresentes = new Set(contas.map((conta) => conta.ano));
  const chave = dialeto.chaveQuitado;

  if (anosPresentes.size > 1) {
    const porAno = new Map<number, { quitado: number; aberto: number }>();
    for (const conta of contas) {
      if (!porAno.has(conta.ano)) porAno.set(conta.ano, { quitado: 0, aberto: 0 });
      const entrada = porAno.get(conta.ano)!;
      entrada.quitado += quitadoDe(conta);
      entrada.aberto += abertoDe(conta, dialeto);
    }
    const dados = Array.from(porAno.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([ano, { quitado, aberto }]) => ({ label: String(ano), [chave]: quitado, aberto }));
    return { dados, titulo: "Evolução Anual", modo: "anual", ano: null };
  }

  const ano = anosPresentes.values().next().value ?? agora.getFullYear();
  const meses: PontoDeEvolucao[] = MESES_ABREV.map((mes) => ({
    label: mes,
    [chave]: 0,
    aberto: 0,
  }));
  for (const conta of contas) {
    const indice = Number(emissaoDe(conta, dialeto).split("-")[1]) - 1;
    const ponto = meses[indice];
    ponto[chave] = (ponto[chave] as number) + quitadoDe(conta);
    ponto.aberto = (ponto.aberto as number) + abertoDe(conta, dialeto);
  }
  return { dados: meses, titulo: `Evolução Mensal — ${ano}`, modo: "mensal", ano };
}

/**
 * A pizza de categorias, somando sempre o VALOR CHEIO — quitada ou não.
 *
 * Passando de oito categorias, as SETE maiores ficam com o nome delas e o
 * resto vira uma fatia "Outros". Antes a pizza simplesmente cortava na oitava
 * e o que sobrava sumia do gráfico — e, pior, o percentual que o recharts
 * escreve em cada fatia era calculado sobre a soma das oito, então as fatias
 * somavam 100% de um total que não era o total (defeito 1.12). Com "Outros"
 * dentro dos dados, o percentual volta a ser sobre o total de verdade sem
 * precisar de conta nenhuma no desenho.
 *
 * Soma a MESMA base dos KPIs (`faturadoDe`), e não `valor_numero` cru: assim
 * a soma das fatias é exatamente "Total em Aberto + Total Recebido", e o topo
 * da tela fecha com o gráfico logo abaixo (defeito 1.1).
 */
export function montarCategorias<C extends ContaBase>(
  contas: C[],
  dialeto: DialetoDeContas<C>,
): PontoDeCategoria[] {
  const porCategoria = new Map<string, number>();
  for (const conta of contas) {
    const categoria = conta.categoria ?? "Sem categoria";
    porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + faturadoDe(conta, dialeto));
  }
  const ordenadas = Array.from(porCategoria.entries()).sort((a, b) => b[1] - a[1]);
  const emPonto = ([name, value]: [string, number]): PontoDeCategoria => ({ name, value });

  if (ordenadas.length <= FATIAS_DE_CATEGORIA) return ordenadas.map(emPonto);

  const nomeadas = ordenadas.slice(0, FATIAS_DE_CATEGORIA - 1);
  const resto = ordenadas
    .slice(FATIAS_DE_CATEGORIA - 1)
    .reduce((total, [, valor]) => total + valor, 0);
  return [...nomeadas.map(emPonto), { name: FATIA_DE_OUTROS, value: resto }];
}

/** O ranking de cliente/fornecedor, na mesma base dos KPIs, no máximo dez. */
export function montarContrapartes<C extends ContaBase>(
  contas: C[],
  dialeto: DialetoDeContas<C>,
): PontoDeContraparte[] {
  const porNome = new Map<string, number>();
  for (const conta of contas) {
    porNome.set(
      conta.cliente_nome,
      (porNome.get(conta.cliente_nome) ?? 0) + faturadoDe(conta, dialeto),
    );
  }
  return Array.from(porNome.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, BARRAS_DE_CONTRAPARTE)
    .map(([nome, valor]) => ({ nome, valor }));
}

// ── Tabela ─────────────────────────────────────────────────────────────────

/**
 * Caixa baixa e SEM ACENTO — a forma em que a busca compara os dois lados.
 *
 * `NFD` quebra cada letra acentuada em letra + sinal, e o intervalo
 * `\u0300-\u036f` é o dos sinais soltos que sobram. `Serviços` e `servicos`
 * viram a mesma coisa; `ç` vira `c` pelo mesmo caminho.
 */
function paraBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * A busca da tabela: nome da contraparte, categoria, nº do documento e
 * histórico. Não olha situação, valor, saldo, id nem data.
 *
 * Ignora acento nos DOIS lados: quem digita `servicos` acha `Serviços`, e
 * quem digita `Serviços` continua achando. Antes só baixava a caixa, e
 * teclado apressado não achava cliente nenhum com acento no nome (1.8).
 */
export function buscarNasContas<C extends ContaBase>(contas: C[], termo: string): C[] {
  if (!termo) return contas;
  const alvo = paraBusca(termo);
  const casa = (campo: string | null) => (campo ? paraBusca(campo).includes(alvo) : false);
  return contas.filter(
    (conta) =>
      casa(conta.cliente_nome) ||
      casa(conta.categoria) ||
      casa(conta.nro_documento) ||
      casa(conta.historico),
  );
}

/**
 * Ordena por qualquer campo da conta: número compara como número, o resto
 * compara com `localeCompare`. Devolve uma cópia — o `sort` do JS é estável e
 * destrutivo, e a lista de entrada é a do `useMemo` de quem chamou.
 *
 * Empate devolve 0 nos dois ramos, então o desempate é a ordem que a API
 * mandou, nas duas direções.
 */
export function ordenarContas<C extends ContaBase>(contas: C[], ordenacao: Ordenacao): C[] {
  const lista = [...contas];
  lista.sort((a, b) => {
    const valorA = (a as unknown as Record<string, unknown>)[ordenacao.campo] ?? "";
    const valorB = (b as unknown as Record<string, unknown>)[ordenacao.campo] ?? "";
    if (typeof valorA === "number" && typeof valorB === "number") {
      return ordenacao.direcao === "asc" ? valorA - valorB : valorB - valorA;
    }
    return ordenacao.direcao === "asc"
      ? String(valorA).localeCompare(String(valorB))
      : String(valorB).localeCompare(String(valorA));
  });
  return lista;
}

/**
 * O próximo estado da ordenação ao clicar num cabeçalho: o primeiro clique
 * numa coluna é sempre decrescente, inclusive na que já está ordenada.
 */
export function proximaOrdenacao(atual: Ordenacao, campo: string): Ordenacao {
  return {
    campo,
    direcao: atual.campo === campo && atual.direcao === "desc" ? "asc" : "desc",
  };
}

/**
 * A fatia de 15 que a tabela desenha.
 *
 * A contagem em frase e a janela de números moravam aqui; agora são do
 * `Pagination` do design system, que a tabela monta direto. O que sobrou é o
 * recorte, que continua sendo da tela porque é dele que sai também a
 * planilha.
 */
export function fatiaDaPagina<C>(lista: C[], pagina: number): C[] {
  return lista.slice((pagina - 1) * ITENS_POR_PAGINA, pagina * ITENS_POR_PAGINA);
}

// ── Planilha ───────────────────────────────────────────────────────────────

export interface FormatoDaPlanilha<C extends ContaBase> {
  /** Nome da aba e raiz do nome do arquivo. */
  aba: string;
  prefixoDoArquivo: string;
  /**
   * "Cliente" numa tela, "Fornecedor" na outra — o dado é o mesmo, o nome
   * dele no negócio não é.
   */
  rotuloDaContraparte: string;
  /**
   * As colunas que só existem numa das duas APIs, entre `Situação` e
   * `Cidade`: `Forma Pagamento`/`Portador` em Receber, `Ocorrência` em Pagar.
   */
  colunasProprias: (conta: C) => Record<string, unknown>;
}

/**
 * As linhas que vão para o `xlsx`, na ordem em que as colunas aparecem.
 *
 * Dinheiro sai como NÚMERO (para o Excel somar) e data sai como texto
 * `dd/mm/aaaa`, pelo `dataDeCalendario` de `src/lib/datas.ts` — o mesmo das
 * telas de Locação e Usuários. A `formatarData` daqui fatiava a string em `-`
 * e ignorava o `T`, então uma data com hora saía `18T10:00:00/01/2026`; e a
 * ausência virava o hífen `-`, enquanto o resto do sistema usa o travessão.
 *
 * `Situação` é sempre a que o Tiny mandou, e o vencimento vira uma coluna
 * PRÓPRIA (`Vencida`, com Sim/Não). Antes a `Situação` era trocada por
 * "Vencida" e quem abria a planilha não distinguia mais "pendente" de
 * "aberto" depois do vencimento (defeito 1.5). Coluna à parte, e não sufixo
 * dentro da `Situação`, porque no Excel é ela que se filtra e se agrupa:
 * "pendente · Vencida" viraria uma categoria nova em toda tabela dinâmica.
 */
export function linhasDaPlanilha<C extends ContaBase>(
  contas: C[],
  dialeto: DialetoDeContas<C>,
  formato: FormatoDaPlanilha<C>,
): Record<string, unknown>[] {
  return contas.map((conta) => ({
    "ID Tiny": conta.id_tiny,
    [formato.rotuloDaContraparte]: conta.cliente_nome,
    CPF_CNPJ: conta.cliente_cpf_cnpj ?? "",
    Categoria: conta.categoria ?? "",
    "Nº Documento": conta.nro_documento ?? "",
    Histórico: conta.historico ?? "",
    Valor: conta.valor_numero,
    Saldo: conta.saldo_numero,
    Emissão: dataDeCalendario(emissaoDe(conta, dialeto)),
    Vencimento: dataDeCalendario(conta.vencimento),
    Liquidação: dataDeCalendario(conta.liquidacao),
    Situação: conta.situacao ?? "",
    Vencida: conta.vencida ? "Sim" : "Não",
    ...formato.colunasProprias(conta),
    Cidade: conta.cliente_cidade ?? "",
    UF: conta.cliente_uf ?? "",
  }));
}

/**
 * `contas_a_receber_2026-08-31.xlsx`.
 *
 * A data é o DIA LOCAL. Saía de `toISOString` (UTC), e a partir das 21h de
 * Brasília o arquivo já ia arquivado com a data do dia seguinte (defeito 1.4).
 */
export function nomeDoArquivo(prefixo: string, agora: Date): string {
  return `${prefixo}_${diaLocal(agora)}.xlsx`;
}
