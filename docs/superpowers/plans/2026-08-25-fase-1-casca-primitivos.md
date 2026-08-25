# Fase 1 — Casca e primitivos: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao DataCoreHS uma biblioteca de primitivos própria, portada do Design System H&S, mais a casca do app refeita — para que a Fase 3 tenha para onde migrar cada tela.

**Architecture:** Os primitivos do design system são escritos com estilo inline e hover em JavaScript, porque precisam renderizar sozinhos no canvas do Claude Design. Aqui eles são **portados**, não copiados: viram `.tsx` + Tailwind lendo os tokens que a Fase 0 instalou, preservando exatamente a API declarada no `.d.ts` de cada um. A casca (`Header` + `Sidebar`) é reescrita como `AppShell`, e é nela que a inversão de papéis dos tokens deixada pela Fase 0 é desfeita.

**Tech Stack:** React 19, TypeScript 5.8, Vite 7, Tailwind CSS 3.4.17, Vitest, React Testing Library, lucide-react, recharts.

**Spec:** `docs/superpowers/specs/2026-08-25-datacorehs-design-system-design.md`

## Global Constraints

- **Branch:** todo o trabalho em `ds/fase-1-primitivos`. Nada vai para `main`. Nenhum `git push` sem autorização explícita do Erick.
- **Módulos:** `package.json` **não** tem `"type": "module"`. `tailwind.config.js` e `postcss.config.js` são CommonJS (`module.exports`). Config de ESLint é `.mjs`.
- **Tailwind fica no v3** (3.4.17). Nenhuma sintaxe v4.
- **Nenhum hexadecimal cravado no JSX.** Cor sai de classe de token. O teste `src/test/guarda-cores.test.ts` falha se um hexadecimal arbitrário aparecer, e falha se qualquer classe de token levar modificador de opacidade — classe de token guarda `var(...)` e o Tailwind não aplica alfa sobre `var()` que guarda hexadecimal.
- **`src/design-system/tokens/` e `styles.css` são cópia fiel** do design system e **não se editam**. Estão no `.prettierignore` por isso. Token que falte se resolve no Claude Design, não aqui.
- **Cor de ação:** `--action` = `#1a71a8` no claro, `#47a6e1` no escuro. O azul da marca `#1f89ca` (degrau 500) **nunca** carrega texto — 3,83:1 no branco.
- **Interface em português do Brasil. Nenhum emoji na interface.** Sentence case em botão, rótulo e título; caixa alta só em rótulo estrutural monoespaçado e cabeçalho de tabela.
- **Foco é `focus-visible`, anel de 2px.** Nunca `focus` — não pisca para quem usa mouse.
- **Nada anima em laço** fora spinner.
- **Projeto do Design System no Claude Design:** `Health & Safety Design System`, projectId `ef9f35f6-3af0-4651-9dee-45d08884432a`.
- Node 24.16 / npm 11.

---

## O contrato de port

**Vale para todas as tasks que portam primitivo. Não se repete em cada uma.**

Cada primitivo do design system tem três arquivos de referência, que o
controlador baixa para `.superpowers/sdd/2026-08-25-fase-1-casca-primitivos/referencia/`
antes de despachar a task. Cada um serve para uma coisa:

| Arquivo | O que dele se usa |
|---|---|
| `<Nome>.d.ts` | A interface de props, **verbatim**. Nomes, tipos, opcionalidade e os comentários de doc. Só o bloco `@startingPoint` não vem. |
| `<Nome>.prompt.md` | A semântica: quando usar cada variante, o que cada uma significa. Vira o comentário de doc do componente. |
| `<Nome>.jsx` | As **medidas**: padding, tamanho de fonte, raio, gap. São traduzidas de valor inline para classe Tailwind equivalente. |

**As sete regras do port:**

1. **A API não muda.** Se o `.d.ts` diz `variant?: "primary" | "secondary" | "danger" | "success" | "ghost"`, são essas cinco, com esses nomes. Não acrescente variante, não renomeie, não "melhore".
2. **Nada de `style={{...}}`.** O original usa estilo inline porque roda fora do Tailwind. Aqui tudo é classe. Um teste de guarda falha se sobrar estilo inline num primitivo.
3. **Hover é CSS, não estado.** O original faz `useState` + `onMouseEnter`. Aqui é `hover:`. Menos re-render e funciona com teclado.
4. **Foco é `focus-visible:ring-2 focus-visible:ring-focus`.** O original não tem foco nenhum; o checklist do design system exige. Esta é a única coisa que o port **acrescenta** ao original.
5. **Cor sai de token.** `bg-action`, `text-conteudo`, `border-borda`, `bg-tint-success`, `text-on-tint-success`. Nunca hexadecimal, nunca `blue-*` ou `slate-*` — esses são a ponte de paleta da Fase 0, andaime das telas velhas, não vocabulário de primitivo.
6. **Medida sai do original.** Se o `.jsx` diz `padding: "0.5rem 1rem"` para `md`, a classe é `px-4 py-2`. Não arredonde para o que parece bonito.
7. **Componente que embrulha elemento de formulário usa `React.forwardRef`.** `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`. Sem isso, biblioteca de formulário não consegue focar o campo com erro.

**Estrutura de arquivo.** Um componente por arquivo, com o nome do componente.
Subcomponentes que o `.d.ts` declara juntos (`CardHeader`, `TableRow`,
`ModalFooter`) ficam no mesmo arquivo do principal. Cada pasta tem um `index.ts`
que reexporta o que ela define, e `src/design-system/ui/index.ts` reexporta as
cinco pastas.

**Teste de cada primitivo.** Comportamento, não aparência: papel acessível,
rótulo, estado desabilitado, o que o `.prompt.md` promete. Não teste classe CSS
componente a componente — o contrato de classe é coberto de uma vez pelo guarda
da Task 1.

