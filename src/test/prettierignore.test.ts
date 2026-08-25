import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe(".prettierignore", () => {
  // src/design-system/ORIGEM.md e explicito: os arquivos de token sao copia
  // fiel do design system publicado, e "reformatar faria o proximo sync
  // divergir por espaco em branco". Essa regra so existe de verdade se a
  // pasta estiver fora do alcance do `prettier --write .` — e a linha
  // abaixo e a unica trava mecanica disso. Hoje ninguem confere que ela
  // esta la.
  it("mantem src/design-system fora do alcance do prettier --write", () => {
    const conteudo = readFileSync(".prettierignore", "utf8");
    const linhas = conteudo.split("\n").map((linha) => linha.trim());
    expect(linhas).toContain("src/design-system");
  });
});
