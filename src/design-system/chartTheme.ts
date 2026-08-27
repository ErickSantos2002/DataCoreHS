/** Tema unico de grafico, derivado dos tokens do design system.
 *
 * O recharts recebe cor por prop, nao por classe, e prop nao enxerga classe do
 * Tailwind. Por isso este modulo resolve a custom property em tempo de
 * execucao: o valor muda quando a classe `dark` entra no <html>, e o grafico
 * precisa acompanhar.
 *
 * Nove telas usam recharts. Sem este arquivo, cada uma escolhe a propria cor -
 * que e como os oito sistemas da H&S chegaram a quatro azuis diferentes.
 */

/** Le a custom property do documento, com reserva. A reserva importa: em jsdom
 *  o CSS dos tokens nao carrega e getPropertyValue devolve string vazia, e o
 *  recharts com cor vazia simplesmente nao pinta. */
function token(nome: string, reserva: string): string {
  if (typeof document === "undefined") return reserva;
  const valor = getComputedStyle(document.documentElement)
    .getPropertyValue(nome)
    .trim();
  return valor || reserva;
}

export const chartTheme = {
  get axis() {
    return { stroke: token("--text-muted", "#64748b"), fontSize: 12 };
  },
  get grid() {
    return { stroke: token("--border-color", "#e2e8f0") };
  },
  get tooltip() {
    return {
      backgroundColor: token("--surface", "#ffffff"),
      border: `1px solid ${token("--border-color", "#e2e8f0")}`,
      borderRadius: token("--radius-lg", "0.5rem"),
      color: token("--text-body", "#1e293b"),
    };
  },
  get series() {
    return [
      token("--color-primary-500", "#1f89ca"),
      token("--color-success-500", "#10b981"),
      token("--color-warning-500", "#f59e0b"),
      token("--color-info-500", "#3b82f6"),
      token("--color-danger-500", "#ef4444"),
      token("--color-primary-300", "#7bc0ea"),
    ];
  },
};

/** Cor da serie N. A setima volta ao comeco em vez de sumir. */
export function corDaSerie(indice: number): string {
  const rampa = chartTheme.series;
  return rampa[indice % rampa.length];
}
