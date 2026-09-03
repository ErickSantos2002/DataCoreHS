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
5. **212 hexadecimais arbitrários dentro de classe Tailwind**, dos quais 210 são
   convertidos e 2 ficam — ver a exceção do `Login.tsx` abaixo. — `[#0f172a]`
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

Uma exceção, registrada: `src/pages/Login.tsx` mantém `bg-[#0a192f]` (linha 33) e
`bg-[#0f172a]` (linha 41). São as duas únicas ocorrências do projeto **sem** o
prefixo `dark:` — fundo escuro deliberado nos dois temas, e o design system
registra login escuro como exceção documentada. Convertê-las para token deixaria
o login branco no tema claro. O teste de guarda declara a exceção pelo nome do
arquivo; a Fase 1 a resolve ao migrar o Login como tela piloto. Por isso o
codemod da Fase 0 faz **210** conversões, não 212.

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
| `core/` | `Button`, `Card` (+`CardHeader`, `CardTitle`, `CardBody`), `Badge`, `Icon`, `Spinner`, `Avatar` |
| `forms/` | `Input`, `Textarea`, `Select`, `SearchSelect`, `Checkbox`, `Radio`, `Switch` |
| `data/` | `Table` (+ `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell`, `TableEmpty`), `Pagination`, `Progress` |
| `feedback/` | `Alert`, `Modal` (+`ModalFooter`), `Toast` (+`ToastStack`), `Tooltip` |
| `navigation/` | `Tabs` (+`TabsList`, `TabsTrigger`, `TabsContent`), `AppShell` |

Ficam de fora por YAGNI, com o motivo registrado: `Rating` e `SlaChip` (conceitos
de HelpHS/ChamadosHS, inexistentes aqui), `Rotulo` e `Colchetes` (pele de console,
exceção documentada do ChamadosHS), `FileUpload` (nenhuma tela envia arquivo),
`StatusBadge`, `PriorityBadge` e `TagBadge` (codificam o domínio de chamados do
HelpHS — `open`, `awaiting_technical`, `resolved` — e um cadastro de etiquetas;
nenhum dos dois existe no DataCoreHS).

**Duas peças que o DS não fornece e este sistema exige:**

- **`AppShell`** — Header + Sidebar refeitos. Os 19 `<img>` de `img.icons8.com`
  viram `lucide-react`, já presente e usado em 15 arquivos. Sidebar 256px (72px
  recolhida), topbar 64px, item ativo com fundo `--action-tint`, texto `--action`
  e barra de 2px à esquerda, conforme o DS.
- **`chartTheme.ts`** — 9 páginas usam `recharts` e cada uma escolhe a própria
  cor. Um módulo único serve eixos, grade, tooltip e rampa de séries a partir dos
  tokens. Sem ele, a Fase 3 recria a divergência de cor nove vezes.

**Colisões de cascata a resolver aqui.** A Fase 0 copiou `tokens/base.css`, que
traz regras de elemento além das custom properties. Três delas estão mortas hoje,
confirmado lendo o CSS gerado:

- `body { background: var(--bg-base) }` perde para o `body` e o `.dark body` que
  `src/styles/index.css` já definia, e para o `<body class="bg-gray-100">` do
  `index.html`. O navy do design system não chega ao `body` real.
- `::-webkit-scrollbar` do design system (6px, translúcido) perde para as regras
  de scrollbar que o `index.css` já tinha (8px, `#4b5563`).
- `a { color: var(--text-link) }` perde para o preflight do próprio Tailwind
  (`a { color: inherit }`), porque `@tailwind base` vem depois do `@import` dos
  tokens — e tem de vir, senão as custom properties não existiriam a tempo.

Nada disso é visível hoje: os links do app são pintados por classe Tailwind, e o
fundo que aparece é o do `<div>` de altura total do `App.tsx`. Mas as três são
decisão do `AppShell`, não acidente para descobrir depois. O que **já** entrou em
vigor de `base.css`, sem nenhuma tela ser tocada: a família e o tamanho de fonte
do `body`, e a cor e a margem de `h1`–`h4`.

