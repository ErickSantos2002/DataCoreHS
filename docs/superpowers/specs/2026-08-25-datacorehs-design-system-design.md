# DataCoreHS — adoção do Design System H&S e modernização do front

Data: 2026-08-25 · Autor: Erick Santos (com Claude Code)

## Contexto

O DataCoreHS é o sistema de dados e notas fiscais da Health & Safety. Foi escrito
sem biblioteca de componentes: as telas são monolitos de Tailwind cru, com cor
decidida arquivo a arquivo. Em ago/2026 a H&S passou a ter um design system
próprio, publicado no Claude Design (projeto `Health & Safety Design System`,
`ef9f35f6-3af0-4651-9dee-45d08884432a`), que define tokens, primitivos e um guia
de adoção — `guidelines/adocao.md` — com uma linha específica para este sistema:

> **DataCoreHS** — já bate: layout header + sidebar, rotas por papel.
> Muda: rampa (`#2563EB` → marca), raio, `dark:` cravado em classe vira token,
> `lucide-react` continua para ícones.

O trabalho aqui é maior que a adoção visual: o sistema é antigo e carrega dívida
de arquitetura que seria irresponsável congelar por baixo de uma pele nova.

## Objetivo

Deixar o DataCoreHS no padrão do Design System H&S — visual, vocabulário e
componentes — e, no mesmo movimento, corrigir a dívida estrutural que a migração
tela a tela naturalmente expõe: permissões duplicadas, contexts globais, ausência
de code splitting e ausência total de testes.

## Não-objetivos

- **Não** é redesenho de produto. O layout e o fluxo de cada tela permanecem; muda
  a aparência, a consistência e a estrutura do código por trás.
- **Não** é mudança de backend. Nenhuma API é alterada. Onde uma correção depende
  do backend (ver Perguntas em aberto), a pergunta fica registrada, não resolvida.
- **Não** é publicação de pacote npm do design system. Ver Decisão 3.
- **Não** inclui os outros sete sistemas da H&S.

## Estado atual (medido em 2026-08-25)

Repositório: `~/github/DataCoreHS` · React 19 + Vite 7 + TypeScript 5.8 +
Tailwind 3.4.17 · 50 arquivos em `src/`, ~16.000 linhas.

| Sintoma | Número |
|---|---|
| Classes `dark:` no JSX | 1.626 |
| Classes literais de azul (`bg-blue-600`, `text-blue-600`...) | 272 |
| Hexadecimais arbitrários em classe (`dark:bg-[#0f172a]`...) | 212 |
| Usos de `bg-primary` / `text-primary` / `border-primary` | **0** |
| Hexadecimais cravados no JSX | 528 |
| Páginas acima de 800 linhas | 7 (Vendas 1554, Clientes 1387, Estoque 1362, Vendedores 1361, Servicos 1258, Produtos 1221, ContasPagar 839) |
| Contexts montados sempre, no `main.tsx` | 12 |
| Guardas de rota quase idênticos | 6 |
| Páginas com paginação escrita à mão | 11 |
| Páginas com tabela própria | 10 |
| Páginas usando `recharts` | 9 |
| Ícones carregados de `img.icons8.com` | 19 |
| `alert()` fazendo papel de feedback | 4 |
| Code splitting / `lazy` | nenhum |
| ESLint / Prettier config / testes / CI | nenhum |

Achados que não são estilo:

1. **Permissão por ID de banco.** `router.tsx` libera `/locacao` e `/financeiro`
   com `[1, 3, 4].includes(user.id)`, e `Sidebar.tsx` repete o mesmo array para
   decidir se exibe o item de menu. Regra de negócio duplicada e presa a IDs.
2. **`services/api.ts:22`** — `updateUserPassword` usa `axios` cru em vez da
   instância `authApi`, então a troca de senha sai sem header `Authorization`.
