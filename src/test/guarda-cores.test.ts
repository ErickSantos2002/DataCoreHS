import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Login.tsx e exceção documentada: as duas ocorrencias dele sao fundo escuro
// deliberado nos dois temas (painel de login), nao dark: por variante. Saem
// daqui quando a Fase 1 migrar a tela.
const EXCECOES = ["src/pages/Login.tsx"];

const arquivosDeInteresse = readdirSync("src", {
  recursive: true,
  encoding: "utf8",
})
  .filter((caminho) => /\.(tsx|css)$/.test(caminho))
  .map((caminho) => `src/${caminho}`)
  .filter((caminho) => !caminho.startsWith("src/design-system/"))
  .filter((caminho) => !EXCECOES.includes(caminho));

describe("guarda de cor", () => {
  it("nenhuma classe Tailwind carrega hexadecimal arbitrario", () => {
    const infratores: string[] = [];
    for (const caminho of arquivosDeInteresse) {
      const conteudo = readFileSync(caminho, "utf8");
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
    const infratores: string[] = [];
    for (const caminho of arquivosDeInteresse) {
      const conteudo = readFileSync(caminho, "utf8");
      const achados = conteudo.match(
        /[a-z:]*-(surface|surface-base|surface-elevated|action|action-hover|action-tint|borda|conteudo)\/[0-9]{1,3}/g,
      );
      for (const achado of achados ?? []) infratores.push(`${caminho}: ${achado}`);
    }
    expect(infratores).toEqual([]);
  });
});
