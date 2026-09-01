import type { ConfigCentroCusto } from "../../services/notasapi";

/**
 * A precificação por produto do Centro de Custo, sem React.
 *
 * É a conta mais densa da tela: rateia a NF de importação por unidade,
 * rateia o overhead da empresa pelo produto — trocando de base conforme
 * exista ou não quantidade planejada —, soma o custo unitário e daí tira
 * margem e projeção. O número sai daqui direto para a decisão de preço de
 * bafômetro.
 */

/** Os três produtos que a aba precifica, na ordem em que aparecem. */
export const PRODUTOS = [
  { chave: "BAFÔMETRO PHOEBUS", rotulo: "Phoebus" },
  { chave: "BAFÔMETRO PASSIVO - IBLOW 10 PRO", rotulo: "iBlow 10 PRO" },
  { chave: "BAFÔMETRO - MARK X PLUS", rotulo: "Mark X Plus" },
] as const;

export type ProdutoKey = (typeof PRODUTOS)[number]["chave"];

export interface ServicoAduaneiro {
  mes_ano: string;
  valor: string;
  nf: string;
}

export interface CustoDireto {
  descricao: string;
  valor: string;
}

/** O formulário como a pessoa digita: tudo texto, nada convertido ainda. */
export interface FormularioDeCusto {
  servicos_aduaneiros: ServicoAduaneiro[];
  /** % da NF que pertence a este produto (bloco 1). */
  participacao_pct: string;
  unidades_importadas: string;
  custos_diretos: CustoDireto[];
  estimativa_custos_variaveis_anual: string;
  /** % do estoque anual que este produto representa (bloco 3). */
  participacao_overhead_pct: string;
  /** Reserva de quando não há quantidade planejada. Não tem campo na tela. */
  unidades_lote_mes: string;
  quantidade_planejada: string;
  preco_unitario_planejado: string;
}

export function formularioVazio(): FormularioDeCusto {
  return {
    servicos_aduaneiros: [],
    participacao_pct: "",
    unidades_importadas: "",
    custos_diretos: [],
    estimativa_custos_variaveis_anual: "",
    participacao_overhead_pct: "",
    unidades_lote_mes: "",
    quantidade_planejada: "",
    preco_unitario_planejado: "",
  };
}

/**
 * Lê um número digitado no formulário.
 *
 * ⚠️ NÃO é o `converterParaNumero` de `src/lib/dinheiro.ts`, e a diferença é
 * um defeito: sem vírgula no texto o ponto é lido como decimal. Como a
 * máscara de dinheiro ESCREVE ponto de milhar, quem digita `1234567` sem
 * centavos vê "1.234.567" no campo e entra com R$ 1,23 na conta. O
 * comportamento está preservado de propósito — o conserto é a fase seguinte,
 * e está fixado em teste para ser deliberado.
 *
 * Quem exercita o ramo do ponto decimal de verdade é o campo de percentual,
 * que não tem máscara e volta do banco como "13.9".
 */