**Os papéis dos tokens estão invertidos, e o `AppShell` tem de desfazer isso.**
O codemod da Fase 0 mapeou por valor de cor, não por papel. O resultado, medido:

| Papel na tela | Classe que o app usa hoje | Valor | Token cujo papel ele ocupa |
|---|---|---|---|
| Fundo de página (40 ocorrências) | `dark:bg-darkBlue` | `#132238` | é o valor de `--surface` |
| Card, header, sidebar (165 ocorrências) | `dark:bg-surface-base` | `#0d1b2a` | é o `--bg-base` |

O design system diz o contrário: `--bg-base` é *fundo da página*, `--surface` é
*card, painel, topbar*. Duas consequências.

A primeira já está na tela: card `#0d1b2a` sobre página `#132238` dá **1,09** de
contraste, contra 1,72 de antes da fase. O card quase deixou de se destacar, e a
elevação lê ao contrário — superfície mais escura que o fundo, debaixo de um
`shadow-sm`. Não é ilegibilidade: o texto está bem. É hierarquia perdida. O
conserto certo é o do design system, separar superfície por **borda de 1px**
(`--border-color`) e não por luminância — que é justamente o trabalho dos
primitivos, por isso não se corrige na Fase 0.

A segunda é uma armadilha. Se o `AppShell` arrumar o `body` do jeito óbvio —
`background: var(--bg-base)` — a página passa a `#0d1b2a`, **idêntica aos 165
elementos que a Fase 0 escreveu como `dark:bg-surface-base`**. Contraste 1,00:
todo card do sistema desaparece de uma vez, num único commit.

Portanto, **no mesmo movimento** em que o `AppShell` assumir o `body`, os 165
`dark:bg-surface-base` de card, header e sidebar têm de virar `bg-surface`, e os
40 `dark:bg-darkBlue` de fundo de página têm de virar `bg-surface-base`. Um sem o
outro quebra a tela.

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

## Achados do checkpoint da Fase 0

O passeio pelas 18 rotas nos dois temas foi feito em 2026-08-25 e **não encontrou
nenhuma quebra**: nada ilegível, nada sumido, nada branco sobre branco. O tema
claro, que a medição automática não conseguira cobrir, foi conferido e está
correto.

**O risco de "azul que significava aviso virou azul de marca" não se
materializou.** A tabela de riscos deste spec previa que a ponte de paleta
pudesse repintar de cor de ação algo que carregava sentido de *info*. Nenhum caso
foi encontrado. O risco está fechado; a linha correspondente da tabela de riscos
não precisa mais de mitigação.

O que a medição de contraste levantou vira trabalho de tela na Fase 3. São todos
**pré-existentes** — nenhum foi criado por esta fase:

| Achado | Medido | Onde | Conserto na Fase 3 |
|---|---|---|---|
| `text-blue-600` sobre fundo escuro | 3,29:1 | Valores em KPI, várias telas | Trocar por `text-action`, que no escuro inverte para `#47a6e1` e sobe para 6,64:1 |
| `text-red-600` sobre fundo escuro | 3,60:1 | Percentuais negativos e valores zerados | Usar `--color-danger-400` no escuro, como o design system determina |
| Botão "Exportar Excel", texto branco sobre `bg-green-600` | 3,30:1 | Barra de ações das listagens | Pareamento correto de cor semântica e texto |

Para referência da Fase 3: `text-blue-600` no escuro já reprovava **antes** desta
fase, com 3,45:1. A ponte o levou a 3,38:1 — e, no tema claro, o melhorou de
5,17:1 para 5,29:1. A ponte não criou nenhum destes três.

## Defeitos encontrados no próprio Design System

O port dos primitivos revelou defeitos nos arquivos do design system publicado no
Claude Design. Eles foram contornados aqui, mas o conserto pertence à origem —
senão o próximo sistema da H&S a adotar a biblioteca tropeça no mesmo.

