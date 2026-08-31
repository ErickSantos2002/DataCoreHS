import { describe, expect, it } from "vitest";

import { converterParaNumero } from "./dinheiro";

describe("converterParaNumero", () => {
  it("número já pronto passa direto", () => {
    expect(converterParaNumero(1500.5)).toBe(1500.5);
    expect(converterParaNumero(0)).toBe(0);
    expect(converterParaNumero(-50)).toBe(-50);
  });

  it("formato brasileiro: a vírgula é o decimal e o ponto é o milhar", () => {
    expect(converterParaNumero("1.234,56")).toBe(1234.56);
    expect(converterParaNumero("1.234.567,89")).toBe(1234567.89);
    expect(converterParaNumero("0,50")).toBe(0.5);
    expect(converterParaNumero("-1.000,25")).toBe(-1000.25);
  });

  it("formato americano: o ponto é o decimal", () => {
    expect(converterParaNumero("1234.56")).toBe(1234.56);
    expect(converterParaNumero("1000.00")).toBe(1000);
    expect(converterParaNumero("0.5")).toBe(0.5);
    expect(converterParaNumero("300")).toBe(300);
  });

  it("ponto de milhar SEM casa decimal é milhar, e não decimal", () => {
    // Este é o defeito que o módulo fecha: `1.234` não tem vírgula, então o
    // ponto era lido como decimal e a nota de mil duzentos e trinta e quatro
    // reais virava R$ 1,23 na tela, no KPI e na planilha.
    expect(converterParaNumero("1.234")).toBe(1234);
    expect(converterParaNumero("12.000")).toBe(12000);
    expect(converterParaNumero("1.234.567")).toBe(1234567);
    expect(converterParaNumero("-12.000")).toBe(-12000);
  });

  it("uma ou duas casas depois do ponto continuam sendo decimal", () => {
    // A régua é o tamanho do grupo: três dígitos agrupados é milhar, uma ou
    // duas casas é centavo.
    expect(converterParaNumero("1.23")).toBe(1.23);
    expect(converterParaNumero("1.2")).toBe(1.2);
    expect(converterParaNumero("1234.5")).toBe(1234.5);
  });

  it("o R$ e os espaços vêm junto sem atrapalhar", () => {
    expect(converterParaNumero("R$ 1.500,50")).toBe(1500.5);
    expect(converterParaNumero(" R$1.234 ")).toBe(1234);
  });

  it("o que não é número vale zero, e nunca NaN", () => {
    expect(converterParaNumero("")).toBe(0);
    expect(converterParaNumero(null)).toBe(0);
    expect(converterParaNumero(undefined)).toBe(0);
    expect(converterParaNumero("sem valor")).toBe(0);
  });
});
