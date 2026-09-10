# Reaplicação da migração de Produtos sobre o `origin/main`

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA — usar
> superpowers:subagent-driven-development. Os passos são checkbox (`- [ ]`).

**Objetivo:** devolver a decomposição de `src/pages/Produtos.tsx` em
`src/pages/produtos/`, agora em cima da fonte de dados agregada que a outra
frente de trabalho colocou no `origin/main`, sem desfazer nada do que ela fez.

**Arquitetura:** a tela para de ler `useData()` (notas inteiras no navegador) e
passa a ler `useFiltrosComerciais()` + `useResumoComercial(recorte)` — a
agregação vem somada do Postgres. A decomposição em cinco componentes mais a
conta pura em `produtos.ts` continua valendo; o que muda é que boa parte da
conta pura **deixa de existir**, porque o banco passou a fazê-la.

**Spec:** `docs/superpowers/specs/2026-08-25-datacorehs-design-system-design.md`
(a receita da Fase 3 e o checklist de tela migrada).

**Plano original desta tela:** `docs/superpowers/plans/2026-09-08-fase-3-produtos.md`
— é dele que sai a decomposição que estamos reaplicando.

## Contexto: por que reaplicar em vez de mergear

O `main` local ficou 79 commits sem `push`. Uma sessão irmã, partindo de um
`origin/main` que nunca viu esse trabalho, reescreveu a fonte de dados de
Clientes, Produtos e Vendas. **O trabalho dela está pushado e é para ser
preservado** — não é candidato a `git revert`, `git checkout --theirs`, nem a
"volta a versão antiga que era melhor".

A boa notícia, medida antes de escrever este plano: a mudança dela em
`Produtos.tsx` é de 80 linhas somadas e 150 apagadas, e cai **exatamente** em
cima dos `useMemo` que a nossa migração extraiu. Do `// Ranking de produtos por
valor` (linha 256 da versão dela) para baixo, o arquivo dela é igual ao que a
nossa migração decompôs. Ou seja: KPIs, ranking, tabela, ordenação e exportação
sobrevivem intactos.

## Global Constraints

- Código, comentários e interface em **português do Brasil**.
- Commits em português, conventional commits, **sem acento** na mensagem.
- **Não existe alias `@/`** neste repositório — de `src/pages/` para a pasta
  irmã é `./produtos`, para `src/hooks` é `../hooks`.
- **Não reescrever histórico.** Nada de `git reset`, `commit --amend`,
  `rebase -i`. Errou um commit? Faz outro por cima.
- **Não fazer `push` nem merge.** Isso é decisão do Erick.
- A suíte tem de passar **nos dois fusos**: `TZ=UTC npm test` e
  `TZ=America/Sao_Paulo npm test`, zero pulados.
- `npx tsc --noEmit` limpo. O lint **não pode subir** (base: 58 problemas).
- **Mover é mover.** No commit que move código não se corrige nada. Defeito
  encontrado vira comentário `Achado ao mover (não corrigido)` e continua vivo.
- `PENDENTES_FASE_3` (em `src/test/guarda-cores.test.ts`) **só encolhe**.

---

### Task 1: A rede de segurança — caracterizar antes de mover uma linha

**Arquivos:**
- Criar: `src/pages/Produtos.kpis.test.tsx`
- Criar: `src/pages/Produtos.tabela.test.tsx`
- **Não tocar** em `src/pages/Produtos.tsx` (a não ser para plantar e reverter)

**Interfaces:**
- Consome: `criarHooksFalsos`, `resumoDeProdutos` de `./comercial/hooksFalsos`
- Produz: dois arquivos de teste que os passos seguintes usam como rede

Os dois arquivos já existem, escritos contra a fonte de dados antiga, em
`main:src/pages/Produtos.kpis.test.tsx` e `main:src/pages/Produtos.tabela.test.tsx`.
O trabalho aqui é trazê-los e trocar a falsificação.

- [ ] **Passo 1: Ler os três testes dela, que já usam a fonte nova**