---

## Estrutura de arquivos

```
src/design-system/
  ui/
    core/        Icon.tsx Spinner.tsx Button.tsx Badge.tsx Avatar.tsx Card.tsx index.ts
    forms/       Input.tsx Textarea.tsx Checkbox.tsx Radio.tsx Switch.tsx
                 Select.tsx SearchSelect.tsx index.ts
    data/        Table.tsx Pagination.tsx Progress.tsx index.ts
    feedback/    Alert.tsx Tooltip.tsx Modal.tsx Toast.tsx index.ts
    navigation/  Tabs.tsx AppShell.tsx index.ts
    index.ts
  chartTheme.ts
src/test/
  guarda-primitivos.test.ts    contrato de port, cobre a biblioteca inteira
```

Cada primitivo tem seu teste ao lado, como `<Nome>.test.tsx`.

---

### Task 1: Fundação da biblioteca — tokens que faltam, estrutura, `Icon` e `Spinner`

A Fase 0 mapeou no `tailwind.config.js` só os tokens que as telas velhas
precisavam. Os primitivos precisam de mais: sem `--focus-ring` não há anel de
foco, sem as tintas semânticas o `Badge` não tem fundo, sem `--overlay` o
`Modal` não tem cortina. Esta task abre o caminho para todas as outras.

**Files:**
- Modify: `tailwind.config.js` (bloco `theme.extend`)
- Create: `src/design-system/ui/core/Icon.tsx`
- Create: `src/design-system/ui/core/Spinner.tsx`
- Create: `src/design-system/ui/core/index.ts`
- Create: `src/design-system/ui/index.ts`
- Test: `src/test/tailwind-config.test.ts` (ampliar), `src/design-system/ui/core/Icon.test.tsx`, `src/design-system/ui/core/Spinner.test.tsx`, `src/test/guarda-primitivos.test.ts`

**Interfaces:**
- Consumes: as custom properties de `src/design-system/tokens/`, instaladas na Fase 0.
- Produces: as classes `ring-focus`, `bg-overlay`, `bg-tint-{primary,success,danger,warning,info,neutral}`, `text-on-tint-{...}`, `shadow-{sm,md,lg,xl}`, `rounded-{sm,md,full}`, `w-sidebar`, `w-sidebar-collapsed`, `h-topbar`. E os componentes `Icon` e `Spinner`, consumidos por `Button`, `Alert`, `Modal` e `AppShell`.

- [ ] **Step 1: Ampliar o teste do config**

Acrescentar a `src/test/tailwind-config.test.ts`:

```ts
describe("tokens que os primitivos consomem", () => {
  it("foco, cortina e sombra saem de token", () => {
    expect(cores.focus).toBe("var(--focus-ring)");
    expect(cores.overlay).toBe("var(--overlay)");
    expect(config.theme.extend.boxShadow.xl).toBe("var(--shadow-xl)");
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- tailwind-config`
Expected: FAIL — `cores.focus` é `undefined`.

- [ ] **Step 3: Ampliar o `tailwind.config.js`**

Dentro de `theme.extend.colors`, **depois** do bloco `info` e **antes** do
comentário da ponte de paleta, acrescentar:

```js
        focus: "var(--focus-ring)",
        overlay: "var(--overlay)",
        // Tinta semantica: a cor de significado a 15% de opacidade, ja embutida
        // no token. Fundo de badge, chip e aviso. NAO use o degrau 50 da rampa:
        // um degrau fixo vira retangulo quase branco no meio do navy.
        tint: {
          primary: "var(--tint-primary)",
          success: "var(--tint-success)",
          danger: "var(--tint-danger)",
          warning: "var(--tint-warning)",
          info: "var(--tint-info)",
          neutral: "var(--tint-neutral)",
        },
        // O texto que vai por cima de cada tinta. Este sim troca por tema.
        "on-tint": {
          primary: "var(--on-tint-primary)",
          success: "var(--on-tint-success)",
          danger: "var(--on-tint-danger)",
          warning: "var(--on-tint-warning)",
          info: "var(--on-tint-info)",
          neutral: "var(--on-tint-neutral)",
        },
```

E dentro de `theme.extend`, ao lado de `borderRadius`, acrescentar:

```js
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      width: {
        sidebar: "var(--sidebar-width)",
        "sidebar-collapsed": "var(--sidebar-width-collapsed)",
      },
      height: {
        topbar: "var(--topbar-height)",
      },
```

E dentro do `borderRadius` que já existe, acrescentar as três linhas que faltam:

```js
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        full: "var(--radius-full)",
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- tailwind-config`
Expected: PASS.

- [ ] **Step 5: Escrever o guarda do contrato de port**

Criar `src/test/guarda-primitivos.test.ts`. Ele cobre a biblioteca inteira de
uma vez, para que nenhum teste de componente precise asserir classe CSS:

```ts
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
```

- [ ] **Step 6: Rodar e confirmar que falha**

Run: `npm test -- guarda-primitivos`
Expected: FAIL — a pasta `src/design-system/ui` ainda não existe (`ENOENT`).

- [ ] **Step 7: Portar `Icon` e `Spinner`**

Ler os seis arquivos de referência em
`.superpowers/sdd/2026-08-25-fase-1-casca-primitivos/referencia/core/`
(`Icon.jsx`, `Icon.d.ts`, `Icon.prompt.md`, `Spinner.jsx`, `Spinner.d.ts`,
`Spinner.prompt.md`) e portar os dois seguindo o contrato de port.

Dois pontos específicos destes dois:

