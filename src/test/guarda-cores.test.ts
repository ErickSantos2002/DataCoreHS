import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const config = require("../../tailwind.config.js");

// Login.tsx e exceção documentada: as duas ocorrencias dele sao fundo escuro
// deliberado nos dois temas (painel de login), nao dark: por variante. Saem
// daqui quando a Fase 1 migrar a tela.
const EXCECOES = ["src/pages/Login.tsx"];

// O content do tailwind.config.js varre "./index.html" e
// "./src/**/*.{js,ts,jsx,tsx}" — alem de .css, que carrega classe custom via
// @apply. O guarda tem que cobrir a mesma lista, senao o vao existe mesmo
// que hoje esteja limpo: um hex arbitrario num .ts, .js ou .jsx passaria
// batido, e o proprio index.html nunca era olhado.
const arquivosDeInteresse = readdirSync("src", {
  recursive: true,
  encoding: "utf8",
})
  .filter((caminho) => /\.(tsx|ts|jsx|js|css)$/.test(caminho))
  .map((caminho) => `src/${caminho}`)
  .filter((caminho) => !caminho.startsWith("src/design-system/tokens/"))
  .filter((caminho) => caminho !== "src/design-system/styles.css")
  .filter((caminho) => !EXCECOES.includes(caminho))
  .concat("index.html");

/** Remove comentário de linha e de bloco antes de procurar infrator.
 *  Sem isto, um comentário que explique a rampa ("os degraus 100/700") é
 *  lido como modificador de opacidade e o guarda acusa prosa. */
function semComentarios(conteudo: string): string {
  return conteudo
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Nomes de classe cujo valor sai de var(--...) no tailwind.config.js.
 *  Derivado do config, e nao escrito a mao, para nao ficar desatualizado
 *  quando um token novo entrar. A ponte de paleta (blue, slate, darkBlue)
 *  fica de fora sozinha: ela guarda hexadecimal, e hexadecimal aceita alfa. */
function tokensQueSaemDeVar(): string[] {
  const nomes: string[] = [];
  for (const [nome, valor] of Object.entries(config.theme.extend.colors)) {
    if (typeof valor === "string") {
      if (valor.startsWith("var(")) nomes.push(nome);
      continue;
    }
    for (const [sufixo, v] of Object.entries(valor as Record<string, string>)) {
      if (typeof v === "string" && v.startsWith("var(")) {
        nomes.push(sufixo === "DEFAULT" ? nome : `${nome}-${sufixo}`);
      }
    }
  }
  return nomes;
}

describe("guarda de cor", () => {
  it("nenhuma classe Tailwind carrega hexadecimal arbitrario", () => {
    const infratores: string[] = [];
    for (const caminho of arquivosDeInteresse) {
      const conteudo = semComentarios(readFileSync(caminho, "utf8"));
      for (const achado of conteudo.match(/\[#[0-9a-fA-F]{3,8}\]/g) ?? []) {
        infratores.push(`${caminho}: ${achado}`);
      }
    }
    expect(infratores).toEqual([]);
  });

  it("nenhuma classe de token carrega modificador de opacidade", () => {
    // Classe de token sai de var(--...), e o Tailwind nao aplica alfa sobre
    // var() que guarda hexadecimal: a regra simplesmente nao e gerada e o
    // elemento cai na regra do outro tema. Foi assim que o header ficou
    // branco no escuro depois do codemod.
    const tokens = tokensQueSaemDeVar();
    expect(tokens.length).toBeGreaterThan(10); // o guarda so vale se achou tokens

    const padrao = new RegExp(
      `[a-z:]*-(?:${tokens.sort((a, b) => b.length - a.length).join("|")})\\/[0-9]{1,3}`,
      "g",
    );

    const infratores: string[] = [];
    for (const caminho of arquivosDeInteresse) {
      const conteudo = semComentarios(readFileSync(caminho, "utf8"));
      for (const achado of conteudo.match(padrao) ?? []) {
        infratores.push(`${caminho}: ${achado}`);
      }
    }
    expect(infratores).toEqual([]);
  });
});
