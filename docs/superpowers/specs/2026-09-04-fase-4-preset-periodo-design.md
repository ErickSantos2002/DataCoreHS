# O preset de período vira `src/lib/periodo.ts`

Decidido em 04/09/2026, logo depois de fechar o item 3. É o **item 4 da Fase 4**,
adendo ao `2026-08-25-datacorehs-design-system-design.md`, que governa a
modernização, e continuação de `2026-09-01-fase-4-blocos-comuns-design.md`.

## Este item não é extrair — é adotar

Os três itens anteriores extraíram uma peça que não existia: o `MultiSelect`
virou primitivo, o `Pagination` foi adotado de um primitivo que a Fase 1 tinha
construído, e o `baixarPlanilha` nasceu do esqueleto repetido em nove telas.

Aqui a peça **já existe, já está certa e já está testada**.
`pages/contas/contas.ts` tem `periodoDoPreset(preset, agora)`, função pura
escrita durante a Fase 3, com 11 asserções, duas delas exercitando a virada do
dia e a do ano. Ela já respondeu esta mesma pergunta, e respondeu diferente do
que o resto do app responde. O item é fazer as cinco telas restantes adotarem a
resposta que Contas já deu.

É a mesma jogada do item 2, e é por isso que ele apaga pouca linha: cerca de
**160**, cinco blocos de 32 linhas byte a byte idênticos.

## O que se repete, e onde está a divergência

Cinco telas — `Clientes`, `Produtos`, `Servicos`, `Vendas` e `Vendedores` —
carregam o mesmo `useEffect` de 32 linhas. Eles são **byte a byte idênticos**:
mesmo `md5`, mesma indentação, mesmos comentários. Não há uma única divergência
entre as cinco.

Isso é diferente do `MultiSelect`, que eram seis peças que discordavam entre si.
Aqui **toda a divergência é contra Contas**:

| | As cinco telas | Contas (`periodoDoPreset`) |
|---|---|---|
| Chave `30dias` | rotulada **"Mês atual"**, devolve 1º do mês → hoje | rotulada **"Últimos 30 dias"**, devolve 30 dias atrás → hoje |
| `mesAtual` | não existe | mês **inteiro**, dia 1 ao último |
| `anoAtual` | 01/01 → **hoje** | 01/01 → **31/12** |
| `todos`, `custom` | iguais | iguais |

O rótulo que mente é o achado que o documento de divergências já registrava: a
pessoa lê "Mês atual", o valor da opção é `"30dias"`, e o ramo do `switch` monta
`new Date(hoje.getFullYear(), hoje.getMonth(), 1)` — o primeiro dia do mês
corrente, não trinta dias atrás. **A interface não mente para quem usa; o código
mente para quem lê.**

Contas resolveu isso separando os dois em opções distintas, e registrou no
docblock por que o mês passou a terminar no último dia: *"uma conta emitida dia
20 sumia do 'mês atual' enquanto hoje fosse dia 15"*.

## Os dois defeitos, que são independentes

O item foi previsto como "o preset monta data em UTC". São dois, e o segundo é
mais grave.

### 1. O preset monta a data em UTC

`hoje.toISOString().split("T")[0]` devolve o dia em UTC. Em `anoAtual` o bloco
mistura `getFullYear()` (local) com `toISOString()` (UTC), que é textualmente o
defeito que `contas.ts:257` documenta. É o defeito que o `PENDENTES_UTC` do
`guarda-planilha` rastreia hoje, com as cinco telas na lista.

Adotar `periodoDoPreset`, que sai de `diaLocal`, resolve.

### 2. O filtro esconde as notas emitidas hoje

Este não estava previsto. As cinco filtram assim:

```tsx
(!dataFim || new Date(n.data_emissao) <= new Date(dataFim))
```

`n.data_emissao` chega como `"2026-09-04T00:00:00"` — sem `Z`, então o
JavaScript parseia como **hora local**. `dataFim` é `"2026-09-04"` — data pura,
que o JavaScript parseia como **meia-noite UTC**. Em Brasília os dois viram
instantes diferentes, e o `<=` reprova:

```
nota emitida hoje  → 2026-09-04T03:00:00.000Z
dataFim = hoje     → 2026-09-04T00:00:00.000Z
com fim=hoje  → a nota de hoje aparece? false
com fim=30/09 → a nota de hoje aparece? true
```

**Com qualquer preset que termine hoje, as notas emitidas hoje somem da tela.**
Vale para "Últimos 7 dias", para "Mês atual" e para "Ano atual" — os três.

Contas escapa porque compara **texto** (`emissao < filtros.dataInicio`), sem
construir `Date` nenhum. É a forma certa, e este repositório já a escolheu uma
vez.

Adotar o `periodoDoPreset` **mascararia** o sintoma em `mesAtual` e `anoAtual`,
porque a ponta final passa a ser o fim do mês e do ano. Mas `7dias` e `30dias`
continuam terminando hoje, e continuariam escondendo as notas de hoje. Por isso
os dois defeitos entram no mesmo item: entregar só o primeiro seria entregar um
preset certo alimentando um filtro errado.

## As decisões

**1. As cinco adotam o comportamento de Contas, sem preservar o atual.** Contra
o método herdado das gêmeas ("unificar e corrigir são passos separados"), porque
aqui não existe unificar sem corrigir: a peça que sobrevive é a de Contas, e ela
já tem o comportamento decidido. Preservar o atual significaria escrever uma
segunda função de período no repositório para depois convergir — o oposto do que
o item quer.

**2. As cinco ganham as cinco opções de Contas**, incluindo `mesAtual`, que não
existe nelas hoje. O app inteiro passa a oferecer o mesmo menu.

**3. `periodoDoAno` e `periodoDaBarra` ficam em Contas.** São clique em barra de
gráfico, domínio dela, sem segundo consumidor. Sobem `Periodo`,
`periodoDoPreset` e `periodoDoMes` — esta última porque `periodoDoPreset`
depende dela.

**4. A lista de opções também é compartilhada.** `PRESETS_DE_PERIODO` vive no
mesmo módulo, e `FiltrosDeContas.tsx` passa a consumi-la. Sem isso sobraria uma
sexta cópia da lista de opções — exatamente o defeito que o item existe para
matar, sobrevivendo à sua própria correção.

**5. A normalização da data é função nomeada, não `slice` solto.** Comparar
texto exige normalizar os dois lados: `"2026-09-04T00:00:00" > "2026-09-04"` é
verdadeiro, e a nota da borda sumiria de novo, pelo outro caminho. Contas não
enfrenta isso porque o campo dela é só data. As cinco enfrentam, e a conta vai
para `lib/periodo.ts` com nome e docblock, não repetida cinco vezes.

**6. Os testes de `periodoDoPreset` NÃO precisam ser endurecidos — conferido, e
o contrário do que este documento supôs primeiro.** A suspeita era que eles
tivessem o ponto cego de Locação, porque vários casos usam
`new Date("2026-08-31T12:00:00Z")` — meio-dia, que cai no mesmo dia nos dois
fusos. Conferindo caso a caso: os de meio-dia testam **tamanho de mês** (março,
fevereiro), onde fuso não é o ponto, e existem **dois testes de virada de
verdade** — `viradaDoMes` e `viradaDoAno`, ambos em `02:00Z`, que é 23h do dia
anterior em Brasília. Um retorno a `toISOString` faria os dois falharem.

Eles resolvem a asserção nos dois fusos com um ternário sobre
`getTimezoneOffset()`, e não construindo o instante em hora local como o item 3
recomendou. É mais difícil de ler e igualmente correto; fica como observação,
não como trabalho deste item.

A função entra no item **como está**. A quebra é plantada no teste das cinco
telas, que é onde a fiação nova mora.

## A peça final

`src/lib/periodo.ts`:

- `Periodo` — o par `{ inicio, fim }`, movido de `contas.ts`;
- `periodoDoPreset(preset, agora)` — movido, sem mudança de corpo;
- `periodoDoMes(ano, indiceDoMes)` — movido, dependência da anterior;
- `PRESETS_DE_PERIODO` — a lista `{ value, label }` das cinco opções, hoje só
  em `FiltrosDeContas.tsx`;