- O `Spinner` do original anima com `animation: "hs-spin 0.7s linear infinite"`, e o keyframe `hs-spin` já existe em `src/design-system/tokens/motion.css`, que a Fase 0 instalou. Use `animate-[hs-spin_0.7s_linear_infinite]` ou acrescente a animação nomeada ao `tailwind.config.js` — se acrescentar, o teste do config precisa cobrir.
- O `Icon` recebe o nome do traçado e devolve um `<svg>`. Ícone decorativo leva `aria-hidden="true"`; ícone que é o único conteúdo de um botão leva `aria-label`. Isso está no `.prompt.md` e vale como comportamento testável.

- [ ] **Step 8: Escrever os testes dos dois**

`src/design-system/ui/core/Spinner.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("se anuncia como status para leitor de tela", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
```

`src/design-system/ui/core/Icon.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon";

describe("Icon", () => {
  it("e decorativo por padrao, invisivel para leitor de tela", () => {
    const { container } = render(<Icon name="check" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("aceita rotulo quando carrega significado sozinho", () => {
    render(<Icon name="check" label="Concluído" />);
    expect(screen.getByLabelText("Concluído")).toBeInTheDocument();
  });
});
```

Se o `.d.ts` do `Icon` não declarar uma prop `label`, **use o nome que ele
declarar** e ajuste o teste — a API do original manda. Diga no relatório qual é.

- [ ] **Step 9: Criar os barris**

`src/design-system/ui/core/index.ts`:

```ts
export { Icon } from "./Icon";
export { Spinner } from "./Spinner";
```

`src/design-system/ui/index.ts`:

```ts
export * from "./core";
```

- [ ] **Step 10: Rodar tudo**

Run: `npm test`
Expected: PASS. O guarda de primitivos agora encontra dois arquivos e aprova os dois.

- [ ] **Step 11: Confirmar que o build não quebrou**

Run: `npm run build`
Expected: conclui sem erro.

- [ ] **Step 12: Commit**

```bash
git add tailwind.config.js src/design-system/ui/ src/test/
git commit -m "Abre a biblioteca de primitivos com Icon e Spinner

Amplia o tailwind.config com os tokens que os primitivos consomem e que a
Fase 0 nao precisou mapear: anel de foco, cortina de modal, as tintas
semanticas com seus pares de texto, as sombras, os raios de badge e as
medidas da casca.

O guarda de primitivos trava o contrato de port de uma vez para a
biblioteca inteira: nada de estilo inline, nada de hover por estado, nada
de blue-*/slate-* dentro de primitivo, e anel de focus-visible em tudo que
e interativo. Assim nenhum teste de componente precisa asserir classe CSS.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `Button`, `Badge` e `Avatar`

**Files:**
- Create: `src/design-system/ui/core/Button.tsx`, `Badge.tsx`, `Avatar.tsx`
- Modify: `src/design-system/ui/core/index.ts`
- Test: `src/design-system/ui/core/Button.test.tsx`, `Badge.test.tsx`, `Avatar.test.tsx`

**Interfaces:**
- Consumes: `Spinner` da Task 1 (o `Button` o usa quando `loading`), e as classes `bg-tint-*` / `text-on-tint-*` que a Task 1 criou (o `Badge` as usa).
- Produces: `Button`, `Badge`, `StatusBadge`, `PriorityBadge`, `TagBadge`, `Avatar`. O `Button` é consumido por praticamente toda tela da Fase 3; o `Badge` pelas listagens.

Referência em `.superpowers/sdd/2026-08-25-fase-1-casca-primitivos/referencia/core/`.

Três pontos específicos:

- **`Button`**: cinco variantes (`primary`, `secondary`, `danger`, `success`, `ghost`), três tamanhos (`sm` 12px, `md` 14px, `lg` 16px). `loading` desabilita o clique **junto** com o spinner — o `.prompt.md` diz por quê: "um botão que roda mas continua clicável é como se envia o mesmo formulário duas vezes". O `primary` usa `bg-action` e `text-on-primary`, nunca o degrau 500 da marca.
- **`Badge`**: o fundo é tinta semântica (`bg-tint-success`) com o texto no par (`text-on-tint-success`), **não** o degrau 50 ou 100 da rampa. O `.d.ts` declara os subcomponentes; porte todos os que ele declarar.
- **`Avatar`**: quando não há imagem, mostra as iniciais. Raio de pílula (`rounded-full`).

- [ ] **Step 1: Escrever os testes**

`Button.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renderiza o rotulo com papel de botao", () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("loading desabilita o clique junto com o spinner", async () => {
    const aoClicar = vi.fn();
    render(
      <Button loading onClick={aoClicar}>
        Salvar
      </Button>,
    );
    const botao = screen.getByRole("button");
    expect(botao).toBeDisabled();
    await userEvent.click(botao);
    expect(aoClicar).not.toHaveBeenCalled();
  });

  it("disabled tambem bloqueia o clique", async () => {
    const aoClicar = vi.fn();
    render(
      <Button disabled onClick={aoClicar}>
        Salvar
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(aoClicar).not.toHaveBeenCalled();
  });

  it("clica quando esta livre", async () => {
    const aoClicar = vi.fn();
    render(<Button onClick={aoClicar}>Salvar</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(aoClicar).toHaveBeenCalledOnce();
  });

  it("repassa atributos nativos de botao", () => {
    render(<Button type="submit">Enviar</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});
```

`Badge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("mostra o texto que recebe", () => {
    render(<Badge>Ativo</Badge>);
    expect(screen.getByText("Ativo")).toBeInTheDocument();
  });

  it("o fundo e tinta semantica, nao degrau da rampa", () => {
    render(<Badge variant="success">Concluído</Badge>);
    const selo = screen.getByText("Concluído");
    expect(selo.className).toContain("bg-tint-success");
    expect(selo.className).toContain("text-on-tint-success");
  });
});
```

`Avatar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("mostra as iniciais quando nao ha imagem", () => {
    render(<Avatar name="Erick Santos" />);
    expect(screen.getByText("ES")).toBeInTheDocument();
  });

  it("mostra a imagem com texto alternativo quando ha", () => {
    render(<Avatar name="Erick Santos" src="/foto.png" />);
    expect(screen.getByRole("img", { name: "Erick Santos" })).toBeInTheDocument();
  });
});
```

Se o `.d.ts` de `Badge` ou `Avatar` declarar props com outro nome — `label` em vez
de `name`, `status` em vez de `variant` — **use o nome do `.d.ts`** e ajuste o
teste. A API do original manda. Registre no relatório o que divergiu.

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm test -- core/`
Expected: FAIL — não há `./Button`, `./Badge` nem `./Avatar`.