**`components/core/Icon.jsx` — rótulo e `aria-hidden` convivem.** O componente
crava `aria-hidden="true"` **antes** de espalhar `{...rest}`. Quem passa
`aria-label` fica com os dois atributos ao mesmo tempo: o ícone é rotulado e
escondido de uma vez, e o leitor de tela ignora o rótulo. É exatamente o caso que
a regra de iconografia do design system quer cobrir — *"ícone que é o único
conteúdo de um botão leva `aria-label`"*. No port do DataCoreHS o `aria-hidden`
passou a ser derivado: só é emitido quando não há `aria-label` nem
`aria-labelledby`.

**`components/core/Card.d.ts` — `CardHeaderProps` não compila.** A interface
estende `React.HTMLAttributes<HTMLDivElement>` e redeclara `title?: React.ReactNode`.
Mas `HTMLAttributes` já declara `title?: string`, o atributo nativo de tooltip do
HTML, e os dois tipos colidem: TypeScript recusa com TS2430. No port ficou
`Omit<React.HTMLAttributes<HTMLDivElement>, "title">`. Vale checar se outros
`.d.ts` da biblioteca repetem o padrão de redeclarar um atributo nativo.

**`components/forms/Select.jsx` — a seta traz cor cravada.** O chevron é uma
imagem de fundo em `data:image/svg+xml` com o cinza escrito em hexadecimal
(`%2394a3b8`). Cor enterrada em string não sai de token, não acompanha troca de
tema e nenhum teste de guarda a alcança. No port do DataCoreHS a seta virou o
componente `Icon`, que herda `currentColor`.

**`components/feedback/Alert.jsx` e `Toast.jsx` — nomes divergentes para a mesma
variante.** O `Alert` chama a variante de erro de `danger`; o `Toast` chama de
`error`. São componentes vizinhos, que aparecem na mesma tela. Cada port seguiu o
seu `.d.ts`, porque inventar consistência aqui criaria divergência com a origem —
mas a origem devia escolher um dos dois.

**Os `.d.ts` redeclaram nomes de atributo nativo do HTML, e isso quebra.** Não são
casos isolados: é padrão. Uma auditoria dos 21 arquivos encontrou sete que
redeclaram um nome que o HTML já usa sobre `extends *HTMLAttributes`. Dois não
compilam — `CardHeaderProps` (`title?: ReactNode` sobre `title?: string`) e
`TabsProps` (`onChange` próprio sobre `FormEventHandler`), ambos TS2430. Um
terceiro, `AlertProps`, passa **por coincidência**: declara `title?: string`, que
casa com o tipo nativo — se alguém trocar para `ReactNode` amanhã, quebra igual.

Isso é invisível no Claude Design porque lá os componentes são `.jsx` sem tipos:
os `.d.ts` nunca são compilados. Eles documentam uma API que só é testada quando
alguém porta para TypeScript.

**`components/forms/Input.jsx` e irmãos — `id` derivado do rótulo por slug.** O
original monta o `id` com `label.toLowerCase().replace(/\s+/g, "-")`. Dois campos
de mesmo rótulo na mesma tela colidem, e acento produz `id` inválido. No port o
`id` sai de `React.useId()`, com a prop `id` explícita tendo precedência.

## Achados da Fase 1 — o que a Fase 3 precisa saber

A Fase 1 portou os 21 primitivos e migrou seis telas piloto. O que ela aprendeu,
e que vale para as doze telas grandes:

**Portar não é traduzir estilo.** Todo componente interativo do design system
precisou de acréscimo de acessibilidade que o original não tinha: `focus-visible`
em tudo, teclado inteiro no `SearchSelect`, ordenação alcançável por teclado na
`Table`, prisão e devolução de foco no `Modal`, `aria-describedby` no `Tooltip`,
`role="tabpanel"` e navegação por seta no `Tabs`, nome acessível no `Progress`.
Cada um desses, se não tivesse sido feito aqui, iria multiplicado para as doze
telas.

