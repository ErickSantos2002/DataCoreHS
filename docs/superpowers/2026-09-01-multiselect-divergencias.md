# MultiSelect — as divergências que sobraram, para decidir

O `MultiSelect` estava copiado dentro de seis páginas — Produtos, Serviços,
Vendedores, Estoque, Clientes e Vendas. Não eram seis usos do mesmo
componente: eram seis componentes diferentes com o mesmo nome, declarados
dentro da própria página, que divergiram em duas dimensões. A forma da opção
(`string[]` em quatro telas, `{value,label}` em duas) e a busca, que virou
quatro estratégias distintas.

A fase extraiu o primitivo e trocou as seis telas. Ela **não consertou nada**,
de propósito — é o método herdado das gêmeas ContasReceber/ContasPagar:
unificar e corrigir são passos separados, porque juntos não dá para saber qual
dos dois quebrou. A prova de que a unificação não mudou comportamento é que os
testes de caracterização passaram sem edição, com uma exceção por tela, prevista
e autorizada (o painel deixou de fechar ao marcar — ver o fecho).

O que sobrou é este documento. Os itens 1 a 4 são divergências de
comportamento, e cada uma está hoje **fixada em teste** com o comportamento
atual, esperando decisão. Os itens 5 a 7 não são comportamento e não há teste
que os trave: são a forma do código (5), uma dívida nos próprios testes (6) e
uma regressão de acessibilidade (7). Nada aqui está decidido.

## 1. As quatro buscas

O primitivo recebe a estratégia por injeção — a prop `buscarPor`, com
`buscaPorTexto` de padrão. As quatro vivem em
`src/design-system/ui/forms/buscaDeMultiSelect.ts`, puras e testadas em
separado.

| Estratégia | Telas | Acha por |
|---|---|---|
| `buscaPorTexto` (padrão) | Produtos, Estoque | só o rótulo, sem diferenciar maiúscula |
| `buscaPorTextoOuNumero` | Serviços | rótulo, ou os dígitos do rótulo contra os dígitos do termo |
| `buscaPorCnpjEntreParenteses` | Vendedores, Vendas | rótulo, ou o CNPJ entre parênteses — normalizando só quando o termo é todo dígito |
| `buscaPorRotuloValorOuNumero` | Clientes | rótulo, valor cru, ou os dígitos do valor |

A pergunta que este item põe: **unificar tudo na busca mais rica** — rótulo,
valor e dígitos — significa que Produtos e Estoque passam a achar por número, o
que hoje não fazem.

A consequência prática de hoje é essa: quem procura uma empresa digitando o
CNPJ sem pontuação acha em Vendas e não acha em Produtos. É a mesma pessoa, o
mesmo hábito, e o resultado depende da tela em que ela está. Unificar é
melhoria, mas é mudança de comportamento visível — decisão do Erick, não efeito
colateral de refactor.

## 2. Dois ramos mortos, mortos por motivos diferentes

Este é o achado mais interessante da fase, e a distinção importa porque leva a
decisões opostas.

**O ramo morto de Clientes é morto pelos dados.** Em
`buscaPorRotuloValorOuNumero` a condição que casa o valor cru
(`opcao.valor.toLowerCase().includes(termo)`) é inalcançável **como a tela de
Clientes monta os dados hoje**: `clientesUnicos` (`Clientes.tsx:134`) constrói o
`value` com `cpf_cnpj.replace(/\D/g, "")`, ou seja, já só com dígitos. Daí
`valor === valorNormalizado` sempre, e as duas condições viram a mesma expressão
booleana quando o termo é todo dígito; termo com qualquer pontuação nunca casa a
do valor cru, porque não há pontuação no valor para casar. Foi provado por
execução na Task 5, não no papel: apagada a condição, os sete testes de Clientes
continuaram passando — não por falha do teste, mas porque nenhum termo consegue
isolá-la.

**Ele foi mantido de propósito.** O primitivo é do design system e pode receber
opções de outra procedência, com valor pontuado ou com letra, onde a condição
volta a ser alcançável em separado. O caso concreto está no teste
`buscaDeMultiSelect.test.ts:135`, com a opção `{ valor: "P2", rotulo: "Tubo
descartável" }`: o termo `"p"` não tem dígito e não está no rótulo, então só a
condição do valor cru explica o `true`. Apagar resolveria Clientes e quebraria
em silêncio essa forma de opção.

