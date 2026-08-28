/** A regra de negócio da tela de Meta do trimestre.
 *
 * Fica fora do componente porque não é aparência: é a conta que decide o
 * bônus da equipe. Um arquivo próprio deixa a conta legível, testável pelo
 * que ela é, e difícil de "simplificar" sem querer no meio de um refactor
 * visual.
 */

/** Valor da chave META, como ele vem da tabela de configurações.
 *
 * A chave é texto livre, e ao longo do tempo foi digitada de três formas
 * diferentes — todas em produção, todas válidas:
 *
 *   "12666666.72"     ponto decimal, jeito americano
 *   "12.666.666,72"   milhar com ponto e decimal com vírgula, jeito brasileiro
 *   "12666666,72"     decimal com vírgula, sem separador de milhar
 *
 * Qualquer coisa que não vire número — vazio, ausente, prosa — vale zero, e
 * a tela mostra os três degraus zerados em vez de `NaN`.
 */
export function parseValor(raw?: string): number {
  if (!raw) return 0;
  let s = raw.trim();
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export interface DegrausDaMeta {
  /** A meta do trimestre: a META anual dividida por 4. */
  trimestre: number;
  /** Degrau que paga 55% de PL — 90% da meta do trimestre. */
  degrau55: number;
  /** Degrau que paga 85% de PL — 120% da meta do trimestre. */
  degrau85: number;
  /** Degrau que paga 100% de PL — 140% da meta do trimestre. */
  degrau100: number;
}

/** Divide a META ANUAL por 4 e abre os três degraus de bonificação.
 *
 * A divisão por 4 é a parte silenciosa: a configuração guarda a meta do ANO,
 * e esta tela mede o TRIMESTRE. Sem ela, a meta quadruplica e nenhum degrau
 * é alcançado nunca — sem erro, sem aviso, só um número errado na parede.
 */
export function degrausDaMeta(metaAnual?: string): DegrausDaMeta {
  const trimestre = parseValor(metaAnual) / 4;
  return {
    trimestre,
    degrau55: trimestre * 0.9,
    degrau85: trimestre * 1.2,
    degrau100: trimestre * 1.4,
  };
}

/** O degrau mais alto que o valor já alcançou — "55%", "85%", "100%" — ou
 *  `null` quando nem o primeiro foi batido. É o PL que a equipe leva se o
 *  trimestre fechar com esse valor. */
export function faixaAlcancada(
  valor: number,
  { degrau55, degrau85, degrau100 }: DegrausDaMeta,
): string | null {
  if (valor >= degrau100) return "100%";
  if (valor >= degrau85) return "85%";
  if (valor >= degrau55) return "55%";
  return null;
}

/** Os meses do trimestre em apuração, como vêm da chave MESES_ANALISE.
 *
 * Mesmo parse do DashboardContext, de propósito: é ele quem decide quais
 * meses entram no `total`, e a projeção precisa medir o MESMO período. Um
 * parse divergente aqui projetaria o faturamento de três meses sobre um
 * calendário de quatro. Também não deduplica pelo mesmo motivo — se a
 * configuração repetir um mês, o contexto soma o mês duas vezes, e os dias
 * têm que ser contados duas vezes para a razão continuar honesta.
 */
export function mesesDoTrimestre(raw?: string): number[] {
  return (raw?.split(",") ?? [])
    .map((m) => Number(m.trim()))
    .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12);
}

export interface ProjecaoDeFechamento {
  /** false quando não há como projetar sem inventar número. */
  disponivel: boolean;
  /** Quanto o trimestre fecha se o ritmo de hoje se mantiver. */
  projetado: number;
  /** Dias do trimestre já vividos (o mês corrente entra pelo dia de hoje). */
  diasDecorridos: number;
  /** Dias que o trimestre inteiro tem. */
  diasTotais: number;
}

export interface EntradaDaProjecao {
  /** O faturamento apurado do trimestre até agora. */
  realizado: number;
  /** Os meses do trimestre, 1-based, como em MESES_ANALISE. */
  meses: number[];
  /** Hoje. Parâmetro, e não `new Date()` aqui dentro, para o teste poder
   *  parar o relógio em qualquer dia do trimestre. */
  hoje: Date;
}

/** Projeta o fechamento do trimestre pelo ritmo até agora.
 *
 * A conta é uma regra de três sobre DIAS, não sobre meses fechados:
 *
 *     projetado = realizado × (dias do trimestre ÷ dias já decorridos)
 *
 * Contar mês fechado seria mais simples e estaria errado no dia 5 — o mês
 * corrente entraria inteiro no divisor com cinco dias de faturamento, e a
 * projeção despencaria toda virada de mês para subir de novo ao longo dela.
 * Pelo dia, o mês corrente entra pela fração que de fato já passou, e a
 * projeção é a mesma curva o mês todo.
 *
 * É uma projeção linear, e a tela diz isso com todas as letras ("no ritmo
 * de X dias de Y"): não pretende adivinhar sazonalidade, só responder
 * "mantido o ritmo, onde isto fecha?".
 *
 * Sem mês configurado, ou antes de o trimestre começar (zero dia decorrido),
 * não há ritmo para projetar — devolve `disponivel: false` em vez de um
 * número. Número inventado num painel de meta é pior que card faltando.
 */
export function projecaoDeFechamento({
  realizado,
  meses,
  hoje,
}: EntradaDaProjecao): ProjecaoDeFechamento {
  const ano = hoje.getFullYear();
  const mesDeHoje = hoje.getMonth() + 1;

  let diasTotais = 0;
  let diasDecorridos = 0;

  for (const mes of meses) {
    // Dia 0 do mês seguinte é o último dia deste mês — inclusive em fevereiro
    // bissexto, sem tabela de dias por mês escrita à mão.
    const diasNoMes = new Date(ano, mes, 0).getDate();
    diasTotais += diasNoMes;

    if (mes < mesDeHoje) diasDecorridos += diasNoMes;
    else if (mes === mesDeHoje) diasDecorridos += Math.min(hoje.getDate(), diasNoMes);
  }

  if (diasTotais === 0 || diasDecorridos === 0) {
    return { disponivel: false, projetado: 0, diasDecorridos, diasTotais };
  }

  return {
    disponivel: true,
    projetado: realizado * (diasTotais / diasDecorridos),
    diasDecorridos,
    diasTotais,
  };
}
