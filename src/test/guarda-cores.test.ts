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
});