- [ ] **Step 3: Portar os três**

Seguindo o contrato de port. Reexportar no `index.ts` da pasta `core`.

- [ ] **Step 4: Rodar e confirmar que passam**

Run: `npm test`
Expected: PASS, incluindo o guarda de primitivos, que agora cobre cinco arquivos.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/ui/core/
git commit -m "Porta Button, Badge e Avatar

Cinco variantes de botao e tres tamanhos, com as medidas do original. O
loading desabilita o clique junto com o spinner, como o design system pede.
O Badge pinta com tinta semantica e o par de texto, nao com degrau da rampa
- um degrau fixo vira retangulo quase branco no meio do navy.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `Card`

**Files:**
- Create: `src/design-system/ui/core/Card.tsx`
- Modify: `src/design-system/ui/core/index.ts`
- Test: `src/design-system/ui/core/Card.test.tsx`

**Interfaces:**
- Consumes: nada das tasks anteriores.
- Produces: `Card`, `CardHeader`, `CardTitle`, `CardBody`. Consumidos pelo `AppShell` e por toda tela com painel.

Referência em `.superpowers/sdd/2026-08-25-fase-1-casca-primitivos/referencia/core/`.

**O ponto que define este componente:** o design system é de **borda, não de
sombra**. Card é `bg-surface` + `border border-borda` + `rounded-xl` + `p-4`.
**Sem sombra.** Hover só quando o card inteiro navega, e o realce é a borda
virando `border-action` — não elevação. Se o `.jsx` original trouxer sombra em
card estático, o `.jsx` está errado e o `readme.md` do design system manda: "Sem
sombra. Hover só quando o card inteiro navega".

- [ ] **Step 1: Escrever o teste**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card, CardBody, CardHeader, CardTitle } from "./Card";

describe("Card", () => {
  it("compoe cabecalho, titulo e corpo", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Faturamento</CardTitle>
        </CardHeader>
        <CardBody>R$ 4.107.512,01</CardBody>
      </Card>,
    );
    expect(screen.getByText("Faturamento")).toBeInTheDocument();
    expect(screen.getByText("R$ 4.107.512,01")).toBeInTheDocument();
  });

  it("o titulo e um cabecalho de verdade, nao um div com fonte grande", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Faturamento</CardTitle>
        </CardHeader>
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "Faturamento" })).toBeInTheDocument();
  });

  it("se separa do fundo por borda, nao por sombra", () => {
    const { container } = render(<Card>conteúdo</Card>);
    const cartao = container.firstElementChild as HTMLElement;
    expect(cartao.className).toContain("border");
    expect(cartao.className).not.toMatch(/\bshadow-(sm|md|lg|xl)\b/);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- Card`
Expected: FAIL — não há `./Card`.

- [ ] **Step 3: Portar**

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/ui/core/
git commit -m "Porta Card, com separacao por borda e nao por sombra

O design system e de borda: card e superficie + 1px de borda + raio 12px,
sem sombra. Sombra so onde algo de fato flutua - modal, seletor aberto.
Um teste trava isso, porque sombra em card estatico e o desvio mais comum.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Campos simples — `Input`, `Textarea`, `Checkbox`, `Radio`, `Switch`

**Files:**
- Create: `src/design-system/ui/forms/Input.tsx`, `Textarea.tsx`, `Checkbox.tsx`, `Radio.tsx`, `Switch.tsx`, `index.ts`
- Modify: `src/design-system/ui/index.ts`
- Test: um `.test.tsx` ao lado de cada

**Interfaces:**
- Consumes: nada das tasks anteriores.
- Produces: `Input`, `Textarea`, `Checkbox`, `Radio`, `RadioGroup`, `Switch`. Consumidos pelos formulários da Fase 3 e pela tela de Configurações na Task 14.

Referência em `.superpowers/sdd/2026-08-25-fase-1-casca-primitivos/referencia/forms/`.

**Os cinco usam `React.forwardRef`** — regra 7 do contrato de port. Sem isso,
não dá para focar o campo com erro.

**Rótulo é obrigatório e ligado ao campo.** Todo campo tem `<label htmlFor>` ou
`aria-label`. Um campo sem rótulo acessível é o defeito mais comum desta família
e o teste abaixo o pega.

- [ ] **Step 1: Escrever os testes**

`Input.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("liga o rotulo ao campo", () => {
    render(<Input label="CNPJ" />);
    expect(screen.getByLabelText("CNPJ")).toBeInTheDocument();
  });

  it("aceita digitacao", async () => {
    render(<Input label="CNPJ" />);
    await userEvent.type(screen.getByLabelText("CNPJ"), "123");
    expect(screen.getByLabelText("CNPJ")).toHaveValue("123");
  });

  it("expoe o campo por ref, para foco em erro de formulario", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input label="CNPJ" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("anuncia o erro junto do campo", () => {
    render(<Input label="CNPJ" error="CNPJ já cadastrado." />);
    expect(screen.getByText("CNPJ já cadastrado.")).toBeInTheDocument();
    expect(screen.getByLabelText("CNPJ")).toHaveAttribute("aria-invalid", "true");
  });
});
```

`Textarea.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("liga o rotulo ao campo", () => {
    render(<Textarea label="Observações" />);
    expect(screen.getByLabelText("Observações")).toBeInTheDocument();
  });

  it("expoe o campo por ref", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea label="Observações" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
});
```

`Checkbox.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("alterna ao clicar no rotulo", async () => {
    render(<Checkbox label="Somente ativos" />);
    const caixa = screen.getByRole("checkbox", { name: "Somente ativos" });
    expect(caixa).not.toBeChecked();
    await userEvent.click(screen.getByText("Somente ativos"));
    expect(caixa).toBeChecked();
  });

  it("desabilitado nao alterna", async () => {
    render(<Checkbox label="Somente ativos" disabled />);
    await userEvent.click(screen.getByText("Somente ativos"));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
});
```

`Radio.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Radio, RadioGroup } from "./Radio";

