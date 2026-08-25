import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const config = require("../../tailwind.config.js");
const cores = config.theme.extend.colors;

describe("classes de token", () => {
  it("acao, superficie, borda e conteudo saem de custom property", () => {
    expect(cores.action.DEFAULT).toBe("var(--action)");
    expect(cores.surface.DEFAULT).toBe("var(--surface)");
    expect(cores.surface.base).toBe("var(--bg-base)");
    expect(cores.borda.DEFAULT).toBe("var(--border-color)");
    expect(cores.conteudo.DEFAULT).toBe("var(--text-body)");
  });

  it("a rampa primaria sai de custom property", () => {
    expect(cores.primary[600]).toBe("var(--color-primary-600)");
  });
});

describe("ponte de paleta", () => {
  it("blue-* aponta para a rampa do design system, em hexadecimal", () => {
    expect(cores.blue[600]).toBe("#1a71a8");
    expect(cores.blue[500]).toBe("#1f89ca");
    expect(cores.blue[400]).toBe("#47a6e1");
  });

  it("usa hexadecimal e nao var(), porque ha classes com opacidade", () => {
    // dark:bg-blue-900/40 existe no JSX. O Tailwind nao aplica alfa sobre
    // um var() que guarda hexadecimal - a classe sairia sem cor.
    for (const degrau of Object.values(cores.blue)) {
      expect(degrau).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("slate-700/800/900 apontam para as superficies escuras do DS", () => {
    expect(cores.slate[900]).toBe("#0d1b2a");
    expect(cores.slate[800]).toBe("#132238");
    expect(cores.slate[700]).toBe("#1a2f4a");
  });

  it("darkBlue sobrevive como alias depreciado", () => {
    expect(cores.darkBlue).toBe("#132238");
  });
});

describe("fonte e raio", () => {
  it("saem de custom property", () => {
    expect(config.theme.extend.fontFamily.sans).toContain("var(--font-sans)");
    expect(config.theme.extend.borderRadius.lg).toBe("var(--radius-lg)");
  });
});