**O ramo morto de `buscaPorCnpjEntreParenteses` é morto pela matemática.** As
cópias de Vendedores e Vendas tinham uma terceira condição —
`cnpj.toLowerCase().includes(termo)`, o CNPJ ainda pontuado contra o termo cru —
que é morta para *qualquer* entrada possível. O CNPJ é extraído do próprio
rótulo por `rotulo.match(/\((.*?)\)/)`, então é sempre substring literal dele;
tudo que essa condição casa, a condição do rótulo já casou antes. Isso não
depende de dado nenhum: não há como torná-la alcançável sem mudar a forma da
regex.

**Esse já saiu.** Ele não entrou na estratégia extraída na Task 7, e as seis
cópias que o carregavam não existem mais — o código morto foi embora com elas.
O item fica registrado aqui não para decidir se sai, mas porque a decisão foi
tomada por análise e convém que ela esteja escrita: se alguém reencontrar essa
condição em outra tela e achar que faltou, a resposta é que ela não fazia nada.

A decisão que este item põe, então, é só sobre o de Clientes: mantê-lo custa
zero e protege um uso futuro do primitivo, ou a tela de Clientes passa a guardar
o `value` com pontuação como as outras e a condição vira alcançável ali também.

## 3. Serviços não tem o guard de "termo todo dígito"

Vendedores e Vendas só normalizam o termo quando ele é todo dígito
(`/^\d+$/.test(termo)`): quem digita `"a11"` procura o texto `"a11"`, não o
número `11`. Serviços normaliza sempre — `"x11"` acha o rótulo cujos dígitos
contêm `11`.

É divergência real, e foi travada em teste na Task 7
(`buscaDeMultiSelect.test.ts:65` e `:88`) justamente para que uma unificação
descuidada não a apagasse em silêncio.

Nas duas direções: **pôr o guard em Serviços** deixa a busca mais previsível —
texto é texto, número é número — e tira de quem digita um código misturado com
letra a chance de achar pelos dígitos. **Tirar o guard de Vendedores e Vendas**
torna a busca mais permissiva e passa a devolver resultado numérico para termos
que a pessoa escreveu como texto, o que produz o falso positivo que o guard
existe para evitar. As duas são defensáveis; nenhuma é neutra.

## 4. O ponto cego da suíte

O plano mandava, tela por tela, passar a estratégia "no filtro X; os outros
ficam no padrão". Isso estava errado, e virou a Ruling 7 do controlador: na
cópia existia **um só** `filteredOptions`, compartilhado por todas as instâncias
daquela tela. Passar a estratégia num filtro só faria os outros caírem no
`buscaPorTexto` padrão e perderem, em silêncio, a busca numérica que têm hoje.
Foi consertado em Serviços (Task 10, commit `1393609a`) depois de já ter
entrado, e prevenido nas demais.

O que torna isso digno de documento é a segunda metade: **a suíte não pega esse
erro.** Os revisores provaram por mutação, em três telas diferentes, que remover
o `buscarPor` de um filtro secundário deixa os sete testes verdes — em
Vendedores (filtro de produtos), em Clientes (produto e vendedor) e em Vendas
(vendedores e produtos). Só o filtro que a caracterização exercita morde. Um
estreitamento futuro nesses filtros passaria despercebido.

A decisão: vale acrescentar um teste que exercite um **segundo** filtro? Vale
para **três telas**, não seis — o resto da lista já está fora por motivo
próprio. Serviços já tem o seu: `Servicos.multiselect.test.tsx:226`, "no filtro
de tipos, acha pelo número digitado sem pontuação", que entrou justamente no
commit `1393609a` citado acima. Estoque tem **um só** `MultiSelect`
(`Estoque.tsx:452`) — não existe segundo filtro para exercitar. E nem Produtos
nem Estoque passam `buscarPor` em uso nenhum, então não há estratégia a perder:
a mutação que este item descreve é inócua nas duas.

Sobram **Vendedores, Clientes e Vendas**, que são exatamente as três onde a
mutação foi provada. Três `it`, um por tela, reaproveitando o `abrir` e o
`campoDeBusca` que os três arquivos já têm, e o fixture já traz o dado numérico
necessário. A alternativa é deixar só a nota: custo zero agora, e o buraco
continua aberto para quem mexer nesses filtros sem ler este documento. A
diferença entre as duas é quem paga — a suíte hoje, ou a próxima pessoa que
estreitar um filtro sem perceber.

## 5. Não existe `dePares`

A divisão é por filtro, não por tela. Dos 15 usos do primitivo, **13 passam por
`deTextos`**, que monta o par com `valor === rotulo` a partir de `string[]`. Os
outros **dois** vieram de listas `{value,label}` que já existiam e precisaram de
um `.map` inline de renomeação:

```tsx
opcoes={produtosUnicos.map((o) => ({ valor: o.value, rotulo: o.label }))}
```

Está em `Estoque.tsx:453` e `Clientes.tsx:603`. Clientes é o caso que mostra que
a divisão não é por tela: o filtro de clientes usa o `.map`, e os de vendedor e
produto da mesma tela usam `deTextos` (`:617`, `:631`).

Vendedores é um terceiro formato, e vale explicar por que ele **não** conta como
problema: `produtosUnicos` (`Vendedores.tsx:136`) guarda pares, e o uso descarta
o valor com `deTextos(produtosUnicos.map(p => p.label))` (`:517`). Nada se perde
— o rótulo já carrega o código (`descricao (codigo)`, montado em `:142`) e o
filtro da tabela casa exatamente essa string (`:158`), então o rótulo *é* a
identidade. O par ali só serve de chave de deduplicação, e Produtos e Vendas
fazem a mesma deduplicação já produzindo `string`. É redundância, não defeito —
quem decidir sobre `dePares` precisa saber que este caso não é cliente dele.

Nenhum helper foi criado, de propósito, para não estourar o escopo das trocas.
Há dois pontos para quem decidir: se um `dePares` deve existir, e se ele deve
ser memoizado. O `.map` de hoje aloca array novo a cada render e perde a
estabilidade de referência que o `useMemo` dava à lista original. Sem
consequência hoje — o primitivo não é `React.memo`, então nada rerenderiza a
mais por causa disso — mas é exatamente o tipo de coisa que passa a doer no dia
em que alguém memoiza o primitivo e não entende por que não adiantou.

## 6. Dívidas de teste herdadas

Pequenas, reais, e baratas de quitar agora.

O teste chamado **"marcar de novo desmarca, e 'Limpar seleção' zera tudo"**
existe nas seis telas, e em **três** ele nunca reclica o checkbox — o corpo marca
uma opção e clica em "Limpar seleção", só. O nome promete duas coisas e o teste
faz uma. São `Produtos.multiselect.test.tsx:134`,
`Servicos.multiselect.test.tsx:184` e `Vendedores.multiselect.test.tsx:211`.

As outras três já foram quitadas durante a fase e servem de modelo: Clientes
(`:299`), Estoque (`:216`) e Vendas (`:203`) reclicam o mesmo checkbox e asserem
a volta ao placeholder antes de testar o "Limpar seleção" isoladamente — ver
`Clientes.multiselect.test.tsx:308-312` e os equivalentes. Quitar as três que
faltam é copiar esse bloco: quatro linhas por tela.

O ramo de desmarcar já tem cobertura própria no primitivo desde o commit
`785a1b09` (`MultiSelect.test.tsx:25`), então o buraco é de nome, não de
cobertura real.

O comportamento novo — **o painel não fecha ao marcar** — está provado só
implicitamente nas seis telas, como efeito colateral do teste acima. Ele tem
`it` explícito no primitivo (`MultiSelect.test.tsx:50`); nas telas, é uma
suposição que o teste depende mas não afirma. Um `it` por tela transformaria a
mudança autorizada numa afirmação.

Em `src/pages/Clientes.multiselect.test.tsx` há ponteiros obsoletos, e são três.
A linha **205** diz "A busca (~linha 592)" e a **225** diz `Clientes.tsx:601` —
a busca não mora mais em `Clientes.tsx` em linha nenhuma, e sim em
`buscaDeMultiSelect.ts`. O terceiro é mais brando e aparece duas vezes, nas
linhas **22** e **213**: "`clientesUnicos` (~linha 133)", que hoje é a 134. As
linhas 228 e 234 do mesmo arquivo *parecem* ponteiros mas não são — narram o que
a Task 5 fez com `Clientes.tsx` na época, e continuam verdadeiras. As outras
cinco telas não têm equivalente.

## 7. A sétima cópia, e o que ela tem que o primitivo não tem

`grep -rn "const MultiSelect" src/pages/` devolve zero, e é verdade: as seis
cópias que a fase foi buscar acabaram. Mas existe uma sétima implementação do
mesmo widget, com outro nome, que a lista da Fase 4 não contava:
`src/pages/contas/MultiSelectDeContas.tsx` — 156 linhas, compartilhada por
ContasReceber e ContasPagar desde a unificação das gêmeas.

Ela não é descuido. O comentário dela explica por que ficou de fora: promover a
primitivo antes das seis telas migrarem seria decidir a API sem ver os seis
usos, "e é assim que se ganha uma prop por tela". A própria nota diz que, quando
as seis migrassem, a promoção seria "um `git mv` com os seis usos na mão". As
seis migraram. A condição que a nota estabeleceu está satisfeita, e a fusão das
duas peças é item pendente — não de decisão de produto, mas de trabalho que
ninguém agendou.