describe("Radio", () => {
  it("so um da vez fica marcado dentro do grupo", async () => {
    render(
      <RadioGroup name="tipo" label="Tipo da nota">
        <Radio value="outbound" label="Outbound" />
        <Radio value="inbound" label="Inbound" />
      </RadioGroup>,
    );
    await userEvent.click(screen.getByRole("radio", { name: "Outbound" }));
    expect(screen.getByRole("radio", { name: "Outbound" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "Inbound" }));
    expect(screen.getByRole("radio", { name: "Outbound" })).not.toBeChecked();
  });
});
```

`Switch.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("se anuncia como switch e alterna", async () => {
    const aoMudar = vi.fn();
    render(<Switch label="Tema escuro" onChange={aoMudar} />);
    await userEvent.click(screen.getByRole("switch", { name: "Tema escuro" }));
    expect(aoMudar).toHaveBeenCalled();
  });
});
```

Se o `.d.ts` declarar props com outros nomes — `erro` em vez de `error`,
`rotulo` em vez de `label` — **use o do `.d.ts`** e ajuste. Registre a divergência
no relatório.

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm test -- forms/`
Expected: FAIL — a pasta `forms` não existe.

- [ ] **Step 3: Portar os cinco**

Criar também `src/design-system/ui/forms/index.ts` reexportando os cinco, e
acrescentar `export * from "./forms";` a `src/design-system/ui/index.ts`.

- [ ] **Step 4: Rodar e confirmar que passam**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/ui/
git commit -m "Porta os campos simples de formulario

Input, Textarea, Checkbox, Radio e Switch, todos com forwardRef - sem ele
biblioteca de formulario nao consegue focar o campo com erro - e todos com
rotulo ligado ao campo. Campo sem rotulo acessivel e o defeito mais comum
desta familia, e ha teste para cada um.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Seletores — `Select` e `SearchSelect`

Os dois mais complicados da família de formulário: têm lista que abre, navegação
por teclado e, no `SearchSelect`, busca.

**Files:**
- Create: `src/design-system/ui/forms/Select.tsx`, `SearchSelect.tsx`
- Modify: `src/design-system/ui/forms/index.ts`
- Test: `Select.test.tsx`, `SearchSelect.test.tsx`

**Interfaces:**
- Consumes: `Icon` da Task 1 (a seta do seletor).
- Produces: `Select`, `SearchSelect`. O `SearchSelect` unifica os três dropdowns que o HelpHS tinha separados: `variant="form"` é campo de formulário, `variant="filter"` é a versão compacta de barra de filtros, `searchable` liga a busca.

Referência em `.superpowers/sdd/2026-08-25-fase-1-casca-primitivos/referencia/forms/`.

**Três coisas que estes dois têm de fazer certo:**

- **Teclado.** Seta para baixo abre e anda, `Enter` escolhe, `Esc` fecha e devolve o foco ao gatilho. Um seletor que só funciona com mouse é inacessível e trava a operação de quem preenche nota fiscal o dia inteiro.
- **A lista aberta é a única coisa desta família que leva sombra** (`shadow-lg`), porque de fato flutua.
- **Clique fora fecha.** E o `Esc` também.

- [ ] **Step 1: Escrever os testes**

`Select.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./Select";

const OPCOES = [
  { value: "outbound", label: "Outbound" },
  { value: "inbound", label: "Inbound" },
];

describe("Select", () => {
  it("liga o rotulo ao campo", () => {
    render(<Select label="Tipo" options={OPCOES} />);
    expect(screen.getByLabelText("Tipo")).toBeInTheDocument();
  });

  it("escolhe uma opcao e avisa quem chamou", async () => {
    const aoMudar = vi.fn();
    render(<Select label="Tipo" options={OPCOES} onChange={aoMudar} />);
    await userEvent.click(screen.getByLabelText("Tipo"));
    await userEvent.click(screen.getByText("Inbound"));
    expect(aoMudar).toHaveBeenCalled();
  });

  it("Esc fecha a lista", async () => {
    render(<Select label="Tipo" options={OPCOES} />);
    await userEvent.click(screen.getByLabelText("Tipo"));
    expect(screen.getByText("Inbound")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText("Inbound")).not.toBeInTheDocument();
  });
});
```

`SearchSelect.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SearchSelect } from "./SearchSelect";

const CLIENTES = [
  { value: "1", label: "INTERCEMENT BRASIL S.A" },
  { value: "2", label: "ELEMENTIS SPECIALTIES" },
];

describe("SearchSelect", () => {
  it("filtra as opcoes conforme se digita", async () => {
    render(<SearchSelect label="Cliente" options={CLIENTES} searchable />);
    await userEvent.click(screen.getByLabelText("Cliente"));
    await userEvent.keyboard("ELEM");
    expect(screen.getByText("ELEMENTIS SPECIALTIES")).toBeVisible();
    expect(screen.queryByText("INTERCEMENT BRASIL S.A")).not.toBeInTheDocument();
  });

  it("diz quando a busca nao acha nada, em frase completa", async () => {
    render(<SearchSelect label="Cliente" options={CLIENTES} searchable />);
    await userEvent.click(screen.getByLabelText("Cliente"));
    await userEvent.keyboard("zzzz");
    expect(screen.getByText("Nenhum resultado encontrado.")).toBeInTheDocument();
  });
});
```

