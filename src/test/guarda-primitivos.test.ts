import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const RAIZ = "src/design-system/ui";

function primitivos(): string[] {
  return readdirSync(RAIZ, { recursive: true, encoding: "utf8" })
    .filter((c) => c.endsWith(".tsx") && !c.endsWith(".test.tsx"))
    .map((c) => `${RAIZ}/${c}`);
}

describe("contrato de port dos primitivos", () => {
  it("existe pelo menos um primitivo para o guarda cobrir", () => {
    expect(primitivos().length).toBeGreaterThan(0);
  });

  it("nenhum primitivo usa estilo inline", () => {
    // O original do design system usa style={{...}} porque roda fora do
    // Tailwind. Aqui tudo e classe: estilo inline nao tem :hover, nao tem
    // focus-visible, nao e responsivo e nao da para sobrescrever por classe.
    const infratores = primitivos().filter((c) =>
      /style=\{\{/.test(readFileSync(c, "utf8")),
    );
    expect(infratores).toEqual([]);
  });

  it("nenhum primitivo faz hover por estado de React", () => {
    // Hover e CSS. onMouseEnter para pintar e re-render a toa e quebra teclado.
    const infratores = primitivos().filter((c) =>
      /onMouseEnter|onMouseLeave/.test(readFileSync(c, "utf8")),
    );
    expect(infratores).toEqual([]);
  });

  it("nenhum primitivo usa a ponte de paleta", () => {
    // blue-* e slate-* sao andaime das telas velhas, nao vocabulario de
    // primitivo. Primitivo fala em action, surface, borda, conteudo.
    const infratores: string[] = [];
    for (const caminho of primitivos()) {
      const achados = readFileSync(caminho, "utf8").match(
        /\b[a-z:]*-(blue|slate|darkBlue)-?[0-9]*\b/g,
      );
      for (const a of achados ?? []) infratores.push(`${caminho}: ${a}`);
    }
    expect(infratores).toEqual([]);
  });

  it("todo primitivo interativo tem anel de foco visivel", () => {
    // O original nao tem foco nenhum; o checklist do design system exige
    // focus-visible com anel de 2px. E a unica coisa que o port acrescenta.
    const interativos = primitivos().filter((c) =>
      /<(button|input|textarea|select|a)\b/.test(readFileSync(c, "utf8")),
    );
    const semFoco = interativos.filter(
      (c) => !/focus-visible:ring-2/.test(readFileSync(c, "utf8")),
    );
    expect(semFoco).toEqual([]);
  });
});
