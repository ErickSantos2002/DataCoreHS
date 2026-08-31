import { describe, expect, it } from "vitest";

import { dataDeCalendario } from "./datas";

/**
 * Roda a função com o fuso do processo trocado, e devolve o fuso anterior.
 *
 * Sem isto a asserção só valeria a oeste de Greenwich: em UTC,
 * `new Date("2026-01-15")` cai no próprio dia 15 e o defeito não aparece.
 * Um teste que só falha no fuso do Brasil passa no CI e não protege nada.
 */
function noFuso<T>(fuso: string, corpo: () => T): T {
  const anterior = process.env.TZ;
  process.env.TZ = fuso;
  try {
    return corpo();
  } finally {
    if (anterior === undefined) delete process.env.TZ;
    else process.env.TZ = anterior;
  }
}

/** Greenwich no meio, e os dois extremos do mundo de cada lado. */
const FUSOS = [
  "America/Sao_Paulo",
  "Pacific/Midway",
  "UTC",
  "Asia/Tokyo",
  "Pacific/Kiritimati",
];

describe("data de calendário", () => {
  it("data pura e data-hora dão o mesmo dia", () => {
    expect(dataDeCalendario("2026-07-10")).toBe("10/07/2026");
    expect(dataDeCalendario("2026-07-10T14:57:00")).toBe("10/07/2026");
  });

  it.each(FUSOS)("em %s, a data pura rende o dia que está escrito", (fuso) => {
    expect(noFuso(fuso, () => dataDeCalendario("2026-01-15"))).toBe("15/01/2026");
  });

  it.each(FUSOS)("em %s, a madrugada em UTC não anda para trás", (fuso) => {
    // `new Date("2026-01-15T02:00:00Z")` é 23h do dia 14 em Brasília. Aqui a
    // string manda: o dia de calendário é o que o backend escreveu.
    expect(noFuso(fuso, () => dataDeCalendario("2026-01-15T02:00:00Z"))).toBe(
      "15/01/2026",
    );
  });

  it("sem data, mostra o travessão em vez de string vazia", () => {
    expect(dataDeCalendario(null)).toBe("—");
    expect(dataDeCalendario(undefined)).toBe("—");
    expect(dataDeCalendario("")).toBe("—");
  });

  it("string que não é data ISO também vira travessão", () => {
    // Antes de virar módulo próprio, a versão da Locação devolvia a string
    // crua ("lixo" saía "lixo") e a de Usuários passava por `new Date`, que
    // escrevia "Invalid Date" na célula. Nenhuma das duas coisas é digna de
    // uma tabela em português.
    expect(dataDeCalendario("lixo")).toBe("—");
    expect(dataDeCalendario("15/01/2026")).toBe("—");
  });
});
