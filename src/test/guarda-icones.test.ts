import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Nasce restrito a src/components/ de proposito: o ultimo icone remoto vive em
// src/pages/Login.tsx e so sai na Task 14, que amplia esta varredura para src/
// inteiro. Suite que fica vermelha de proposito e suite que ninguem olha.
const telas = readdirSync("src/components", { recursive: true, encoding: "utf8" })
  .filter((c) => c.endsWith(".tsx") && !c.endsWith(".test.tsx"))
  .map((c) => `src/components/${c}`);

describe("guarda de icones", () => {
  it("nenhum icone vem de servidor remoto", () => {
    // Icone por <img src="https://img.icons8.com/..."> poe a rede no caminho da
    // navegacao, muda de cor por querystring e some se o servico cair. Icone e
    // componente: lucide-react, que ja e dependencia.
    const infratores: string[] = [];
    for (const caminho of telas) {
      const conteudo = readFileSync(caminho, "utf8");
      conteudo.split("\n").forEach((linha, i) => {
        if (/img\.icons8\.com/.test(linha)) infratores.push(`${caminho}:${i + 1}`);
      });
    }
    expect(infratores).toEqual([]);
  });
});
