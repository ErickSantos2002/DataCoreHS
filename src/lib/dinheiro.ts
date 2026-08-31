/**
 * Dinheiro que vem em texto da API do Tiny.
 *
 * A API entrega valor e saldo ora como número, ora como string — e a string
 * vem em dois formatos: o brasileiro (`1.234,56`) e o americano
 * (`1234.56`). A conversão mora aqui, e não copiada dentro de cada contexto,
 * porque o defeito abaixo existia idêntico nas duas cópias de Contas: corrigir
 * uma e esquecer a outra é exatamente como as gêmeas divergiram.
 */

/**
 * Ponto como separador de MILHAR: grupos de exatamente três dígitos, do
 * segundo grupo em diante — `1.234`, `1.234.567`, `-12.000`.
 *
 * É o que distingue `1.234` (mil duzentos e trinta e quatro) de `1.23` (um
 * real e vinte e três centavos): no formato americano o que vem depois do
 * ponto decimal tem uma ou duas casas, nunca três agrupadas até o fim.
 */
const PONTO_DE_MILHAR = /^-?\d{1,3}(\.\d{3})+$/;

/**
 * `"1.234,56"` → `1234.56` · `"1234.56"` → `1234.56` · `"1.234"` → `1234`.
 *
 * O terceiro caso é o defeito que este módulo existe para fechar: `1.234`
 * não tem vírgula, então o ponto era lido como separador decimal e a nota de
 * mil duzentos e trinta e quatro reais virava **R$ 1,23** na tela, no KPI e
 * na planilha. Era o pior defeito de dinheiro das duas telas de Contas.
 *
 * O que não é número — `null`, `""`, `"sem valor"` — vale zero, para a tela
 * mostrar R$ 0,00 em vez de `NaN`.
 */
export function converterParaNumero(
  valor: string | number | undefined | null,
): number {
  if (typeof valor === "number") return valor;
  if (!valor) return 0;

  const texto = valor.toString().replace(/R\$/g, "").replace(/\s/g, "");

  // Tem vírgula: é o formato brasileiro. O ponto só pode ser milhar.
  if (texto.includes(",")) {
    return parseFloat(texto.replace(/\./g, "").replace(",", ".")) || 0;
  }
  // Só ponto, em grupos de três: também é milhar, e não decimal.
  if (PONTO_DE_MILHAR.test(texto)) {
    return parseFloat(texto.replace(/\./g, "")) || 0;
  }
  // Sobra o formato americano, em que o ponto é mesmo o decimal.
  return parseFloat(texto) || 0;
}