`src/pages/Produtos.periodo.test.tsx`, `Produtos.paginacao.test.tsx` e
`Produtos.multiselect.test.tsx`. O cabeçalho de `vi.mock` deles é o padrão a
copiar. Ler também `src/pages/comercial/hooksFalsos.ts` inteiro — o docblock
explica por que se moca o **hook** e não a rede.

- [ ] **Passo 2: Trazer os nossos dois arquivos**

```bash
git checkout main -- src/pages/Produtos.kpis.test.tsx src/pages/Produtos.tabela.test.tsx
```

- [ ] **Passo 3: Trocar a falsificação nos dois**

Sai o mock do `DataContext`:

```ts
vi.mock("../context/DataContext", () => ({ useData: () => ({ notas: NOTAS, carregando: false }) }));
```

Entra o padrão dela:

```ts
vi.mock("./comercial/useComercial", async (original) => {
  const real = await original<typeof import("./comercial/useComercial")>();
  const { criarHooksFalsos, resumoDeProdutos } = await import("./comercial/hooksFalsos");
  return { ...real, ...criarHooksFalsos(NOTAS, resumoDeProdutos) };
});
```

Os fixtures `NOTAS` precisam ficar dentro de `vi.hoisted`, como nos dela — a
fábrica do `vi.mock` roda antes dos imports do arquivo.

- [ ] **Passo 4: Rodar e ajustar as asserções que a fonte nova mudou**

```bash
npx vitest run src/pages/Produtos.kpis.test.tsx src/pages/Produtos.tabela.test.tsx
```

Uma diferença **conhecida e legítima**: a agregação dela inclui item **sem
código** (a versão antiga descartava com `if (!item.codigo) return`). Se um
fixture tiver item sem código, a contagem muda. Ajustar a asserção ao
comportamento novo, com comentário dizendo que a mudança é dela e é proposital.

Qualquer outra divergência **não é para ajustar calado**: registrar no relatório.

- [ ] **Passo 5: Plantar, ver falhar, reverter — um por arquivo**

Sem esta prova a task não está entregue. Em `src/pages/Produtos.tsx`:

- para o `kpis.test`: trocar `valorMedio: p.quantidade > 0 ? p.valor / p.quantidade : 0`
  por `valorMedio: 0`. Rodar. **Tem de falhar.** Reverter com
  `git checkout -- src/pages/Produtos.tsx`.
- para o `tabela.test`: inverter a direção da ordenação inicial
  (`direcao: "desc"` → `"asc"`). Rodar. **Tem de falhar.** Reverter igual.

Se um deles passar com a quebra plantada, o teste não enxerga o que diz
enxergar — **conserte o teste**, não a plantação, e plante de novo.

- [ ] **Passo 6: Confirmar que a árvore está limpa fora dos dois testes**

```bash
git status --porcelain
```
Só os dois arquivos novos. Se `Produtos.tsx` aparecer, a reversão da plantação
falhou.

- [ ] **Passo 7: Commit**

```bash
git add src/pages/Produtos.kpis.test.tsx src/pages/Produtos.tabela.test.tsx
git commit -m "test(produtos): caracterizacao dos kpis e da tabela sobre a fonte agregada"
```

---

### Task 2: Mover — a decomposição em cima da fonte nova

**Arquivos:**
- Criar: `src/pages/produtos/CabecalhoProdutos.tsx`, `FiltrosDeProdutos.tsx`,
  `KpisDeProdutos.tsx`, `GraficosDeProdutos.tsx`, `TabelaDeProdutos.tsx`
- Criar: `src/pages/produtos/produtos.ts`, `src/pages/produtos/produtos.test.ts`
- Modificar: `src/pages/Produtos.tsx` (920 linhas → casca)

**Interfaces:**
- Consome: `useFiltrosComerciais`, `useResumoComercial`, `RecorteComercial` de
  `./comercial/useComercial`; `useIsMobile` de `../hooks/useIsMobile`
