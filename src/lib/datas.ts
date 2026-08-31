/**
 * Data de calendário — o dia que a string diz, em qualquer fuso.
 *
 * Uma data que o backend manda como `2026-01-15` (ou `2026-01-15T09:30:00`)
 * é dia de calendário, não instante: não tem hora, não tem fuso, e o dia
 * certo é o que está escrito. Passar por `new Date(...)` estraga isso — o
 * ECMAScript lê a forma `YYYY-MM-DD` como meia-noite em UTC, e a oeste de
 * Greenwich meia-noite em UTC ainda é o dia anterior. Foi assim que a
 * planilha da Locação saiu com 09/07 onde a tela mostrava 10/07.
 *
 * Por isso a conversão é feita na própria string, sem `Date` nenhum. É a
 * mesma regra para as duas telas que já leem data assim (Locação, pela nota
 * fiscal; Usuários, pelo `created_at`), e o lugar para as próximas.
 */

/** `AAAA-MM-DD` no começo da string — o resto (hora, `Z`, offset) é ignorado. */
const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * `"2026-07-10"`, `"2026-07-10T14:57:00"` e `"2026-07-10T02:00:00Z"` viram
 * `"10/07/2026"` — em Brasília, em Tóquio ou em UTC, sempre o mesmo dia.
 *
 * Sem data, ou com uma string que não começa por uma data ISO, devolve o
 * travessão: a tabela mostra `—`, e não `Invalid Date` no meio do português.
 */
export function dataDeCalendario(data: string | null | undefined): string {
  if (!data) return "—";
  const casou = DATA_ISO.exec(data);
  if (!casou) return "—";
  const [, ano, mes, dia] = casou;
  return `${dia}/${mes}/${ano}`;
}
