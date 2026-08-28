import type { NotaServico, NotaVenda } from "../services/notasapi";

/**
 * As regras que decidem o que conta como faturamento no painel de Meta.
 *
 * Elas moram fora do DashboardContext porque o contexto as aplica em mais de
 * um recorte — o ano corrente e o ano anterior — e cópias da mesma regra
 * divergem em silêncio: bastaria uma delas esquecer o filtro de marcador para
 * dois números da mesma tela pararem de fechar, sem erro nenhum. O trimestre
 * em apuração não é um terceiro recorte: ele são três posições da série do
 * ano corrente, e por isso não tem como discordar dela.
 *
 * Nada aqui é novo. É exatamente o filtro que o contexto já aplicava, movido
 * para um lugar onde dá para testar a regra pelo que ela é.
 */

/** O que a tabela de configurações diz que conta como faturamento. */
export interface RegrasDeFaturamento {
  /** CFOPs de natureza de operação que entram na conta (chave CFOP_VALIDOS). */
  cfopValidos: string[];
  /** Marcadores que tiram a nota da conta (chave MARCADORES_INVALIDOS). */
  marcadoresInvalidos: string[];
}

/** O CFOP dentro da natureza de operação, que vem como texto livre do Tiny
 *  ("5102 - Venda de mercadoria"). Sem quatro dígitos, string vazia — que
 *  não está em CFOP_VALIDOS e portanto não conta. */
export function extrairCFOP(texto: string | null | undefined): string {
  if (!texto) return "";
  const match = texto.match(/\b(\d{4})\b/);
  return match ? match[1] : "";
}

/** Uma nota de venda conta quando as quatro condições valem juntas: CFOP na
 *  lista, DANFE de fato emitida, nenhum marcador proibido e valor positivo.
 *  Nota cancelada, denegada ou de bonificação fica de fora — é isto que
 *  separa "nota emitida" de "faturamento". */
export function vendaConta(
  nota: NotaVenda,
  { cfopValidos, marcadoresInvalidos }: RegrasDeFaturamento,
): boolean {
  const naturezaOk = cfopValidos.includes(extrairCFOP(nota.natureza_operacao));
  const situacaoOk =
    (nota.descricao_situacao || "").toLowerCase().trim() === "emitida danfe";
  const marcadorOk =
    !nota.marcadores ||
    nota.marcadores.every((m) => {
      const desc = (m?.descricao || "").toLowerCase().trim();
      return !marcadoresInvalidos.includes(desc);
    });
  const valor = valorDaVenda(nota);
  return naturezaOk && situacaoOk && marcadorOk && !isNaN(valor) && valor > 0;
}

/** O valor da nota de venda. A API devolve ora número, ora string com ponto
 *  decimal — `parseFloat` sobre a string dá conta dos dois. */
export function valorDaVenda(nota: NotaVenda): number {
  return parseFloat(String(nota.valor_nota || "0"));
}

/** O valor da nota de serviço.
 *
 * Este endpoint devolve o valor em duas convenções diferentes na mesma base:
 * "1234.50" e "1.234,50". A vírgula é o sinal de que os pontos são separador
 * de milhar — sem este desvio, `parseFloat("1.234,50")` devolve 1,234 e a
 * nota de mil e duzentos reais entra na soma valendo um e pouco.
 */
export function valorDoServico(nota: NotaServico): number {
  const raw = String(nota.valor_servico || "0");
  const valor = raw.includes(",")
    ? parseFloat(raw.replace(/\./g, "").replace(",", "."))
    : parseFloat(raw);
  return isNaN(valor) ? 0 : valor;
}

/** O ano e o mês (1..12) de uma data de emissão "AAAA-MM-DD".
 *
 * `null` quando a data não vem no formato — assim uma nota sem data fica de
 * fora do gráfico em vez de cair em janeiro, que é o que `new Date("")`
 * faria de pior: um mês errado com cara de certo.
 */
export function emissaoEmAnoMes(
  data: string | null | undefined,
): { ano: number; mes: number } | null {
  const match = /^(\d{4})-(\d{2})/.exec(data ?? "");
  if (!match) return null;
  const mes = Number(match[2]);
  if (mes < 1 || mes > 12) return null;
  return { ano: Number(match[1]), mes };
}

/** Faturamento de cada mês de um ano, em doze posições — índice 0 é janeiro.
 *
 * Recebe as notas do ano INTEIRO, de uma requisição só, e as distribui pela
 * data de emissão. É o mesmo dado que já era buscado para o total do ano; a
 * quebra por mês sai de graça, sem uma requisição a mais.
 */
export function totaisPorMes({
  vendas,
  servicos,
  regras,
  ano,
}: {
  vendas: NotaVenda[];
  servicos: NotaServico[];
  regras: RegrasDeFaturamento;
  ano: number;
}): number[] {
  const totais = Array<number>(12).fill(0);

  for (const nota of vendas) {
    if (!vendaConta(nota, regras)) continue;
    const quando = emissaoEmAnoMes(nota.data_emissao);
    if (!quando || quando.ano !== ano) continue;
    totais[quando.mes - 1] += valorDaVenda(nota);
  }

  for (const nota of servicos) {
    const quando = emissaoEmAnoMes(nota.data_emissao);
    if (!quando || quando.ano !== ano) continue;
    totais[quando.mes - 1] += valorDoServico(nota);
  }

  return totais;
}

/** "Junho/2026" — o rótulo que a tela usa para o mês, com inicial maiúscula.
 *  Sai do `toLocaleString` e não de uma lista escrita à mão para o nome
 *  seguir o idioma configurado, como já era antes. */
export function rotuloDoMes(mes: number, ano: number): string {
  const nome = new Date(ano, mes - 1, 1).toLocaleString("pt-BR", {
    month: "long",
  });
  return `${nome[0].toUpperCase()}${nome.slice(1)}/${ano}`;
}