3. **`.env` com `VITE_API_URL` e `VITE_NOTAS_URL` comentadas**, o que faz tudo
   cair no fallback `https://authapi.healthsafetytech.com` cravado no código.
4. **O token `primary` do Tailwind não é usado por ninguém.** As telas escrevem
   cor literal (`bg-blue-600`, `text-blue-600`, `hover:bg-blue-700`) — 272
   ocorrências. Trocar a rampa no `tailwind.config.js` sozinho não muda cor
   nenhuma na interface. `darkBlue`, ao contrário, é usado 42 vezes em 15
   arquivos, então removê-lo quebra o fundo escuro desses arquivos.
5. **212 hexadecimais arbitrários dentro de classe Tailwind** — `[#0f172a]`
   163x, `[#1e293b]` 37x, `[#1e3a8a]` 6x, `[#0a192f]` 6x. Valor arbitrário não
   responde a configuração: nenhuma mudança no `tailwind.config.js` os alcança.
   Todos são fundo de tema escuro.
6. **Dependências mortas de Tailwind v4** (`@tailwindcss/vite`,
   `@tailwindcss/postcss`) instaladas num projeto que constrói com o v3 via
   `postcss.config.js`. Não há configuração dupla — é lixo de dependência.

## Decisões

**1 · Ordem: fundação → primitivos → transversal → telas.**
As 12 telas grandes são migradas uma única vez, já sobre a estrutura final.
A alternativa (telas antes do transversal) entrega repaginação mais cedo, mas
paga um segundo passe em cada tela quando providers e lazy mudarem.

**2 · Verificação por teste de caracterização.**
Vitest + React Testing Library entram na Fase 0. Antes de tocar em cada tela
grande, um teste fixa o comportamento atual — filtro, ordenação, cálculo,
paginação, abertura de modal. Migra-se com o teste passando. Sem isso, refatorar
1.554 linhas de tela fiscal é aposta, não engenharia.

**3 · O design system entra copiado para dentro do repo.**
`src/design-system/`, como o `adocao.md` instrui. Um pacote npm privado resolveria
a divergência de forma definitiva, mas exige repositório, build, versionamento e
registry autenticado antes da primeira linha útil. O risco conhecido — recopiar em
oito repos — é mitigado por `ORIGEM.md` registrando projectId, data do sync e
o que foi portado.

**4 · Tokens são copiados verbatim; primitivos são portados.**
Os primitivos do DS são escritos com `style={{...}}` inline e hover via
`useState`/`onMouseEnter`, porque precisam renderizar sozinhos no canvas do Claude
Design. Num app Tailwind isso custa `:hover` em CSS, `focus-visible`, responsivo e
sobrescrita por classe — e o próprio checklist do `adocao.md` exige
"`focus-visible` com anel de 2px, não `focus`", que a versão inline não entrega.
Portanto: `styles.css` e `tokens/` entram como cópia fiel; cada primitivo é
reescrito em `.tsx` + Tailwind preservando **exatamente** a API (`variant`, `size`,
`loading`, `icon`, `fullWidth`) e as medidas do original, com o `.d.ts` e o
`.prompt.md` de cada componente servindo de especificação.

**5 · Tailwind fica no v3.** As duas dependências v4 são removidas. O
`tailwind.config.js` pronto do `adocao.md` é formato v3.

**6 · Ponte de paleta na Fase 0.**
Como o token `primary` não é usado e a cor mora em classe literal, a Fase 0
redefine `blue-*` para a rampa primária do DS e `slate-*` para as superfícies
navy, dentro do `tailwind.config.js`. As 272 classes literais passam a apontar
para a marca sem que nenhum JSX seja tocado. O que a config não alcança —
`dark:bg-[#0f172a]` (160x) e o `dark:bg-dark` morto (40x) — é trocado por um
codemod mecânico. `darkBlue` sobrevive como alias depreciado do navy do DS e
morre tela a tela na Fase 3.