**O teste de caracterização acha defeito que já estava lá.** Na Task 14, cinco de
nove asserções falharam contra o código **original**: os campos do `Login` não
tinham `<label>` e o interruptor do `Configuracoes` não tinha nome acessível. Não
era a migração quebrando — era defeito antigo que só aparece quando alguém
escreve um teste que pergunta pelo rótulo. Espere o mesmo nas telas grandes.

**Cuidado com token que reage ao tema em superfície que não reage.** O `Login` é
painel escuro nos dois temas. Usar `Input`, `Card` ou `Alert` ali produziria
texto de baixo contraste, porque `--on-tint-danger` é vermelho escuro no tema
claro. A regra: antes de trocar por primitivo, verifique se a superfície em volta
acompanha o tema.

**O critério de lint é "não subir", não "cair".** A Fase 1 fechou em 190, contra
a linha de base de 192. Mas quatro das seis telas piloto não reduziram nada,
porque já tinham zero achado — o ESLint não audita uso de cor nem de token. Quem
faz isso são os cinco testes de guarda.

**Texto de erro tem de casar com a condição que o produziu.** O `Bloqueio.tsx` é
devolvido por cinco guardas de rota, e nenhum é exclusivo de administrador —
aplicar ali a frase "restrita a administradores" faria a tela mentir. A condição
mora no `router.tsx`; leia antes de escrever a mensagem.

### Decisão pendente

O `Bloqueio.tsx` hoje mostra um texto genérico, correto para os cinco casos que o
produzem. A alternativa é ele receber a mensagem por prop, e cada guarda de rota
passar a sua. É decisão de produto, não defeito — e cabe naturalmente na Fase 2,
que unifica os guardas numa matriz de permissão.

## Defeitos encontrados no próprio Design System

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

---

## Achados da Fase 2

A fase entregou o que estava previsto — matriz de permissões, providers por rota,
code splitting, `services/` tipado. O que não estava previsto foi o que ela
encontrou pelo caminho.

### O menu mentia para dois papéis

O grupo "Comercial" da Sidebar aparecia para **qualquer** usuário: `mostrar: true`
fixo, sem consultar papel nenhum. Na prática, quem tinha papel `servicos` via
"Vendas", "Clientes", "Produtos" e "Vendedores" no menu e batia em "Acesso negado"
ao clicar; quem tinha papel `vendas` via "Serviços". Antes da sessão carregar, o
menu exibia 8 itens e depois se corrigia.

**Não era vazamento de acesso** — as rotas sempre bloquearam. Era menu levando a
beco sem saída. Sobreviveu tanto tempo porque `admin` e `financeiro` abrem o
Comercial inteiro, e são justamente as contas que mais se usa para testar.

Achado pelo teste de invariante da Task 4, que falhou em 12 dos 40 casos antes de
qualquer refatoração. Esse teste deriva as personas da própria matriz e lê o menu
renderizado sem enumerar item nenhum — papel novo na matriz ou item novo na
Sidebar entram na varredura sozinhos.

### `updateUserPassword` saía sem autenticação

`services/api.ts` usava `axios` cru em vez da instância com interceptor. Todas as
outras funções do arquivo usavam a instância corretamente; só essa escapou. A
requisição de troca de senha ia **sem cabeçalho `Authorization`**.

**Fica em aberto, e não se resolve no front:** ou a API estava recusando a troca
(funcionalidade quebrada em silêncio), ou estava aceitando troca de senha sem
autenticação (endpoint aberto). Precisa ser checado contra a API.

### O spec estava errado sobre o `services/`

O texto da Fase 2 pedia "uma instância `axios` única". Segui-lo quebraria o
sistema: são dois backends distintos, `VITE_API_URL` (`authapi`) e
`VITE_NOTAS_URL` (`tinyapi`). O que se compartilha é o **interceptor**, e a forma
certa é uma fábrica. Há teste travando isso — quem "unificar" no futuro quebra a
suíte.