- Produz: `src/pages/produtos/produtos.ts` com os tipos e funções abaixo

- [ ] **Passo 1: Trazer a decomposição como ela ficou**

```bash
git checkout main -- src/pages/produtos/
```

Isso traz os cinco componentes, o `produtos.ts` e o `produtos.test.ts`. Os
**cinco componentes não precisam de mudança** — eles recebem tudo por prop e não
sabem de onde o dado veio. Confirme isso lendo-os antes de assumir.

- [ ] **Passo 2: Podar de `produtos.ts` o que o banco passou a fazer**

Estas funções **morrem**, porque o Postgres passou a fazer a conta:

| Função | Quem faz agora |
|---|---|
| `opcoesDeFiltro(notas)` | `useFiltrosComerciais().opcoes` |
| `filtrarNotas(...)` | o `recorte` que vai para o servidor |
| `agregarProdutos(...)` | `resumo.por_produto` |

A interface `Nota` morre junto, se ninguém mais a usar — confira com `grep`
antes de apagar.

`evolucaoPorMes` **não morre inteira**: ela tem duas metades. A primeira
percorre as notas somando por mês — essa morre. A segunda agrupa por ano quando
passa de 24 meses (`if (dadosMensais.length > 24)`) — **essa fica**, porque o
banco devolve mês a mês e o agrupamento anual continua sendo da tela.

- [ ] **Passo 3: Escrever em `produtos.ts` as funções puras que nasceram na versão dela**

Ela colocou estas contas soltas dentro do componente. Pela receita da Fase 3 elas
são conta pura e moram no `.ts`. Ler `origin/main:src/pages/Produtos.tsx`
linhas 124-200 e mover de lá — **movendo, não reescrevendo**:

- `rotuloDoCliente(c)` e `rotuloDoProduto(p)` — os rótulos que o `MultiSelect`
  mostra e devolve.
- `indicesDeRotulo(opcoes)` — os dois `Map` (`idPorRotulo`, `chavePorRotulo`)
  que traduzem o rótulo escolhido de volta para o id/chave que o servidor quer.
- `recorteDeProdutos(filtros, indices)` — monta o `RecorteComercial`.
- `produtosDoResumo(porProduto)` — converte `resumo.por_produto` em
  `ProdutoAgregado[]`.
- `evolucaoDoResumo(evolucaoMensal)` — converte `resumo.evolucao_mensal` em
  `PontoDeEvolucao[]` **e aplica o agrupamento anual acima de 24 meses** que
  sobreviveu do passo anterior.

Estas **sobrevivem sem uma edição** (ela não mexeu nelas): `calcularKpis`,
`rankingPorValor`, `ordenarEBuscar`, `linhasDaPlanilha`, e os tipos
`ProdutoAgregado`, `KpisDeProduto`, `PontoDeEvolucao`, `OrdenacaoDeProdutos`.

- [ ] **Passo 4: Reescrever `Produtos.tsx` como casca**

A casca de referência é `main:src/pages/Produtos.tsx` (196 linhas). A diferença:
onde ela lia `useData()` e chamava `opcoesDeFiltro`/`filtrarNotas`/
`agregarProdutos`, agora chama os hooks do Comercial e as funções do Passo 3.

Preservar, da versão dela, **sem reescrever**:
- os comentários que explicam por que a tabela pagina no navegador e por que a
  agregação passou a incluir item sem código;
- `const isMobile = useIsMobile()` e todos os consumos dele;
- o `carregando` — agora vem de `useResumoComercial`, não do `DataContext`.

Manter os `useMemo` na casca em volta das funções puras. O motivo está no
docblock de `src/hooks/usePaginacao.ts`: a lista precisa manter identidade entre
renders, senão a paginação estoura em "Too many re-renders".

- [ ] **Passo 5: Ajustar `produtos.test.ts` ao que sobrou**

Apagar os testes das funções que morreram; manter os das que sobreviveram;
escrever teste para as cinco que nasceram no Passo 3. Cada função nova precisa
de um teste que **falhe** se ela for quebrada — plantar e ver.