export function lerNumero(texto: string): number {
  if (!texto) return 0;
  if (texto.includes(",")) {
    return parseFloat(texto.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return parseFloat(texto) || 0;
}

/** Número gravado no banco → texto em pt-BR para o campo de dinheiro. */
export function escreverDinheiro(valor: unknown): string {
  if (valor == null || valor === "") return "";
  const numero = typeof valor === "number" ? valor : parseFloat(String(valor));
  if (isNaN(numero)) return "";
  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** `032026` → `03/2026`. Para em seis dígitos: mês e ano, nada mais. */
export function mascaraDeData(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 6);
  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
}

/** `1234567` → `1.234.567`. Preserva o que vier depois da vírgula. */
export function mascaraDeDinheiro(valor: string): string {
  const limpo = valor.replace(/[^\d,]/g, "");
  const [inteiro = "", decimal] = limpo.split(",");
  const agrupado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimal !== undefined ? `${agrupado},${decimal}` : agrupado;
}

/**
 * Dinheiro da aba Centro de Custo.
 *
 * ⚠️ NÃO é o `formatarMoeda` da tela, que devolve travessão para zero: aqui
 * zero é custo apurado, e travessão no lugar de "R$ 0,00" esconderia o
 * resultado de uma conta que de fato deu zero.
 */
export function formatarDinheiro(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Travessão para o que ainda não dá para calcular. */
export function formatarDinheiroOuTraco(valor: number | null): string {
  return valor === null ? "—" : formatarDinheiro(valor);
}

/**
 * O que a tela grava em `config_json`.
 *
 * É mais estreito do que o `ConfigCentroCusto` que a API declara — lá tudo é
 * opcional e aceita texto, porque é o que o endpoint pode devolver; daqui só
 * sai número ou `null`.
 */
export interface ConfiguracaoDeCusto {
  servicos_aduaneiros: { mes_ano: string; valor: number; nf: string }[];
  participacao_pct: number;
  unidades_importadas: number;
  custos_diretos: { descricao: string; valor: number }[];
  estimativa_custos_variaveis_anual: number;
  participacao_overhead_pct: number | null;
  unidades_lote_mes: number | null;
  quantidade_planejada: number | null;
  preco_unitario_planejado: number | null;
}

/**
 * Configuração gravada → formulário.
 *
 * Dinheiro volta formatado em pt-BR; percentual e quantidade voltam com
 * `String()` cru, e por isso chegam com ponto decimal ("13.9"). A assimetria
 * é a de hoje e está fixada em teste — quem for mexer precisa saber que os
 * dois grupos de campo não passam pelo mesmo conversor.
 */
export function formularioDaConfiguracao(
  config: ConfigCentroCusto | null | undefined,
): FormularioDeCusto {
  if (!config) return formularioVazio();
  const texto = (valor: unknown) => (valor != null ? String(valor) : "");
  return {
    servicos_aduaneiros: (config.servicos_aduaneiros ?? []).map((servico) => ({
      mes_ano: servico.mes_ano ?? "",
      valor: escreverDinheiro(servico.valor),
      nf: servico.nf ?? "",
    })),
    participacao_pct: texto(config.participacao_pct),
    unidades_importadas: texto(config.unidades_importadas),
    custos_diretos: (config.custos_diretos ?? []).map((custo) => ({
      descricao: custo.descricao ?? "",
      valor: escreverDinheiro(custo.valor),
    })),
    estimativa_custos_variaveis_anual: escreverDinheiro(
      config.estimativa_custos_variaveis_anual,
    ),
    participacao_overhead_pct: texto(config.participacao_overhead_pct),
    unidades_lote_mes: texto(config.unidades_lote_mes),
    quantidade_planejada: texto(config.quantidade_planejada),
    preco_unitario_planejado: escreverDinheiro(config.preco_unitario_planejado),
  };
}

/**
 * Formulário → configuração para gravar.
 *
 * Os quatro campos opcionais viram `null` quando zerados, e não `0`: a API
 * distingue "não informado" de "informado como zero", e gravar zero faria a
 * próxima carga trazer um zero que ninguém digitou.
 */
export function configuracaoDoFormulario(
  form: FormularioDeCusto,
): ConfiguracaoDeCusto {
  return {
    servicos_aduaneiros: form.servicos_aduaneiros.map((servico) => ({
      mes_ano: servico.mes_ano,
      valor: lerNumero(servico.valor),
      nf: servico.nf,
    })),
    participacao_pct: lerNumero(form.participacao_pct),
    unidades_importadas: lerNumero(form.unidades_importadas),
    custos_diretos: form.custos_diretos.map((custo) => ({
      descricao: custo.descricao,
      valor: lerNumero(custo.valor),
    })),
    estimativa_custos_variaveis_anual: lerNumero(
      form.estimativa_custos_variaveis_anual,
    ),
    participacao_overhead_pct: lerNumero(form.participacao_overhead_pct) || null,
    unidades_lote_mes: lerNumero(form.unidades_lote_mes) || null,
    quantidade_planejada: lerNumero(form.quantidade_planejada) || null,
    preco_unitario_planejado: lerNumero(form.preco_unitario_planejado) || null,
  };
}

/** O que o sistema já sabe do produto, somado das notas do ano. */
export interface ResumoDoSistema {
  receita: number;
  quantidade: number;
}

export interface CalculoDeCusto {
  totalAduaneiro: number;
  /** Rateio da NF por unidade; `null` sem participação ou sem unidades. */
  custoAduaneiroPorUn: number | null;
  totalDireto: number;
  estimativaAnual: number;
  /** Rateio do overhead por unidade; `null` sem base para dividir. */
  overheadPorUn: number | null;
  custoTotalPorUn: number;
  /** Preço médio realizado, das notas do ano. */
  ticketMedioSistema: number | null;
  /** O preço que vale na conta: o manual, se houver; senão o do sistema. */
  ticketMedio: number | null;
  usandoQtdManual: boolean;
  usandoPrecoManual: boolean;
  qtdPlanejada: number;
  precoPlanejado: number;
  margemPorUn: number | null;
  margemPct: number | null;
  /** Quantidade que a projeção usa: a planejada, ou a vendida. */
  qtdEfetiva: number;
  receitaProjetada: number | null;
  margemTotalProjetada: number | null;
}

/**
 * O rateio do overhead.
 *
 * Com quantidade planejada, divide o custo fixo ANUAL pelas unidades do ano.
 * Sem ela, cai para a base MENSAL dividida pelo lote do mês — caminho que só
 * existe por configuração gravada, porque `unidades_lote_mes` não tem campo
 * na tela. Sem nenhuma das duas bases não há rateio: `null`, e não `NaN`.
 */
function ratearOverhead(
  estimativaAnual: number,
  pctOverhead: number,
  usandoQtdManual: boolean,
  qtdPlanejada: number,
  unidadesLote: number,
): number | null {
  if (estimativaAnual <= 0 || pctOverhead <= 0) return null;
  if (usandoQtdManual) return (estimativaAnual * pctOverhead) / qtdPlanejada;
  if (unidadesLote <= 0) return null;
  return ((estimativaAnual / 12) * pctOverhead) / unidadesLote;
}

export function calcularCusto(
  form: FormularioDeCusto,
  resumo: ResumoDoSistema | null,
): CalculoDeCusto {
  const totalAduaneiro = form.servicos_aduaneiros.reduce(
    (soma, servico) => soma + lerNumero(servico.valor),
    0,
  );
  const pctAduaneiro = lerNumero(form.participacao_pct) / 100;
  const unidadesImportadas = lerNumero(form.unidades_importadas);
  const custoAduaneiroPorUn =
    pctAduaneiro > 0 && unidadesImportadas > 0
      ? (totalAduaneiro * pctAduaneiro) / unidadesImportadas
      : null;

  const totalDireto = form.custos_diretos.reduce(
    (soma, custo) => soma + lerNumero(custo.valor),
    0,
  );

  const estimativaAnual = lerNumero(form.estimativa_custos_variaveis_anual);
  const pctOverhead = lerNumero(form.participacao_overhead_pct) / 100;
  const qtdPlanejada = lerNumero(form.quantidade_planejada);
  const precoPlanejado = lerNumero(form.preco_unitario_planejado);
  const usandoQtdManual = qtdPlanejada > 0;
  const usandoPrecoManual = precoPlanejado > 0;

  const overheadPorUn = ratearOverhead(
    estimativaAnual,
    pctOverhead,
    usandoQtdManual,
    qtdPlanejada,
    lerNumero(form.unidades_lote_mes),
  );

  const custoTotalPorUn =
    (custoAduaneiroPorUn ?? 0) + totalDireto + (overheadPorUn ?? 0);

  const ticketMedioSistema =
    resumo && resumo.quantidade > 0 ? resumo.receita / resumo.quantidade : null;
  const ticketMedio = usandoPrecoManual ? precoPlanejado : ticketMedioSistema;

  // `custoTotalPorUn > 0`: sem custo apurado, "margem = preço" seria uma
  // margem de 100% que ninguém calculou.
  const margemPorUn =
    ticketMedio !== null && custoTotalPorUn > 0
      ? ticketMedio - custoTotalPorUn
      : null;
  const margemPct =
    margemPorUn !== null && ticketMedio ? (margemPorUn / ticketMedio) * 100 : null;

  const qtdEfetiva = usandoQtdManual ? qtdPlanejada : (resumo?.quantidade ?? 0);

  return {
    totalAduaneiro,
    custoAduaneiroPorUn,
    totalDireto,
    estimativaAnual,
    overheadPorUn,
    custoTotalPorUn,
    ticketMedioSistema,
    ticketMedio,
    usandoQtdManual,
    usandoPrecoManual,
    qtdPlanejada,
    precoPlanejado,
    margemPorUn,
    margemPct,
    qtdEfetiva,
    receitaProjetada:
      ticketMedio !== null && qtdEfetiva > 0 ? ticketMedio * qtdEfetiva : null,
    margemTotalProjetada:
      margemPorUn !== null && qtdEfetiva > 0 ? margemPorUn * qtdEfetiva : null,
  };
}