### Correções de rota do próprio refactor

Duas decisões de implementação foram revertidas por mim depois de entregues, e
valem como registro de critério:

**O `import Bloqueio` que eu mandei mover.** Instruí subir o import da linha 41
para o topo do `router.tsx`. Depois da troca dos guardas, o arquivo não
referenciava mais `Bloqueio` — a instrução tinha ficado obsoleta no meio da
própria task. O executor apagou em vez de mover, e estava certo.

**O carregamento caseiro.** A Task 5 criou `src/paginas-lazy.tsx` em vez de usar
`React.lazy`, porque o teste de caracterização lê o DOM sem `await`. Era código de
produção moldado pela sincronicidade de um teste. A causa foi uma regra minha
escrita larga demais — "não edite `acesso-atual.test.tsx`" —, que existe para
impedir o **enfraquecimento** da rede de segurança, não para proibir um `await`.
Trocado pelo `React.lazy` depois, com prova de que nenhuma asserção mudou.

### Um buraco na cobertura dos guardas

O refactor removeu Tailwind cru com cor cravada (`text-gray-500`, `text-red-600`)
dos seis guardas, e **nenhuma ferramenta registrou**: o `router.tsx` não aparecia
no relatório do ESLint, e o `guarda-cores` da Fase 1 só acusa hexadecimal
arbitrário e opacidade sobre token. Classe de paleta crua do Tailwind passa pelos
dois. Vale estender o guarda antes da Fase 3, que vai mexer em 12 telas cheias
disso.

### Números

| | Antes da Fase 2 | Depois |
|---|---|---|
| Suíte | 184 testes / 47 arquivos | **489 / 55** |
| Lint | 190 problemas | **176** |
| `router.tsx` | 255 linhas, 6 guardas dentro | **190 linhas, zero** |
| Providers globais | 10 | **2** |
| Build | 1 chunk, 1.697 kB | **41 chunks, entrada 305 kB** |

---

## Estado em 31/08/2026 — fim do domingo

**Fases 0, 1 e 2 fundidas na `main` local. Fase 3 com 5 das 12 telas.**
112 commits à frente do `origin/main`. **Nada empurrado.**

Suíte **1073 testes / 68 arquivos** (verdes também com `TZ=UTC` e
`TZ=America/Sao_Paulo`), lint **143** (baseline original 192), `tsc` limpo,
build em 6,4 s.

### Telas da Fase 3

| # | Tela | Estado |
|---|---|---|
| 1 | Dashboard (Meta do trimestre) | **feita** — 330 → 110 linhas |
| 2 | Locação | **feita** — 386 → 108 linhas |
| 3 | Usuários | **feita** — 457 → 167; firmou o padrão de modal |
| 4–5 | ContasReceber · ContasPagar | **feitas** — 802 → 73 e 839 → 65; unificadas |
| 6 | Financeiro + CentroCustoTab + MetaTab | próxima; única com abas |
| 7–10 | Produtos · Serviços · Vendedores · Estoque | mesma anatomia |
| 11 | Clientes | idem, com dado enriquecido |
| 12 | Vendas | maior e mais crítica, por último |

### A receita, provada em cinco telas

1. **Teste de caracterização antes de mover uma linha**, observando a tela
   renderizada — nunca exportando função só para testar.
2. **Provar que o teste enxerga**: plantar a quebra, ver falhar, reverter. Sem
   essa prova a task não está entregue.
3. Quebrar em componentes por responsabilidade, com a conta pura em arquivo
   próprio.
4. Zerar `dark:` e paleta crua; tirar a tela de `PENDENTES_FASE_3`.
5. Checklist de 10 itens respondido **um a um**, nunca em bloco.
6. Verificar no navegador nos dois temas, incluindo vazio, carregando e erro.
7. **Novo, a partir das gêmeas:** tirar a tela do `.prettierignore` e formatar,
   no seu próprio commit. Ver "Dívida do prettier" abaixo.