A ponte usa **hexadecimal literal** da rampa do DS, não `var()`: existem classes
com modificador de opacidade (`dark:bg-blue-900/40`) e o Tailwind não aplica alfa
sobre um `var()` que guarda hexadecimal — a classe sairia sem cor. Os tokens novos
(`bg-action`, `bg-surface`, `text-conteudo`) usam `var()` normalmente. A ponte é
andaime temporário e não precisa reagir a troca de token; as classes de token,
sim. A alternativa (adiar cor para a Fase 3) deixaria o
sistema meses com metade das telas em cada azul.

**7 · Trabalho em branch por fase, com checkpoint humano.** O sistema está em
produção (Docker + Traefik). Nada vai para `main` sem revisão explícita.

## Arquitetura alvo

```
src/
  design-system/          fronteira fechada — nada aqui importa do app
    styles.css            cópia verbatim do DS
    tokens/               colors · typography · spacing · shape · motion · base
    ui/                   primitivos portados para .tsx + Tailwind
      core/ forms/ data/ feedback/ navigation/
    chartTheme.ts         tema único de recharts derivado dos tokens
    ORIGEM.md             projectId, data do sync, o que foi portado e por quê
  auth/
    permissoes.ts         matriz rota → papéis, fonte única
  pages/<tela>/           cada tela grande vira pasta com seus componentes
  services/               instância axios única, tipada
```

Regra que governa o resto, herdada do DS: **nenhum hexadecimal cravado no JSX.**

---

## Fase 0 — Fundação

Nenhuma tela é reescrita. A cor da marca, a fonte e o tema escuro mudam em tudo.

1. `src/design-system/` criado com `styles.css` + `tokens/` copiados do projeto do
   Claude Design, mais `ORIGEM.md`.
2. `src/styles/index.css` importa `design-system/styles.css` **antes** das
   diretivas `@tailwind`.
3. `tailwind.config.js` substituído pelo bloco do `adocao.md`: `primary` vira a
   rampa `#1F89CA`, entram `action`, `surface`, `borda` e `conteudo` como
   `var(--...)`. Sai o `safelist` de gambiarra.
4. **Ponte de paleta**, no mesmo config (Decisão 6): `blue-*` remapeado para a
   rampa primária do DS — `blue-600` cai em `--color-primary-600` (`#1A71A8`), o
   `--action` — e `slate-*` para as superfícies navy. `darkBlue` permanece como
   alias depreciado apontando para o navy do DS, com comentário dizendo que morre
   na Fase 3. Cada classe de azul é conferida no diff: onde `blue-*` estiver
   carregando sentido de *info* e não de ação, vai para `--color-info-*`.
5. **Codemod** trocando os 212 hexadecimais arbitrários pelas classes de token,
   preservando o prefixo do utilitário: `[#0f172a]` e `[#0a192f]` viram
   `surface-base`, `[#1e293b]` e `[#1e3a8a]` viram `surface`. Alcança também o
   `.input-cc` em `src/styles/index.css`. É busca-e-troca mecânica, revisada no
   diff e travada por teste de guarda.
6. Plus Jakarta Sans (Google Fonts, pesos 300–800) e a pilha mono do DS.
7. Tema escuro passa a navy `#0D1B2A` por token. As 1.626 classes `dark:`
   continuam funcionando nesta fase — morrem tela a tela na Fase 3.
8. Vitest + React Testing Library + script `npm test`, com um teste de fumaça
   provando o setup.
9. ESLint + Prettier, usando o `prettier-plugin-tailwindcss` que já está no
   `package.json` sem configuração.
10. Limpeza: remover `@tailwindcss/vite` e `@tailwindcss/postcss`; versionar
   `.env.example` com as duas variáveis hoje comentadas.

**Pronto quando:** `npm run build` passa, `npm test` passa, o app sobe e as 18
rotas renderizam. O sistema inteiro está no azul da marca e no navy do DS, nos
dois temas; nenhum layout se move e nenhuma tela foi reescrita.