O texto do estado vazio vem do `readme.md` do design system, seção "Erros":
*"Nenhum resultado encontrado."*, com ponto final. Se o `.jsx` original trouxer
outro texto, use o do original e ajuste o teste — mas registre a divergência no
relatório, porque o design system é explícito sobre essa frase.

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm test -- Select`
Expected: FAIL — não há `./Select` nem `./SearchSelect`.

- [ ] **Step 3: Portar os dois**

- [ ] **Step 4: Rodar e confirmar que passam**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/ui/forms/
git commit -m "Porta Select e SearchSelect

Os dois seletores, com teclado funcionando: seta abre e anda, Enter
escolhe, Esc fecha. Seletor que so anda com mouse trava quem preenche nota
fiscal o dia inteiro. A lista aberta e a unica coisa da familia de
formulario que leva sombra, porque de fato flutua.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Dados — `Table`, `Pagination`, `Progress`

**Files:**
- Create: `src/design-system/ui/data/Table.tsx`, `Pagination.tsx`, `Progress.tsx`, `index.ts`
- Modify: `src/design-system/ui/index.ts`
- Test: um `.test.tsx` ao lado de cada

**Interfaces:**
- Consumes: `Icon` da Task 1 (setas de ordenação e de paginação).
- Produces: `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell`, `TableEmpty`, `Pagination`, `Progress`. São o coração das dez telas de listagem da Fase 3.

Referência em `.superpowers/sdd/2026-08-25-fase-1-casca-primitivos/referencia/data/`.

**Por que estes três importam mais que os outros:** onze telas do DataCoreHS
escrevem paginação à mão hoje, e dez escrevem tabela à mão. Estes componentes
são o que apaga essa duplicação.

**Duas regras do design system que valem aqui:**

- **Cabeçalho de tabela é caixa alta**, e é uma das duas únicas exceções à regra
  de sentence case (a outra é rótulo estrutural monoespaçado).
- **Contagem de paginação vem em frase**, nunca `1-10 / 84`. É *"Mostrando 1 a 10
  de 84 notas"*. O substantivo é parametrizável, porque a tela de Vendas conta
  notas e a de Clientes conta clientes.

- [ ] **Step 1: Escrever os testes**

`Table.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "./Table";

describe("Table", () => {
  it("monta uma tabela de verdade, com papeis acessiveis", () => {
    render(
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Número</TableHeaderCell>
            <TableHeaderCell>Cliente</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>1500</TableCell>
            <TableCell>INTERCEMENT BRASIL S.A</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Número" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "1500" })).toBeInTheDocument();
  });

  it("o estado vazio fala em frase completa", () => {
    render(
      <Table>
        <TableBody>
          <TableEmpty colSpan={2}>Nenhuma nota encontrada.</TableEmpty>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText("Nenhuma nota encontrada.")).toBeInTheDocument();
  });
});
```

`Pagination.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("conta em frase, nao em fracao", () => {
    render(
      <Pagination page={1} pageSize={10} total={84} noun="notas" onPageChange={() => {}} />,
    );
    expect(screen.getByText(/Mostrando 1 a 10 de 84 notas/)).toBeInTheDocument();
  });

  it("nao deixa voltar da primeira pagina", async () => {
    const aoMudar = vi.fn();
    render(
      <Pagination page={1} pageSize={10} total={84} noun="notas" onPageChange={aoMudar} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /anterior/i }));
    expect(aoMudar).not.toHaveBeenCalled();
  });

  it("avanca de pagina", async () => {
    const aoMudar = vi.fn();
    render(
      <Pagination page={1} pageSize={10} total={84} noun="notas" onPageChange={aoMudar} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /pr[óo]xima/i }));
    expect(aoMudar).toHaveBeenCalledWith(2);
  });

  it("na ultima pagina a contagem nao passa do total", () => {
    render(
      <Pagination page={9} pageSize={10} total={84} noun="notas" onPageChange={() => {}} />,
    );
    expect(screen.getByText(/Mostrando 81 a 84 de 84 notas/)).toBeInTheDocument();
  });
});
```

`Progress.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress } from "./Progress";

describe("Progress", () => {
  it("se anuncia como barra de progresso com o valor", () => {
    render(<Progress value={40} label="Meta do mês" />);
    const barra = screen.getByRole("progressbar", { name: "Meta do mês" });
    expect(barra).toHaveAttribute("aria-valuenow", "40");
  });
});
```

Os nomes de prop do `Pagination` (`page`, `pageSize`, `total`, `noun`,
`onPageChange`) vêm do `.d.ts`. **Se ele declarar outros, use os dele** e ajuste
o teste — mas o comportamento de contar em frase é do design system e não muda.
Se o `.d.ts` não tiver como parametrizar o substantivo, acrescente a prop e diga
no relatório: sem ela a frase fica errada em metade das telas.

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm test -- data/`
Expected: FAIL — a pasta `data` não existe.

- [ ] **Step 3: Portar os três**

Criar `src/design-system/ui/data/index.ts` e acrescentar `export * from "./data";`
ao barril da biblioteca.

- [ ] **Step 4: Rodar e confirmar que passam**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/ui/
git commit -m "Porta Table, Pagination e Progress

Onze telas escrevem paginacao a mao hoje e dez escrevem tabela a mao. Estes
tres apagam essa duplicacao na Fase 3. A contagem sai em frase - "Mostrando
1 a 10 de 84 notas" - e nao em fracao, com o substantivo parametrizavel
porque Vendas conta notas e Clientes conta clientes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Retorno — `Alert`, `Tooltip` e `Modal`