### O que as gêmeas acrescentaram à receita: separar unificar de corrigir

ContasReceber e ContasPagar tinham **83% das linhas idênticas** (277 divergentes
em 1641). Foram em duas fases, e a separação é o que deu a garantia:

- **Fase 1 — unificar sem mudar comportamento.** Critério de sucesso: os **231
  testes de caracterização passam sem UMA edição**. Passaram. É a prova de que a
  unificação não mexeu em nada — controle que as três telas anteriores não
  tiveram, porque nelas teste e refatoração vinham no mesmo fôlego.
- **Fase 1b — as 5 divergências acidentais**, cada uma com asserção mudada de
  propósito e autorizada uma a uma.
- **Fase 2 — os 18 defeitos**, cada um com plantação provando o comportamento
  novo.

Corrigir junto com unificar teria tornado impossível saber qual dos dois quebrou.

### O que ficou compartilhado

Cada tela virou uma casca de ~70 linhas sobre `src/pages/contas/`. As **duas
divergências de domínio viraram um `DialetoDeContas`** de três campos, em vez de
um `if` repetido em seis lugares:

| | Contas a Receber | Contas a Pagar |
|---|---|---|
| `situacoesQuitadas` | `["recebido", "pago"]` | `["pago"]` |
| `campoDaEmissao` | `"data"` | `"data_emissao"` |
| `chaveQuitado` | `"recebido"` | `"pago"` |

`campoDaEmissao` guarda o **nome** do campo, não um acessador: a tabela precisa
do nome para ordenar, e antes o nome vivia na lista de colunas e o acessador no
dialeto — dava para filtrar por um campo e ordenar por outro sem ninguém ver.

Nasceram também `src/lib/datas.ts` (data de calendário, já usado por Locação e
Usuários), `src/lib/dinheiro.ts` e dois primitivos.

### Primitivos que as sete telas restantes herdam

- **`Modal` com prop `erro`** e a regra "monte o diálogo só quando aberto"
  (da tela 3).
- **`Pagination` retorna `null` com zero resultados** — paginar o nada não
  significa nada, e a tabela já diz que está vazia. **Pressupõe `TableEmpty` no
  consumidor**, e está no docblock: as seis listagens antigas têm paginação
  própria e precisam ganhar o estado vazio ao migrar.
- **`ChartEmpty`**, irmão do `TableEmpty`, com `height` obrigatório — um padrão
  acertaria num gráfico e erraria nos outros, e o cartão pularia de tamanho.
  **Não distingue lista vazia de falha de carregamento**, de propósito: o
  componente vê uma série vazia e não sabe a causa; quem sabe é a página, que já
  tem o `Alert` dizendo.
- **Padrão de erro de rede, decidido nas gêmeas e válido para as restantes:**
  `Alert variant="danger"` no fluxo da página, texto vindo do contexto — **não
  Toast**. Falha de carga é estado permanente até recarregar, e toast some em 4 s
  deixando a pessoa diante de uma tela vazia sem explicação. Toast fica para
  confirmação de ação que a pessoa acabou de tomar.

### Defeitos encontrados nas cinco telas

Nenhum era conhecido antes. Todos apareceram porque o teste veio primeiro. Os
das gêmeas estão detalhados em `docs/superpowers/2026-08-31-contas-achados.md`
(14 compartilhados, 4 de tela única, 5 divergências acidentais).

**Dashboard e Locação:**

- **Projeção da meta superestimava 12%** — extrapolação linear por dia ignorando
  que setembro vale 55% de julho. Diferença entre projetar 74% e 66% da meta,
  num painel que decide bonificação.
- **Datas da planilha de locação saíam um dia antes.** Toda planilha já emitida
  está errada.
- **Comparador de ordenação nunca devolvia 0**; **nota cancelada em selo verde**;
  **`setInterval` do confete nunca limpo**; **lista vazia com `<ul>` mudo**.

**Usuários:**

