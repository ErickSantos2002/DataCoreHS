import { describe, expect, it } from "vitest";

import {
  degrausDaMeta,
  faixaAlcancada,
  mesesDoTrimestre,
  projecaoDeFechamento,
} from "./metaTrimestral";

/**
 * A conta da Meta do trimestre, testada como conta.
 *
 * O arquivo de tela (`Dashboard.test.tsx`) já fixa o parse da META, a
 * divisão por 4 e os três degraus pelo que a tela mostra. Aqui ficam as
 * regras que a tela não consegue exercitar sozinha porque dependem do
 * calendário — a projeção de fechamento, sobretudo. Projeção errada num
 * painel de meta não quebra nada: só mostra um número plausível e errado
 * por meses a fio.
 */

/** Junho (30) + julho (31) + agosto (31) — o trimestre em uso hoje. */
const TRIMESTRE = [6, 7, 8];
const DIAS_DO_TRIMESTRE = 92;

describe("meses do trimestre", () => {
  it("lê a lista da chave MESES_ANALISE, com ou sem espaço", () => {
    expect(mesesDoTrimestre("6,7,8")).toEqual([6, 7, 8]);
    expect(mesesDoTrimestre(" 6 , 7 , 8 ")).toEqual([6, 7, 8]);
  });

  it("descarta o que não é mês do calendário", () => {
    // 0, 13 e "abril" nao sao mes 1..12 — entrariam no calendario da
    // projecao como dia nenhum, ou como um mes que nao existe.
    expect(mesesDoTrimestre("0,6,13,abril,7")).toEqual([6, 7]);
    expect(mesesDoTrimestre("")).toEqual([]);
    expect(mesesDoTrimestre(undefined)).toEqual([]);
  });
});

describe("faixa de PL alcançada", () => {
  const degraus = degrausDaMeta("12000000"); // 2,7 mi / 3,6 mi / 4,2 mi

  it.each([
    ["abaixo do primeiro degrau", 2_699_999, null],
    ["exatamente no primeiro degrau", 2_700_000, "55%"],
    ["entre o primeiro e o segundo", 3_000_000, "55%"],
    ["exatamente no segundo degrau", 3_600_000, "85%"],
    ["exatamente no terceiro degrau", 4_200_000, "100%"],
    ["acima do terceiro degrau", 9_000_000, "100%"],
  ])("com %s devolve %s", (_rotulo, valor, esperado) => {
    expect(faixaAlcancada(valor as number, degraus)).toBe(esperado);
  });
});

describe("projeção de fechamento do trimestre", () => {
  it("projeta pela regra de três sobre os dias do trimestre", () => {
    // 31/07: junho inteiro (30) + julho inteiro (31) = 61 dias de 92.
    // R$ 1.220.000 em 61 dias sao R$ 20.000/dia; 92 dias fecham 1.840.000.
    const projecao = projecaoDeFechamento({
      realizado: 1_220_000,
      meses: TRIMESTRE,
      hoje: new Date(2026, 6, 31),
    });

    expect(projecao.disponivel).toBe(true);
    expect(projecao.diasDecorridos).toBe(61);
    expect(projecao.diasTotais).toBe(DIAS_DO_TRIMESTRE);
    expect(projecao.projetado).toBeCloseTo(1_840_000, 2);
  });

  it("não muda de patamar na virada do mês, mantido o mesmo ritmo diário", () => {
    // Esta e a razao de a conta ser por DIA e nao por mes fechado. Contando
    // mes fechado, no dia 1º de agosto o divisor pularia de 2 para 3 meses
    // enquanto o faturamento de agosto ainda e de um dia — e a projecao
    // despencaria toda virada de mes para subir de novo ao longo dela.
    const emJulho = projecaoDeFechamento({
      realizado: 61 * 20_000,
      meses: TRIMESTRE,
      hoje: new Date(2026, 6, 31),
    });
    const emAgosto = projecaoDeFechamento({
      realizado: 62 * 20_000,
      meses: TRIMESTRE,
      hoje: new Date(2026, 7, 1),
    });

    expect(emAgosto.projetado).toBeCloseTo(emJulho.projetado, 2);
  });

  it("com o trimestre inteiro decorrido, a projeção é o próprio realizado", () => {
    const projecao = projecaoDeFechamento({
      realizado: 4_000_000,
      meses: TRIMESTRE,
      hoje: new Date(2026, 7, 31),
    });

    expect(projecao.diasDecorridos).toBe(DIAS_DO_TRIMESTRE);
    expect(projecao.projetado).toBe(4_000_000);
  });

  it("depois que o trimestre acaba, continua sendo o próprio realizado", () => {
    const projecao = projecaoDeFechamento({
      realizado: 4_000_000,
      meses: TRIMESTRE,
      hoje: new Date(2026, 10, 15),
    });

    expect(projecao.diasDecorridos).toBe(DIAS_DO_TRIMESTRE);
    expect(projecao.projetado).toBe(4_000_000);
  });

  it("no primeiro dia do trimestre, projeta sobre um dia só", () => {
    const projecao = projecaoDeFechamento({
      realizado: 50_000,
      meses: TRIMESTRE,
      hoje: new Date(2026, 5, 1),
    });

    expect(projecao.diasDecorridos).toBe(1);
    expect(projecao.projetado).toBeCloseTo(50_000 * DIAS_DO_TRIMESTRE, 2);
  });

  it("antes de o trimestre começar, não há ritmo — e não há projeção", () => {
    const projecao = projecaoDeFechamento({
      realizado: 0,
      meses: TRIMESTRE,
      hoje: new Date(2026, 4, 20),
    });

    expect(projecao.disponivel).toBe(false);
    expect(projecao.projetado).toBe(0);
    expect(projecao.diasDecorridos).toBe(0);
  });

  it("sem mês configurado, não há trimestre para projetar", () => {
    const projecao = projecaoDeFechamento({
      realizado: 1_000_000,
      meses: [],
      hoje: new Date(2026, 6, 31),
    });

    expect(projecao.disponivel).toBe(false);
    expect(projecao.projetado).toBe(0);
    expect(projecao.diasTotais).toBe(0);
  });

  it("realizado zero projeta zero, sem virar NaN", () => {
    const projecao = projecaoDeFechamento({
      realizado: 0,
      meses: TRIMESTRE,
      hoje: new Date(2026, 6, 31),
    });

    expect(projecao.disponivel).toBe(true);
    expect(projecao.projetado).toBe(0);
  });

  it("conta fevereiro pelo ano: 29 dias em ano bissexto, 28 no comum", () => {
    // O trimestre nao e sempre jun/jul/ago — MESES_ANALISE e configuravel.
    const bissexto = projecaoDeFechamento({
      realizado: 1_000_000,
      meses: [1, 2, 3],
      hoje: new Date(2028, 2, 31),
    });
    const comum = projecaoDeFechamento({
      realizado: 1_000_000,
      meses: [1, 2, 3],
      hoje: new Date(2026, 2, 31),
    });

    expect(bissexto.diasTotais).toBe(91); // 31 + 29 + 31
    expect(comum.diasTotais).toBe(90); //   31 + 28 + 31
  });

  it("a projeção nunca fica abaixo do que já foi realizado", () => {
    for (const dia of [1, 7, 15, 30]) {
      const projecao = projecaoDeFechamento({
        realizado: 3_333_333,
        meses: TRIMESTRE,
        hoje: new Date(2026, 6, dia),
      });
      expect(projecao.projetado).toBeGreaterThanOrEqual(3_333_333);
    }
  });
});