---

## Fase 1 — Casca e primitivos

**Primitivos portados** para `src/design-system/ui/`:

| Grupo | Componentes |
|---|---|
| `core/` | `Button`, `Card` (+`CardHeader`, `CardTitle`, `CardBody`), `Badge` (+`StatusBadge`), `Icon`, `Spinner`, `Avatar` |
| `forms/` | `Input`, `Textarea`, `Select`, `SearchSelect`, `Checkbox`, `Radio`, `Switch` |
| `data/` | `Table` (+ `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell`, `TableEmpty`), `Pagination`, `Progress` |
| `feedback/` | `Alert`, `Modal` (+`ModalFooter`), `Toast` (+`ToastStack`), `Tooltip` |
| `navigation/` | `Tabs` (+`TabsList`, `TabsTrigger`, `TabsContent`), `AppShell` |

Ficam de fora por YAGNI, com o motivo registrado: `Rating` e `SlaChip` (conceitos
de HelpHS/ChamadosHS, inexistentes aqui), `Rotulo` e `Colchetes` (pele de console,
exceção documentada do ChamadosHS), `FileUpload` (nenhuma tela envia arquivo).

**Duas peças que o DS não fornece e este sistema exige:**

- **`AppShell`** — Header + Sidebar refeitos. Os 19 `<img>` de `img.icons8.com`
  viram `lucide-react`, já presente e usado em 15 arquivos. Sidebar 256px (72px
  recolhida), topbar 64px, item ativo com fundo `--action-tint`, texto `--action`
  e barra de 2px à esquerda, conforme o DS.
- **`chartTheme.ts`** — 9 páginas usam `recharts` e cada uma escolhe a própria
  cor. Um módulo único serve eixos, grade, tooltip e rampa de séries a partir dos
  tokens. Sem ele, a Fase 3 recria a divergência de cor nove vezes.

**Telas piloto:** Login, Home, Configurações, NotFound, Bloqueio, EmConstrução.

**Pronto quando:** cada primitivo tem teste cobrindo variantes, `disabled`,
`loading` e o anel de `focus-visible`; as telas piloto passam o checklist do
`adocao.md`.

---

## Fase 2 — Estrutura transversal

Mexe em `router.tsx`, `main.tsx` e `services/`. Quase não toca em tela.

1. **`src/auth/permissoes.ts`** — matriz rota → papéis, fonte única. Substitui os
   6 guardas (`RequireAdmin`, `RequireVendas`, `RequireServicos`,
   `RequireVendedores`, `RequireContasPagar`, `RequireFinanceiro`) por um guarda
   parametrizado, e a Sidebar passa a derivar o menu da mesma matriz. Hoje é
   possível o menu exibir item que a rota bloqueia.
2. **Providers por rota** — os 12 contexts saem da pirâmide do `main.tsx` e montam
   no ramo de rota que os usa. Hoje quem abre o Login monta `EstoqueProvider`,
   `VendasProvider` e mais dez.
3. **`lazy` + `Suspense`** nas 18 rotas, para code splitting real.
4. **`services/` tipado**, numa instância `axios` única com o interceptor de
   token; corrige `updateUserPassword`.

**Pronto quando:** existe teste cobrindo cada papel contra cada rota — é a lógica
de negócio mais perigosa de todo o refactor — e o `build` mostra chunks separados.

---

## Fase 3 — As 12 telas grandes

Receita fixa, por tela:

1. Teste de caracterização fixando o comportamento atual.
2. Quebrar em componentes numa pasta própria (`pages/vendas/`: filtros, tabela,
   modais, export).
3. Trocar Tailwind cru pelos primitivos.
4. Zerar `dark:` e hexadecimal na tela.
5. Passar o checklist de 10 itens do `adocao.md`.

Uma tela = uma branch = um checkpoint humano.