- **O `<select>` de perfil mostrava um papel e o POST gravava outro.**
- **`handleTrocarSenha` sem `try/catch`** — a promessa rejeitada derrubava a
  suíte inteira; era por isso que o caminho de falha não tinha teste.
- **`ModalTrocarSenha` não desmontava**: a senha de um usuário reaparecia no
  formulário de outro.
- **A troca de senha não tinha mínimo de caracteres** — dava para gravar senha
  vazia num usuário existente.

**Gêmeas — os quatro que mais importam:**

- **`"1.234"` virava R$ 1,23** no `converterParaNumero` de Contas a Receber —
  ponto de milhar lido como decimal. Agora em `src/lib/dinheiro.ts`.
- **Os presets misturavam mês local com dia em UTC.** Às 23h de 31/08, "Mês
  atual" virava 01/08 a 01/09; na virada do ano, "Ano atual" virava o ano
  anterior inteiro.
- **O nome do arquivo exportado saía em UTC** — quem exporta à noite arquiva com
  a data do dia seguinte.
- **"Vencida" apagava a situação real**, na tela e na planilha.

### Os KPIs de dinheiro: o que mudou e o que a conferência mostrou

`Total em Aberto` somava **saldo** e `Total Recebido/Pago` somava **valor
cheio** só das quitadas, então o que entrou numa conta parcial não aparecia em
lugar nenhum. Agora:

- `Total em Aberto` = saldo das não quitadas
- `Total Recebido/Pago` = `valor − saldo` de **todas**
- `aberto + quitado = faturado`, e a **Média Mensal Faturada** passou a ser uma
  grandeza real (o rótulo mudou junto)
- os três gráficos usam a mesma base, então o topo da tela fecha com o gráfico

**Conferido contra o banco de produção em 31/08/2026 (leitura):** nenhuma conta
quitada tem saldo sobrando (928 em contas_receber, 8.337 em contas_pagar, todas
zero), e **não existe pagamento parcial** (0 de 467 abertas e 0 de 226). Ou seja:
a correção está certa e blinda o caso, mas **hoje não muda nenhum número que
alguém esteja vendo errado**. A base também só tem `pago` e `aberto` — a palavra
`recebido` **nunca aparece**, então a divergência de domínio nº 1 é inerte na
prática.

**A suposição sobre `contas_receber.data` saiu do limbo:** 1.392 de 1.395 linhas
têm `data <= vencimento`, o que é comportamento de data de emissão. **Ficam 3
linhas com `data > vencimento`** — vale um olhar: ou é lançamento retroativo
normal, ou é sujeira.

### Conferência no navegador (31/08)

Feita com mock local servindo **dados reais** puxados do banco — a produção não
foi tocada. Sem `VITE_API_URL`/`VITE_NOTAS_URL` o app aponta para
`authapi`/`tinyapi` de produção, e dirigir modal de exclusão contra dado real não
é opção.

Os **dez KPIs das duas telas foram recalculados por fora, dos dados crus, e
batem à vírgula**. A coerência nova se confirma na tela: em Contas a Receber,
299.245,45 + 45.425,00 = 344.670,45, dividido por 4 meses de emissão = 86.167,61,
exatamente o que a tela mostra.

### Dívida do prettier

`.prettierignore` ignora `src/pages`, `src/components`, `src/context`,
`src/services` e `src/hooks` desde a Fase 0, para não destruir o `git blame` das
telas não migradas — e o próprio comentário do arquivo diz que **cada entrada sai
quando a tela correspondente migrar**. As cinco telas já migradas passaram batido,
e hoje estreitar `src/pages` reformataria **48 arquivos** de uma vez, incluindo os
de caracterização.

O prettier **não** está quebrado: tudo que nunca foi ignorado passa no `--check`,
e o `printWidth: 80` é real. A trava mecânica (`src/test/prettierignore.test.ts`)
protege só `src/design-system`, que é cópia sincronizada e não deve mesmo ser
formatada.