**Files:**
- Create: `src/design-system/ui/feedback/Alert.tsx`, `Tooltip.tsx`, `Modal.tsx`, `index.ts`
- Modify: `src/design-system/ui/index.ts`
- Test: um `.test.tsx` ao lado de cada

**Interfaces:**
- Consumes: `Icon` da Task 1, `Button` da Task 2 (o `ModalFooter` compõe os botões).
- Produces: `Alert`, `Tooltip`, `Modal`, `ModalFooter`. O `Modal` é consumido por sete telas na Fase 3.

Referência em `.superpowers/sdd/2026-08-25-fase-1-casca-primitivos/referencia/feedback/`.

**O `Modal` é o componente mais exigente da biblioteca**, e três coisas nele não
são negociáveis:

- **Foco fica preso dentro dele** enquanto está aberto, e volta para quem o abriu
  quando fecha. Modal que deixa o `Tab` passear pela página atrás é armadilha para
  quem usa teclado.
- **`Esc` fecha.**
- **A cortina é a única transparência do sistema inteiro**: preto a 60%
  (`bg-overlay`) com `backdrop-blur-[4px]`. O `readme.md` do design system é
  explícito: fora dela, tudo é opaco.

O par de botões do rodapé é sempre **Cancelar / ação**, nessa ordem.

- [ ] **Step 1: Escrever os testes**

`Alert.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert } from "./Alert";

describe("Alert", () => {
  it("se anuncia para leitor de tela", () => {
    render(<Alert variant="danger">Não foi possível carregar seus chamados.</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar seus chamados.",
    );
  });

  it("pinta com tinta semantica, nao com degrau da rampa", () => {
    render(<Alert variant="warning">Prazo correndo.</Alert>);
    expect(screen.getByRole("alert").className).toContain("bg-tint-warning");
  });
});
```

`Tooltip.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("aparece ao focar o gatilho, nao so ao passar o mouse", async () => {
    render(
      <Tooltip content="Recolher menu">
        <button type="button">Menu</button>
      </Tooltip>,
    );
    await userEvent.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Recolher menu");
  });
});
```

`Modal.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal, ModalFooter } from "./Modal";
import { Button } from "../core/Button";

describe("Modal", () => {
  it("nao renderiza nada quando fechado", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Trocar senha">
        conteúdo
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("se anuncia como dialogo modal, com titulo", () => {
    render(
      <Modal open onClose={() => {}} title="Trocar senha">
        conteúdo
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Trocar senha" })).toBeInTheDocument();
  });

  it("Esc fecha", async () => {
    const aoFechar = vi.fn();
    render(
      <Modal open onClose={aoFechar} title="Trocar senha">
        conteúdo
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(aoFechar).toHaveBeenCalled();
  });

  it("prende o foco dentro dele", async () => {
    render(
      <Modal open onClose={() => {}} title="Trocar senha">
        <ModalFooter>
          <Button variant="secondary">Cancelar</Button>
          <Button>Salvar</Button>
        </ModalFooter>
      </Modal>,
    );
    const dialogo = screen.getByRole("dialog");
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm test -- feedback/`
Expected: FAIL — a pasta `feedback` não existe.

- [ ] **Step 3: Portar os três**

Se o `.jsx` original do `Modal` não prender o foco, **implemente**: é requisito de
acessibilidade e o teste acima o exige. Registre no relatório que foi acréscimo
ao original, como o `focus-visible` da regra 4.

- [ ] **Step 4: Rodar e confirmar que passam**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/ui/
git commit -m "Porta Alert, Tooltip e Modal

O Modal prende o foco enquanto aberto e devolve ao gatilho ao fechar, e
fecha com Esc - modal que deixa o Tab passear pela pagina atras e armadilha
para quem usa teclado. A cortina e a unica transparencia do sistema
inteiro: preto a 60% com blur de 4px.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: `Toast`, o provider, e a morte dos quatro `alert()`

Esta é a única task de primitivo que encosta em tela.

**Files:**
- Create: `src/design-system/ui/feedback/Toast.tsx`
- Modify: `src/design-system/ui/feedback/index.ts`
- Modify: `src/App.tsx` (montar o `ToastStack`)
- Modify: `src/components/ModalTrocarSenha.tsx:21`, `src/pages/Dashboard.tsx:224` e `:228`, `src/pages/Vendedores.tsx:396`
- Test: `src/design-system/ui/feedback/Toast.test.tsx`, `src/test/guarda-alert.test.ts`

**Interfaces:**
- Consumes: `Icon` da Task 1.
- Produces: `Toast`, `ToastStack` e o gancho que dispara um toast — nome exato conforme o `.d.ts` do design system. Consumido pelas telas da Fase 3 no lugar de `alert()`.

Referência em `.superpowers/sdd/2026-08-25-fase-1-casca-primitivos/referencia/feedback/`.

**Os quatro `alert()` e o que cada um vira:**

| Onde | Texto de hoje | Vira |
|---|---|---|
| `ModalTrocarSenha.tsx:21` | `"As senhas não coincidem!"` | toast de erro: **"As senhas não coincidem."** |
| `Dashboard.tsx:224` | mensagem de sucesso do fluxo | toast de sucesso |
| `Dashboard.tsx:228` | `"Falha ao tentar acionar o fluxo: " + err` | toast de erro: **"Não foi possível acionar o fluxo."** |
| `Vendedores.tsx:396` | `"Erro ao salvar o tipo da nota"` | toast de erro: **"Não foi possível salvar o tipo da nota."** |