- [ ] **Passo 6: Os cinco arquivos de teste da tela, verdes**

```bash
npx vitest run src/pages/Produtos.kpis.test.tsx src/pages/Produtos.tabela.test.tsx \
  src/pages/Produtos.periodo.test.tsx src/pages/Produtos.paginacao.test.tsx \
  src/pages/Produtos.multiselect.test.tsx src/pages/produtos/produtos.test.ts
```

**Os três dela têm de passar sem uma edição.** Se um deles precisar de mudança,
a decomposição mudou comportamento — pare e reporte antes de editar o teste.

- [ ] **Passo 7: `tsc` e a suíte inteira**

```bash
npx tsc --noEmit
TZ=UTC npm test 2>&1 | tail -4
TZ=America/Sao_Paulo npm test 2>&1 | tail -4
```

- [ ] **Passo 8: Commit**

```bash
git add src/pages/Produtos.tsx src/pages/produtos/
git commit -m "refactor(produtos): a tela vira casca sobre pages/produtos, lendo o resumo agregado"
```

---

### Task 3: Limpar — tokens e a saída de `PENDENTES_FASE_3`

**Arquivos:**
- Modificar: `src/pages/Produtos.tsx` e os cinco de `src/pages/produtos/`
- Modificar: `src/test/guarda-cores.test.ts`

Separado da Task 2 de propósito: se um teste ficar vermelho, o commit diz qual
dos dois passos quebrou.

- [ ] **Passo 1: Achar o que ainda é paleta crua ou `dark:`**

```bash
grep -n "dark:\|text-gray-\|bg-gray-\|text-slate-\|bg-slate-\|text-blue-\|bg-blue-" \
  src/pages/Produtos.tsx src/pages/produtos/*.tsx
```

- [ ] **Passo 2: Trocar por classe de token**

`bg-surface`, `bg-surface-base`, `text-conteudo`, `text-conteudo-muted`,
`border-borda`, `text-action`. **Sem modificador de opacidade** em classe de
token (`bg-surface/40` não gera regra — há guarda para isso). Sem hexadecimal
cravado. Cor de gráfico vai por prop, via `src/design-system/chartTheme.ts`.

- [ ] **Passo 3: Tirar a linha da lista**

Em `src/test/guarda-cores.test.ts`, apagar `"src/pages/Produtos.tsx"` de
`PENDENTES_FASE_3`. A lista **só encolhe**. O guarda tem armadilha reversa:
arquivo listado que já está limpo **falha** a suíte.

- [ ] **Passo 4: Suíte e commit**

```bash
npx vitest run src/test/
TZ=UTC npm test 2>&1 | tail -4
git add -A && git commit -m "refactor(produtos): a tela sai de PENDENTES_FASE_3"
```

---

### Task 4: O prettier, em commit próprio

A receita manda formatar em commit separado — misturado com mudança de conteúdo,
o diff fica ilegível.

- [ ] **Passo 1: Tirar do `.prettierignore`**

Apagar as linhas de `src/pages/Produtos.tsx` e `src/pages/produtos/`, se
existirem.

- [ ] **Passo 2: Formatar**

```bash
npx prettier --write src/pages/Produtos.tsx src/pages/produtos/ \
  src/pages/Produtos.kpis.test.tsx src/pages/Produtos.tabela.test.tsx
```

- [ ] **Passo 3: Conferir que só mudou espaço em branco**

```bash
git diff --stat
git diff -w --stat
```
O segundo tem de vir **vazio**. Se não vier, o prettier mudou conteúdo — pare e
reporte.

- [ ] **Passo 4: Suíte, e commit**

```bash
TZ=UTC npm test 2>&1 | tail -4
TZ=America/Sao_Paulo npm test 2>&1 | tail -4
npx tsc --noEmit
npm run lint 2>&1 | grep problems
git add -A && git commit -m "style(produtos): prettier na tela e nos componentes"
```
