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
    // Os dez degraus, nao so uma amostra: uma transposicao em blue[50..300]
    // ou blue[700..900] passaria pela checagem de formato (regex hex abaixo)
    // sem que nada acusasse.
    expect(cores.blue[50]).toBe("#f1f9fe");
    expect(cores.blue[100]).toBe("#dbeefa");
    expect(cores.blue[200]).toBe("#b8ddf5");
    expect(cores.blue[300]).toBe("#7bc0ea");
    expect(cores.blue[400]).toBe("#47a6e1");
    expect(cores.blue[500]).toBe("#1f89ca");
    expect(cores.blue[600]).toBe("#1a71a8");
    expect(cores.blue[700]).toBe("#155984");
    expect(cores.blue[800]).toBe("#104565");
    expect(cores.blue[900]).toBe("#0b3047");
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
});

describe("fonte e raio", () => {
  it("saem de custom property", () => {
    expect(config.theme.extend.fontFamily.sans).toContain("var(--font-sans)");
    expect(config.theme.extend.borderRadius.lg).toBe("var(--radius-lg)");
  });
});

describe("tokens que os primitivos consomem", () => {
  it("foco, cortina e sombra saem de token", () => {
    expect(cores.focus).toBe("var(--focus-ring)");
    expect(cores.overlay).toBe("var(--overlay)");
    expect(config.theme.extend.boxShadow.xl).toBe("var(--shadow-xl)");
  });

  it("o balao de tooltip e escuro nos dois temas, de proposito", () => {
    expect(cores.tooltip.DEFAULT).toBe("var(--color-slate-900)");
    expect(cores.tooltip.fg).toBe("var(--color-white)");
  });

  it("o painel de login e escuro nos dois temas, de proposito", () => {
    // Excecao documentada do design system (Task 14): a tela de login
    // aparece antes de qualquer preferencia de tema ser aplicada, entao nao
    // pode reagir a ela. Hex literal, nao var(): o valor nao existe em
    // colors.css (nao e o mesmo tom de --bg-base nem --color-slate-900), e
    // colors.css nao e editado na Fase 1.
    expect(cores.login).toBe("#0a192f");
  });

  it("o toast tem token proprio de fundo, texto e borda", () => {
    expect(cores.toast.DEFAULT).toBe("var(--toast-bg)");
    expect(cores.toast.fg).toBe("var(--toast-color)");
    expect(cores.toast.border).toBe("var(--toast-border)");
  });

  it("as tintas semanticas e seus pares de texto existem", () => {
    for (const nome of ["primary", "success", "danger", "warning", "info", "neutral"]) {
      expect(cores.tint[nome]).toBe(`var(--tint-${nome})`);
      expect(cores["on-tint"][nome]).toBe(`var(--on-tint-${nome})`);
    }
  });

  it("as medidas da casca saem de token", () => {
    expect(config.theme.extend.width.sidebar).toBe("var(--sidebar-width)");
    expect(config.theme.extend.width["sidebar-collapsed"]).toBe("var(--sidebar-width-collapsed)");
    expect(config.theme.extend.height.topbar).toBe("var(--topbar-height)");
  });

  it("os raios de badge e chip existem", () => {
    expect(config.theme.extend.borderRadius.sm).toBe("var(--radius-sm)");
    expect(config.theme.extend.borderRadius.md).toBe("var(--radius-md)");
    expect(config.theme.extend.borderRadius.full).toBe("var(--radius-full)");
  });
});