**A partir da tela 6, tirar do `.prettierignore` e formatar entra na receita**, em
commit próprio, para a dívida parar de crescer. As 48 já acumuladas são item à
parte.

### Fase 4 — os blocos que as seis telas repetem

Decidida em 01/09/2026, antes de retomar a Fase 3: as seis telas restantes
repetem 737 linhas de `MultiSelect`, mais paginação, exportação, preset de
período e `useIsMobile`. Extrair vira fase própria em vez de acontecer durante
cada migração, para a decisão de API ser tomada uma vez olhando os seis usos.
Ver `2026-09-01-fase-4-blocos-comuns-design.md`.

### Item 2 da Fase 4 — `Pagination` fechado (03/09/2026)

As seis telas que ainda rolavam a própria paginação — Clientes, Estoque,
Produtos, Serviços, Vendas e Vendedores — passaram a consumir o `Pagination`
do design system e o hook novo `src/hooks/usePaginacao.ts`, com `TableEmpty`
no `<tbody>`. O primitivo ganhou a forma compacta de celular que antes só
existia dentro das seis cópias, e Contas — a única consumidora até aqui —
herdou o rodapé compacto sem ter pedido.

Os três defeitos que a medição achou nas seis cópias morreram na adoção: a
frase de contagem, presa em `{totalPaginas > 1 && ...}`, sumia para quem tinha
uma página só; não havia estado vazio, e filtro sem resultado deixava a tabela
muda; e a página não voltava para a 1 ao filtrar — na página 7 de 84 produtos
filtrando para 20, o rodapé escrevia "Mostrando 61 a 20 de 20 registros", com
o intervalo invertido, e o botão Próxima seguia habilitado porque comparava
`7 === 2`.

As seis tiveram **229 inserções e 699 remoções** (líquido −470) contra a
previsão de ~687; a branch inteira soma **16 arquivos, 1438 inserções, 703
remoções** em 29 commits. Suíte em **1426 testes / 92 arquivos** (entrada:
1373/85), lint em **119** — idêntico ao baseline, não subiu —, `tsc --noEmit`
limpo.

Duas divergências foram preservadas de propósito (tamanho de página e
substantivo da contagem), e a forma compacta que Contas herdou de graça é item
novo para a conferência no navegador, que segue pendente desde o item 1 — ver
`2026-09-01-multiselect-divergencias.md`.

### Em aberto

1. **A pergunta da API, adiada pelo Erick e a mais séria:** o `PUT /users/{id}`
   aceita troca de senha sem `Authorization`? O cliente manda o token sempre, mas
   se o endpoint for aberto isso não protege ninguém.
2. **As 3 linhas de `contas_receber` com `data > vencimento`.**
3. **Dívida do prettier: 48 arquivos**, mais a regra nova na receita.
4. **`ordenarContas` usa `localeCompare` sem locale** — a correção 1.11 foi sobre
   a lista de opções; a ordenação da tabela ficou de fora do pedido.
5. **`converterParaNumero` duplicado** em `src/pages/Servicos.tsx` e
   `src/context/ServicosContext.tsx`, com o mesmo bug do `1.234`.
   `src/lib/dinheiro.ts` está pronto para elas.
6. **`MultiSelect` ainda não é primitivo** — a cópia está em 8 telas. Promover
   agora seria decidir a API vendo 2 dos 8 usos; quando as seis migrarem, é um
   `git mv`.
7. **`ModalObservacoes`** (`src/components/`) ainda é modal cru, usado por Vendas,
   Serviços e Vendedores. O padrão de modal já está pronto para quando chegarem.
8. **Contraste da caixa de erro do Login** em ~3,6:1, abaixo de AA para corpo.
9. **Confete não respeita `prefers-reduced-motion`** (é `<canvas>`).
10. **`react-hooks/set-state-in-effect`** no `useEffect` que busca dados — vale
    para as telas restantes.
11. **Checkpoint humano de permissões da Fase 2** nunca foi feito.
12. **`docs/DataCoreHS.html`** segue fora do versionamento, sem decisão.
