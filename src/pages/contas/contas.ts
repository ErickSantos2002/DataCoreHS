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
 * Nada aqui corrige defeito. A migração de design system preservou o
 * comportamento linha a linha — inclusive o que o levantamento de 31/08/2026
 * marcou como errado (a mistura de saldo com valor cheio nos KPIs, o preset
 * de período que mistura fuso local com UTC, a busca que não tira acento).
 * Cada um desses pontos está marcado com `DEFEITO CONHECIDO` no lugar onde
 * mora, para que a correção da Fase 2 seja uma edição só, nos dois lados de
 * uma vez.
 */

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

/** No máximo oito fatias na pizza de categoria. */
export const FATIAS_DE_CATEGORIA = 8;

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

/**
 * `2026-01-18` → `18/01/2026`.
 *
 * DEFEITO CONHECIDO (2 da seção "uma tela só"): fatia a string em `-` e
 * ignora o `T`, então `2026-01-18T10:00:00` sai `18T10:00:00/01/2026`. Hoje a
 * API manda data pura e não aparece. `src/lib/datas.ts` já resolve isso — a
 * troca é da Fase 2, porque muda o que a planilha grava.
 */
export function formatarData(data: string | null): string {
  if (!data) return "-";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
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

export interface Periodo {
  inicio: string;
  fim: string;
}

/**
 * `AAAA-MM-DD` do dia LOCAL de um instante.
 *
 * `toISOString` daria o dia em UTC, e a oeste de Greenwich o dia em UTC vira
 * o de amanhã depois das 21h. Todo "hoje" desta tela é o dia local — é o dia
 * que a pessoa vê no relógio dela, e é o mesmo dia que `calcularKpis` usa
 * para decidir o que está vencido.
 */
export function diaLocal(instante: Date): string {
  const ano = instante.getFullYear();
  const mes = String(instante.getMonth() + 1).padStart(2, "0");
  const dia = String(instante.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/**
 * O intervalo que cada preset de período impõe às duas datas.
 *
 * `null` para "custom": o preset personalizado não mexe nas datas que a
 * pessoa digitou.
 *
 * As duas pontas saem do DIA LOCAL. Antes o início vinha de
 * `getFullYear`/`getMonth` (local) e o fim de `toISOString` (UTC), e perto da
 * meia-noite os dois discordavam: em Brasília, às 23h de 31/08, "Mês atual"
 * virava 01/08 a 01/09, e na virada do ano "Ano atual" virava o ano passado
 * inteiro (defeito 1.3).
 */
export function periodoDoPreset(preset: string, agora: Date): Periodo | null {
  if (preset === "custom") return null;

  const hoje = new Date(agora);

  switch (preset) {
    case "30dias": {
      const trintaDiasAtras = new Date(hoje);
      trintaDiasAtras.setDate(hoje.getDate() - 30);
      return { inicio: diaLocal(trintaDiasAtras), fim: diaLocal(hoje) };
    }
    // O mês INTEIRO, do dia 1 ao último. Terminava HOJE, e então uma conta
    // emitida dia 20 sumia do "mês atual" enquanto hoje fosse dia 15 — sem
    // que o rótulo dissesse que o preset não olha para a frente. "Ano atual"
    // sempre foi o ano inteiro; agora os dois combinam.
    case "mesAtual":
      return periodoDoMes(hoje.getFullYear(), hoje.getMonth());
    case "anoAtual":
      return { inicio: `${hoje.getFullYear()}-01-01`, fim: `${hoje.getFullYear()}-12-31` };
    case "todos":
    default:
      return { inicio: "", fim: "" };
  }
}

/** O ano inteiro, para o clique numa barra do gráfico anual. */
export function periodoDoAno(ano: string): Periodo {
  return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` };
}

/** O mês inteiro, para o clique numa barra do gráfico mensal. */
export function periodoDoMes(ano: number, indiceDoMes: number): Periodo {
  const mes = String(indiceDoMes + 1).padStart(2, "0");
  const ultimoDia = new Date(ano, indiceDoMes + 1, 0).getDate();
  return { inicio: `${ano}-${mes}-01`, fim: `${ano}-${mes}-${ultimoDia}` };
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
 * DEFEITO CONHECIDO (1.1): conta quitada entra pelo VALOR CHEIO e conta em
 * aberto entra pelo SALDO — grandezas diferentes somadas no mesmo painel. Uma
 * nota de R$ 1.000 com R$ 900 já recebidos aparece como R$ 100 em "aberto", e
 * os R$ 900 que entraram não aparecem em lugar nenhum.
 *
 * DEFEITO CONHECIDO (1.2): a média mensal soma as duas grandezas e divide
 * pelos meses distintos de EMISSÃO — nem de vencimento, nem de competência.
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
    if (quitada) totalQuitado += conta.valor_numero;
    else totalAberto += conta.saldo_numero;

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
      if (estaQuitada(conta.situacao, dialeto)) entrada.quitado += conta.valor_numero;
      else entrada.aberto += conta.saldo_numero;
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
    if (estaQuitada(conta.situacao, dialeto)) {
      ponto[chave] = (ponto[chave] as number) + conta.valor_numero;
    } else {
      ponto.aberto = (ponto.aberto as number) + conta.saldo_numero;
    }
  }
  return { dados: meses, titulo: `Evolução Mensal — ${ano}`, modo: "mensal", ano };
}

/**
 * A pizza de categorias, somando sempre o VALOR CHEIO — quitada ou não.
 *
 * DEFEITO CONHECIDO (1.1 e 1.12): soma grandeza diferente da que o painel de
 * KPIs soma, então o topo da tela e o gráfico logo abaixo não fecham entre
 * si; e corta em oito sem fatia "Outros", com o percentual das oito calculado
 * sobre um total que não é o total.
 */
export function montarCategorias<C extends ContaBase>(contas: C[]): PontoDeCategoria[] {
  const porCategoria = new Map<string, number>();
  for (const conta of contas) {
    const categoria = conta.categoria ?? "Sem categoria";
    porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + conta.valor_numero);
  }
  return Array.from(porCategoria.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, FATIAS_DE_CATEGORIA)
    .map(([name, value]) => ({ name, value }));
}

/** O ranking de cliente/fornecedor, também pelo valor cheio, no máximo dez. */
export function montarContrapartes<C extends ContaBase>(contas: C[]): PontoDeContraparte[] {
  const porNome = new Map<string, number>();
  for (const conta of contas) {
    porNome.set(conta.cliente_nome, (porNome.get(conta.cliente_nome) ?? 0) + conta.valor_numero);
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
 * `dd/mm/aaaa`.
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
    Emissão: formatarData(emissaoDe(conta, dialeto)),
    Vencimento: formatarData(conta.vencimento),
    Liquidação: formatarData(conta.liquidacao),
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
