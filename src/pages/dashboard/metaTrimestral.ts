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