| # | Tela | Linhas | Por que nesta posição |
|---|---|---|---|
| 1 | Dashboard | 328 | Vitrine, e o UI kit `templates/datacorehs/` já a desenhou — referência literal |
| 2 | Locação | 386 | Pequena; exercita tabela + export |
| 3 | Usuários | 457 | Firma o padrão de modal |
| 4–5 | ContasReceber · ContasPagar | 802 · 839 | Gêmeas; migrar em par |
| 6 | Financeiro + CentroCustoTab + MetaTab | 768 + 723 + 442 | Única tela com abas; firma o `Tabs` |
| 7–10 | Produtos · Serviços · Vendedores · Estoque | 1221–1362 | Mesma anatomia: filtro + tabela + gráfico + export |
| 11 | Clientes | 1387 | Idem, com dado enriquecido no context |
| 12 | Vendas | 1554 | Maior e mais crítica; vai por último, com o padrão provado 11 vezes |

**Checklist de tela migrada** (do `adocao.md`):

- [ ] Nenhum hexadecimal cravado no JSX.
- [ ] Nenhum `dark:` por classe onde existe token semântico equivalente.
- [ ] Azul de ação é `--action` (`#1A71A8`), não o azul da marca.
- [ ] Botão primário: um por bloco de decisão.
- [ ] Texto abaixo de 12px: nenhum.
- [ ] Estado vazio com frase completa e ação, quando existe uma.
- [ ] Ícone é componente, não emoji nem caractere.
- [ ] Contagem de paginação em frase ("Mostrando 1 a 10 de 84 notas").
- [ ] `focus-visible` com anel de 2px, não `focus`.
- [ ] Nada animando em laço fora spinner.

---

## Perguntas em aberto

Nenhuma trava o início. Cada uma é trazida de volta quando sua fase chegar.

1. **Papel do `RequireFinanceiro`** (Fase 2). Hoje libera por
   `[1, 3, 4].includes(user.id)`. Para virar papel, é preciso decidir qual — e a
   decisão muda quem enxerga Locação e Financeiro. Depende do Erick.
2. **`updateUserPassword` sem token** (Fase 2). O endpoint está aberto no backend,
   ou a função está quebrada? Verificar antes de "corrigir".
3. **Os 4 `alert()`** (Fase 3). Viram `Toast`; verificar caso a caso se algum é
   confirmação de ação destrutiva, que pede `Modal`.
4. **URLs de produção** (Fase 0). O `.env.example` versiona só os nomes das
   variáveis. A pergunta é outra: qual URL está de fato em uso em produção hoje,
   já que as duas linhas estão comentadas e tudo cai no fallback cravado em
   `services/api.ts`. Confirmar antes de mexer no `.env`.

## Riscos

| Risco | Mitigação |
|---|---|
| Regressão silenciosa em cálculo fiscal ao refatorar tela de 1.500 linhas | Teste de caracterização antes de cada tela (Decisão 2) |
| Mudança de permissão liberar acesso indevido | Teste papel × rota na Fase 2, antes de qualquer tela grande |
| Tokens divergirem de novo entre os 8 sistemas | `ORIGEM.md` com projectId e data; Decisão 3 revisitada quando o segundo sistema entrar na fila |
| Ponte de paleta pintar de azul-marca algo que significava *info* | Conferência classe a classe no diff da Fase 0; `blue-*` semântico vai para `--color-info-*` |
| Quebrar produção durante a migração | Branch por fase e por tela; nada em `main` sem revisão |

## Referências

- Design System: projeto `Health & Safety Design System` no Claude Design
  (`ef9f35f6-3af0-4651-9dee-45d08884432a`)
- `guidelines/adocao.md` — guia de adoção, `tailwind.config.js` e checklist
- `readme.md` do DS — fundamentos de conteúdo e visuais, decisões de marca
- `templates/datacorehs/` — UI kit que já recriou Dashboard e listagem de notas