- `diaDaData(valor)` — a normalização para `AAAA-MM-DD` que o filtro por texto
  exige;
- `dentroDoPeriodo(data, inicio, fim)` — a comparação por texto, que substitui
  os dois `new Date(...)` de cada uma das cinco.

## Como se prova

**`src/pages/presetDePeriodo.test.tsx`** — um arquivo, as cinco telas. Monta
cada uma, dirige o dropdown de período e afirma as duas datas resultantes e as
linhas que sobram na tabela. Quatro compartilham `useAuth + useData`, então um
helper serve para quatro; `Servicos` usa `useServicos` e tem o seu.

Nenhuma das cinco tem teste hoje — são as telas ainda não migradas da Fase 3.
Este arquivo **não** é a caracterização que a Fase 3 vai pedir quando migrar
cada uma: cobre só a fiação que este item muda, que é dropdown → datas →
linhas. A caracterização completa continua sendo trabalho da Fase 3.

A ordem obriga a ver a quebra: o teste das cinco telas é escrito e verde contra
o comportamento **novo** só depois de o `useEffect` sair — antes disso ele tem de
falhar, e essa falha é a prova de que o teste enxerga a fiação.

## O que NÃO entra

- **Migrar as cinco telas para o design system.** Elas seguem no
  `PENDENTES_FASE_3`; o `<select>` continua markup cru. Este item troca a
  lógica, não a aparência.
- **`emissaoDe` de Contas não normalizar a data.** Hoje é inofensivo, porque o
  campo de emissão de Contas é data pura — mas é a mesma armadilha do item 5,
  a um campo de distância de virar defeito. Vai para o documento de
  divergências, não para o código.
- **O `useIsMobile` e o clique fora**, que são os dois itens seguintes.

## Riscos

**A mudança é visível, em cinco telas, e ninguém pediu.** "Mês atual" passa a
significar outra coisa, e quem usa o filtro todo dia vai notar. A defesa é que a
opção nova (`Últimos 30 dias`) preserva o comportamento antigo com o nome
honesto, então nada some — o que existia continua alcançável, com o rótulo
certo. Ainda assim é conferência no navegador, não só teste.

**O `PENDENTES_UTC` fica vazio.** As cinco saem da lista e ela zera, o que faz o
terceiro teste do `guarda-planilha` (lista sem entrada obsoleta) virar
trivialmente verdadeiro. Se o guarda perde a lista ou a mantém como estrutura é
decisão do plano, não desta spec — mas fica registrado que alguém tem de decidir,
para a lista não ficar lá vazia sem ninguém saber por quê.

## Como se sabe que terminou

- `grep -rn "presetPeriodo" src/pages/` não devolve nenhum `switch` — só o
  estado e o `<select>`.
- `grep -rn "toISOString" src/pages/` não devolve nada fora de comentário.
- `PENDENTES_UTC` está vazio, ou não existe mais, com a decisão registrada.
- `periodoDoPreset`, `periodoDoMes` e `Periodo` existem uma vez só, em
  `src/lib/periodo.ts`; `contas.ts` importa de lá.
- A lista de opções existe uma vez só, e `FiltrosDeContas.tsx` a consome.
- O teste das cinco telas **falha** contra o `useEffect` antigo, provado por
  plantio antes de ele sair.
- As cinco telas respondem ao dropdown com as datas de Contas, provado pelo
  teste das cinco.
- Suíte não regride e lint não sobe: baseline **1437 testes / 94 arquivos**,
  lint **118**, `tsc --noEmit` limpo, verde em `TZ=UTC` e
  `TZ=America/Sao_Paulo`.

## Depois deste plano

Sobram dois itens da Fase 4: o `useIsMobile` (quatro cópias de doze linhas) e o
clique fora (três implementações, uma delas diferente das outras). Nenhum tem
defeito de correção conhecido — são duplicação pura. Depois deles a Fase 4 acaba
e a Fase 3 volta, com seis telas bem menores do que eram em agosto.