E a fusão não é simétrica, porque **a peça velha é mais acessível que a nova.**
`MultiSelectDeContas` recebe um `rotulo` e liga o gatilho ao rótulo e ao valor
por `aria-labelledby` com dois ids: quem usa leitor de tela ouve "Situação, 2
selecionado(s)". O primitivo novo não tem nada disso — só `aria-expanded` — e
nas seis telas o `<label>` que fica acima dele é um `<label>` solto, sem
`htmlFor` (conferido: nenhuma das seis páginas tem `htmlFor`, `aria-label` ou
`aria-labelledby` em lugar nenhum). O gatilho anuncia "Todos os produtos" ou "3
selecionado(s)", e o nome do campo não entra. É exatamente o defeito que a Fase
1 corrigiu nas gêmeas, reintroduzido no primitivo por herança das seis cópias,
que também não o tinham.

Não foi consertado aqui porque esta fase não conserta — mas, diferente das
outras da lista, esta não é uma escolha entre dois comportamentos defensáveis.
É regressão de acessibilidade em relação a uma peça que já existe no repositório
fazendo certo, e a decisão sensata é levá-la junto quando as duas se fundirem.

## O que a fase entregou

Nenhuma das seis cópias sobrou: `grep -rn "const MultiSelect" src/pages/`
devolve zero (a sétima peça, `MultiSelectDeContas`, é o item 7 acima e sempre
esteve fora deste escopo). Nos seis `.tsx` de tela, **783 linhas removidas e
51 acrescentadas** — líquido −732, contra as ~737 que o spec previa.

O branch inteiro contra a `main`, **medido antes deste documento entrar** (no
commit `54abc751`), são 21 commits e 20 arquivos, 3222 inserções contra 783
remoções; a maior parte das inserções são os testes de caracterização, que antes
não existiam. Contando esta página, um `git diff --stat main..HEAD` devolve 22
commits, 21 arquivos e 3477 inserções — mesma medida, com o documento dentro.

Suíte em **1357 testes / 84 arquivos**, `tsc --noEmit` limpo, e o lint em **120
problemas** — eram 135 quando a fase começou. Caiu 15 sem ninguém ter ido atrás
disso, só apagando duplicação.

## O que vem depois

Os outros cinco itens da Fase 4, cada um com plano próprio a escrever. São
menores e mais mecânicos, e nenhum tem a decisão de API que este teve.

**Adotar o `Pagination`.** Não é extrair, é usar o primitivo que a Fase 1
construiu. Uma correção ao spec, conferida agora: ele **já tem um consumidor** —
`pages/contas/TabelaDeContas.tsx:300`, das gêmeas. São as seis telas desta fase
que ainda rolam paginação própria. Ele devolve `null` com zero resultados e
pressupõe `TableEmpty` no consumidor, que as seis ainda não têm.

**Extração para Excel em `src/lib/planilha.ts`.** O spec falava em sete
arquivos montando `json_to_sheet` + `book_new` + `book_append_sheet` +
`writeFile` na mão; hoje são **nove** — as seis telas desta fase mais
`financeiro/AbaComissao.tsx`, `Locacao.tsx` e `contas/TelaDeContas.tsx`.

**Preset de período.** Cinco telas com o mesmo defeito, e vale registrar a
forma exata dele: o rótulo que a pessoa lê já diz "Mês atual" nas cinco, mas o
valor da opção é `"30dias"` e é ele que o `switch` casa — e o ramo monta
`new Date(hoje.getFullYear(), hoje.getMonth(), 1)`, o primeiro dia do mês
corrente, não trinta dias atrás. Ou seja: a interface não mente para quem usa, o
código mente para quem lê. Extrair primeiro, renomear a chave depois.

**`useIsMobile` para `src/hooks/`.** Quatro cópias, em Produtos, Vendas,
Estoque e Clientes.

**Clique fora.** As seis cópias das telas morreram com o `MultiSelect` e
viraram um `useEffect` só, no primitivo (`MultiSelect.tsx:59`). Não zerou o
item: restam `MultiSelectDeContas.tsx:63`, `SearchSelect.tsx:82` e, em
`Estoque.tsx:122`, uma variante que não é a mesma — fecha dois popovers de
gráfico e escuta `mousedown` **e** `touchstart`. Um hook que sirva às três
precisa cobrir o toque e aceitar mais de um envolvente; era o que o spec
chamava de "provavelmente morre junto com o MultiSelect", e não morreu.