**Duas regras do design system aplicadas aqui.** Erro fala o que aconteceu, em
frase completa, com ponto final, e **não expõe código HTTP nem nome de exceção** —
por isso o `+ err` do Dashboard sai. E **nenhum emoji nem exclamação** fora de
saudação: `"As senhas não coincidem!"` perde a exclamação.

Antes de reescrever, **leia o contexto de cada linha**. Se algum dos quatro for
confirmação de ação destrutiva disfarçada de aviso, ele vira `Modal`, não toast —
e nesse caso pare e relate, porque é mudança de fluxo e não de aparência.

- [ ] **Step 1: Escrever os testes**

`Toast.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toast } from "./Toast";

describe("Toast", () => {
  it("se anuncia sem roubar o foco de quem esta digitando", () => {
    render(<Toast variant="danger">As senhas não coincidem.</Toast>);
    const aviso = screen.getByRole("status");
    expect(aviso).toHaveTextContent("As senhas não coincidem.");
    expect(aviso).toHaveAttribute("aria-live", "polite");
  });
});
```

`src/test/guarda-alert.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm test -- Toast guarda-alert`
Expected: FAIL nos dois — não há `./Toast`, e o guarda lista as quatro linhas
com `alert(`.

- [ ] **Step 3: Portar o `Toast` e o `ToastStack`**

- [ ] **Step 4: Montar o `ToastStack` na casca**

Em `src/App.tsx`, montar o `ToastStack` **fora** do `<main>` que rola, para que o
toast fique fixo na tela. Não mexa em mais nada do `App.tsx` nesta task.

- [ ] **Step 5: Trocar os quatro `alert()`**

Um por vez, com os textos da tabela acima. Só a linha do `alert` muda; nada de
lógica em volta.

- [ ] **Step 6: Rodar e confirmar que passam**

Run: `npm test`
Expected: PASS. O guarda de `alert()` agora devolve lista vazia.

- [ ] **Step 7: Confirmar que o build passa**

Run: `npm run build`
Expected: conclui sem erro.

- [ ] **Step 8: Commit**

```bash
git add src/design-system/ui/ src/App.tsx src/components/ModalTrocarSenha.tsx src/pages/Dashboard.tsx src/pages/Vendedores.tsx src/test/
git commit -m "Porta Toast e aposenta os quatro alert() do navegador

alert() trava a aba, nao e estilizavel, nao respeita o tema e mostra o
dominio da aplicacao numa caixa do sistema operacional. Os quatro viram
toast, com as frases reescritas segundo o design system: frase completa,
ponto final, sem exclamacao e sem expor nome de excecao ao usuario.

Um teste de guarda impede que alert() volte ao codigo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: `Tabs`

**Files:**
- Create: `src/design-system/ui/navigation/Tabs.tsx`, `index.ts`
- Modify: `src/design-system/ui/index.ts`
- Test: `src/design-system/ui/navigation/Tabs.test.tsx`

**Interfaces:**
- Consumes: nada das tasks anteriores.
- Produces: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`. Consumidos pela tela de Financeiro na Fase 3, a única com abas hoje (`CentroCustoTab`, `MetaTab`).

Referência em `.superpowers/sdd/2026-08-25-fase-1-casca-primitivos/referencia/navigation/`.

**A aba ativa dentro do trilho é o único lugar da biblioteca que leva `shadow-sm`**
— é o motivo do design system para "algo que de fato flutua". Navegação por seta
esquerda/direita é obrigatória.

- [ ] **Step 1: Escrever o teste**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs";

function Exemplo() {
  return (
    <Tabs defaultValue="centro">
      <TabsList>
        <TabsTrigger value="centro">Centro de custo</TabsTrigger>
        <TabsTrigger value="meta">Meta</TabsTrigger>
      </TabsList>
      <TabsContent value="centro">Rateio por centro</TabsContent>
      <TabsContent value="meta">Meta do mês</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("mostra so o painel da aba ativa", () => {
    render(<Exemplo />);
    expect(screen.getByText("Rateio por centro")).toBeVisible();
    expect(screen.queryByText("Meta do mês")).not.toBeInTheDocument();
  });

  it("troca de aba ao clicar", async () => {
    render(<Exemplo />);
    await userEvent.click(screen.getByRole("tab", { name: "Meta" }));
    expect(screen.getByText("Meta do mês")).toBeVisible();
  });

  it("anda entre abas com as setas do teclado", async () => {
    render(<Exemplo />);
    await userEvent.click(screen.getByRole("tab", { name: "Centro de custo" }));
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Meta" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- Tabs`
Expected: FAIL — a pasta `navigation` não existe.

- [ ] **Step 3: Portar**

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/ui/
git commit -m "Porta Tabs, com navegacao por seta

A aba ativa dentro do trilho e o unico lugar da biblioteca que leva sombra,
porque de fato flutua. Seta esquerda e direita andam entre abas.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## INCOMPLETO — falta escrever

Este plano para na Task 9. As seis restantes ainda não foram escritas:

- **Task 10** · `chartTheme.ts` — tema único de recharts a partir dos tokens; 9 telas usam recharts e cada uma escolhe a própria cor hoje
- **Task 11** · Troca dos papéis de token — os 165 `dark:bg-surface-base` de card viram `bg-surface` e os 40 `dark:bg-darkBlue` de fundo de página viram `bg-surface-base`. Mecânica, com teste de guarda
- **Task 12** · `AppShell` — Header + Sidebar refeitos, os 19 ícones de `img.icons8.com` viram lucide, e é aqui que a Task 11 tem de pousar junto
- **Task 13** · Telas piloto pequenas — NotFound, Bloqueio, EmConstrução, Home
- **Task 14** · Telas piloto — Configurações e Login (o Login resolve os 2 hexadecimais que a Fase 0 deixou por decisão)
- **Task 15** · Verificação da fase

Falta também a auto-revisão do plano e a tabela de cobertura do spec.
