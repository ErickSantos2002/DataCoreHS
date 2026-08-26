import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const arquivos = readdirSync("src", { recursive: true, encoding: "utf8" })
  .filter((c) => /\.tsx?$/.test(c) && !c.endsWith(".test.tsx") && !c.endsWith(".test.ts"))
  .map((c) => `src/${c}`);

describe("guarda de retorno ao usuario", () => {
  it("nenhuma tela usa alert() do navegador", () => {
    // alert() trava a aba, nao e estilizavel, nao respeita o tema e mostra o
    // dominio da aplicacao numa caixa do sistema operacional. O retorno do
    // sistema sai por Toast.
    const infratores: string[] = [];
    for (const caminho of arquivos) {
      const conteudo = readFileSync(caminho, "utf8");
      conteudo.split("\n").forEach((linha, i) => {
        if (/(?<![.\w])alert\s*\(/.test(linha)) {
          infratores.push(`${caminho}:${i + 1}`);
        }
      });
    }
    expect(infratores).toEqual([]);
  });
});
