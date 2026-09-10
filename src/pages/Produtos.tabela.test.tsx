import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Produtos from "./Produtos";

/**
 * Caracterização da tabela de Produtos SOBRE A FONTE AGREGADA (item 9.4): a
 * tela deixou de ler o `DataContext` e passou a receber o resumo já somado
 * pelo Postgres via `useComercial`. O falso mora em `comercial/hooksFalsos`
 * (ver o docblock de lá para o porquê de mocar o hook, e não a rede). Este
 * arquivo nasceu contra a fonte antiga; a Task 1 de 2026-09-10 trocou a
 * falsificação e, onde a decomposição que existe em `main` ainda não chegou
 * a esta branch, adaptou a forma de interagir com a tela — nunca o que ela
 * está provando. Ver o relatório da task para as duas divergências.
 *
 * A paginação já tem cobertura própria em `Produtos.paginacao.test.tsx` — este
 * arquivo cobre o que falta: as seis colunas, a pesquisa, a ordenação e o
 * estado vazio.
 *
 * Os mocks de `useAuth` e `recharts` vêm do mesmo molde da Task 1
 * (`Produtos.kpis.test.tsx` / `Produtos.multiselect.test.tsx`).
 *
 * Fixture: três produtos com quantidade, valor total e valor médio todos
 * distintos entre si, para que nenhuma coluna incorreta passe por acidente
 * batendo com o valor de outra:
 *   - P1 "Bafômetro Digital": duas notas (3 + 2 = 5 un., R$ 300 + R$ 200 =
 *     R$ 500,00), valor médio R$ 100,00, 2 vendas (notas distintas).
 *   - P2 "Tubo Coletor de Amostra": uma nota, 10 un., R$ 1.500,00, valor
 *     médio R$ 150,00, 1 venda. Único produto com "Tubo" na descrição —
 *     usado pela pesquisa.
 *   - P3 "Detector de Gás Portátil": uma nota, 1 un., R$ 50,00, valor médio
 *     R$ 50,00, 1 venda.
 *
 * A ordenação padrão da tabela é por quantidadeVendida decrescente (mesmo
 * comportamento documentado em Produtos.paginacao.test.tsx), o que dá a
 * ordem inicial P2 (10) > P1 (5) > P3 (1) — sem empate, então determinística.
 *
 * As quatro notas têm datas de emissão espalhadas entre 2026-01-10 e
 * 2026-04-10, faixa usada pelo teste do estado vazio para filtrar por
 * período sem tocar na busca.
 */
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, username: "erick", role: "admin" } }),
}));

const { NOTAS } = vi.hoisted(() => ({
  NOTAS: [
    {
      id: 1,
      data_emissao: "2026-01-10",
      valor_nota: 300,
      cliente: { nome: "Alfa Mineração", cpf_cnpj: "11.222.333/0001-44" },
      nome_vendedor: "Vendedor A",
      itens: [
        {
          codigo: "P1",
          descricao: "Bafômetro Digital",
          quantidade: "3",
          valor_total: "300",
        },
      ],
    },
    {
      id: 2,
      data_emissao: "2026-02-10",
      valor_nota: 200,
      cliente: { nome: "Beta Logística", cpf_cnpj: "55.666.777/0001-88" },
      nome_vendedor: "Vendedor B",
      itens: [
        {
          codigo: "P1",
          descricao: "Bafômetro Digital",
          quantidade: "2",
          valor_total: "200",
        },
      ],
    },
    {
      id: 3,
      data_emissao: "2026-03-10",
      valor_nota: 1500,
      cliente: { nome: "Gama Extração", cpf_cnpj: "22.333.444/0001-55" },
      nome_vendedor: "Vendedor A",
      itens: [
        {
          codigo: "P2",
          descricao: "Tubo Coletor de Amostra",
          quantidade: "10",
          valor_total: "1500",
        },
      ],
    },
    {
      id: 4,
      data_emissao: "2026-04-10",
      valor_nota: 50,
      cliente: { nome: "Delta Engenharia", cpf_cnpj: "33.444.555/0001-66" },
      nome_vendedor: "Vendedor B",
      itens: [
        {
          codigo: "P3",
          descricao: "Detector de Gás Portátil",
          quantidade: "1",
          valor_total: "50",
        },
      ],
    },
  ],
}));

// A tela deixou de ler o `DataContext` (item 9.4): a agregação vem somada do
// banco. O falso mora em `comercial/hooksFalsos`, e para esta tela o que
// importa é o `por_produto` — é ele que virou a tabela.
vi.mock("./comercial/useComercial", async (original) => {
  const real = await original<typeof import("./comercial/useComercial")>();
  const { criarHooksFalsos, resumoDeProdutos } = await import("./comercial/hooksFalsos");
  return { ...real, ...criarHooksFalsos(NOTAS, resumoDeProdutos) };
});

/**
 * Dublê do recharts (mesmo do molde da Task 1) — nenhum teste aqui olha
 * para gráfico, o dublê só precisa devolver algo renderizável.
 */
vi.mock("recharts", () => {
  const semDesenho = () => null;
  return {
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
      <div>{children}</div>
    ),
    BarChart: ({ children }: { children?: React.ReactNode }) => (
      <div>{children}</div>
    ),
    LineChart: ({ children }: { children?: React.ReactNode }) => (
      <div>{children}</div>
    ),
    PieChart: ({ children }: { children?: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Bar: semDesenho,
    Line: semDesenho,
    Pie: semDesenho,
    Cell: semDesenho,
    XAxis: semDesenho,
    YAxis: semDesenho,
    Tooltip: semDesenho,
    CartesianGrid: semDesenho,
    Legend: semDesenho,
  };
});

/** O `<tbody>` da tabela, escopado — o card "Produto Mais Vendido" também
 * mostra descrição de produto, então uma busca sem escopo por texto de
 * produto acha as duas ocorrências e `getByText` reclama de duplicidade.
 * Mesmo helper de `Produtos.paginacao.test.tsx`. */
function corpoDaTabela(): HTMLElement {
  const corpo = document.querySelector("tbody");
  if (!corpo) throw new Error("tbody nao encontrado");
  return corpo as HTMLElement;
}

/** As linhas de dado da tabela — o `<tbody>`, sem o cabeçalho. */
function linhasDaTabela(): HTMLElement[] {
  return within(corpoDaTabela()).queryAllByRole("row");
}

/**
 * Os dois campos `input[type="date"]` do filtro de período (Data Início e
 * Data Fim), na ordem em que aparecem no DOM.
 *
 * `FiltrosDeProdutos` usa o `Input` do design system, que liga o `<label>`
 * ao `<input>` com `htmlFor` gerado por `useId` (Input.tsx:33-37) — então
 * `getByLabelText` já alcançaria os dois. Este helper por `querySelectorAll`
 * é anterior a essa migração e ficou, no mesmo espírito de `corpoDaTabela()`.
 */
function inputsDeData(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll('input[type="date"]'));
}

/**
 * A `<tr>` que contém o texto dado, procurado só dentro do `<tbody>`.
 *
 * Escopar por linha (em vez de `getAllByText` com índice) é o que sobrevive
 * à refatoração: as nove tasks seguintes vão reordenar colunas e trocar a
 * tabela de componente, mas "a linha que tem P1" continua sendo a linha que
 * tem P1 — um índice numérico quebraria a cada reordenação, mesmo sem bug
 * nenhum na tela.
 */
function linhaContendo(texto: string): HTMLElement {
  const celula = within(corpoDaTabela()).getByText(texto);
  const linha = celula.closest("tr");
  if (!linha) throw new Error(`linha nao encontrada para "${texto}"`);
  return linha as HTMLElement;
}

/**
 * O `<th>` de uma coluna ordenável, achado pelo texto do rótulo.
 *
 * DIVERGÊNCIA (registrada no relatório): na versão decomposta em `main`, o
 * clique de ordenação mora num `<button>` dentro do `<th>` — daí o arquivo
 * original usar `getByRole("button", { name: "Ordenar por X" })`. Nesta
 * branch a decomposição ainda não chegou: `Produtos.tsx` é a casca antiga, o
 * `onClick` está no próprio `<th>` (`Produtos.tsx:740-833`), e não existe
 * `<button>` nenhum ali. O que se prova — clicar no cabeçalho inverte a
 * ordenação — é o mesmo; só o alvo do clique muda.
 */
function cabecalho(rotulo: string): HTMLElement {
  const texto = screen.getByText(rotulo);
  const th = texto.closest("th");
  if (!th) throw new Error(`cabecalho "${rotulo}" nao encontrado`);
  return th as HTMLElement;
}

describe("tabela de Produtos", () => {
  it("as seis colunas mostram o valor certo para um produto conhecido", () => {
    render(<Produtos />);

    const linha = within(linhaContendo("P1"));

    expect(linha.getByText("P1")).toBeInTheDocument();
    expect(linha.getByText("Bafômetro Digital")).toBeInTheDocument();
    expect(linha.getByText("5")).toBeInTheDocument();
    expect(linha.getByText("R$ 500,00")).toBeInTheDocument();
    expect(linha.getByText("R$ 100,00")).toBeInTheDocument();
    expect(linha.getByText("2")).toBeInTheDocument();
  });

  it("a pesquisa filtra pela descricao, reduzindo as linhas", () => {
    render(<Produtos />);

    expect(linhasDaTabela()).toHaveLength(3);

    fireEvent.change(screen.getByPlaceholderText("Pesquisar produto..."), {
      target: { value: "Tubo" },
    });

    expect(linhasDaTabela()).toHaveLength(1);
    expect(
      within(corpoDaTabela()).getByText("Tubo Coletor de Amostra"),
    ).toBeInTheDocument();
    expect(
      within(corpoDaTabela()).queryByText("Bafômetro Digital"),
    ).not.toBeInTheDocument();
    expect(
      within(corpoDaTabela()).queryByText("Detector de Gás Portátil"),
    ).not.toBeInTheDocument();
  });

  it("clicar no cabecalho de quantidade ordena, e clicar de novo inverte", () => {
    render(<Produtos />);

    // Ordem inicial (quantidadeVendida decrescente): P2 (10), P1 (5), P3 (1).
    let linhas = linhasDaTabela();
    expect(within(linhas[0]).getByText("P2")).toBeInTheDocument();
    expect(within(linhas[2]).getByText("P3")).toBeInTheDocument();

    // Nesta branch o clique de ordenacao mora no <th> em si (ver o docblock
    // de `cabecalho()`), nao num <button> filho.
    const colQuantidade = cabecalho("Quantidade");

    // Primeiro clique: a tabela ja estava ordenada por quantidadeVendida
    // desc, entao alternarOrdenacao inverte para asc.
    fireEvent.click(colQuantidade);
    linhas = linhasDaTabela();
    expect(within(linhas[0]).getByText("P3")).toBeInTheDocument();
    expect(within(linhas[2]).getByText("P2")).toBeInTheDocument();

    // Segundo clique: inverte de volta para desc.
    fireEvent.click(colQuantidade);
    linhas = linhasDaTabela();
    expect(within(linhas[0]).getByText("P2")).toBeInTheDocument();
    expect(within(linhas[2]).getByText("P3")).toBeInTheDocument();
  });

  // DIVERGÊNCIA (registrada no relatório, e não é a do item sem código):
  // o teste original (escrito contra a versão decomposta de `main`) esperava
  // que clicar em "Código" ordenasse a tabela — lá o defeito já tinha sido
  // corrigido (item 2 da Task 11 de lá). Nesta branch `Produtos.tsx` é a
  // casca antiga (Produtos.tsx:270-317): o `switch` de `ordenarEBuscar` não
  // tem `case "codigo"`, cai no `default: return 0`, e a ordem não muda —
  // nem a seta de direção aparece (o cabeçalho de Código também não tem o
  // bloco condicional do `ChevronUp`/`ChevronDown` que os outros têm). Achado
  // ao mover (não corrigido): fica caracterizado como está, no mesmo espírito
  // do "defeito preservado" de `Produtos.multiselect.test.tsx`.
  it("clicar no cabecalho de codigo NAO reordena (defeito preservado: falta o case 'codigo')", () => {
    // Comparar contra o estado ANTES do clique seria frágil: `produtosTabela`
    // reconstrói sempre a partir de `produtosAgregados` (que já chega
    // ordenado por valor decrescente, de `resumoDeProdutos`), então "antes"
    // só bateria com "depois" se a ordenação vigente coincidisse por acaso
    // com essa ordem — o que aconteceria neste fixture, mas por coincidência.
    // A prova robusta é outra: alternar a DIREÇÃO não muda nada, porque o
    // `switch` de `ordenarEBuscar` (Produtos.tsx:288-307) não tem
    // `case "codigo"` e cai no `default: return 0` nos dois sentidos.
    render(<Produtos />);

    const colCodigo = cabecalho("Código");

    fireEvent.click(colCodigo);
    const apos1Clique = linhasDaTabela().map((l) => l.textContent);

    fireEvent.click(colCodigo);
    const apos2Cliques = linhasDaTabela().map((l) => l.textContent);

    expect(apos2Cliques).toEqual(apos1Clique);
  });

  it("o estado vazio aparece com frase completa quando o filtro nao acha nada", () => {
    render(<Produtos />);

    // Esvazia a tabela pelo filtro de PERIODO, nao pela busca: `notasFiltradas`
    // (Produtos.tsx:60-70, que chama `filtrarNotas` de produtos.ts) filtra por
    // empresa, vendedor, produto e data — quatro mecanismos independentes de
    // `pesquisaTabela`, que so entra depois, no `ordenarEBuscar` da tabela
    // (Produtos.tsx:100). Um intervalo fora do range das notas (2026-01-10 a
    // 2026-04-10) esvazia `produtosAgregados` sem tocar no campo de pesquisa,
    // o que mantem este teste desacoplado da plantacao de "pesquisa filtra".
    const [dataInicio, dataFim] = inputsDeData();
    fireEvent.change(dataInicio, { target: { value: "2030-01-01" } });
    fireEvent.change(dataFim, { target: { value: "2030-01-02" } });

    expect(linhasDaTabela()).toHaveLength(1);
    expect(
      screen.getByText("Nenhum resultado encontrado."),
    ).toBeInTheDocument();
  });

  // DIVERGÊNCIA (registrada no relatório, não é a do item sem código): em
  // `main`, a versão decomposta desabilita "Exportar Excel" com a tabela
  // vazia (`TabelaDeProdutos.tsx`, `disabled={total === 0}` — fix do item 3
  // da Task 11 de lá). Nesta branch `Produtos.tsx` ainda é a casca antiga
  // (Produtos.tsx:721-730): o botão nunca leva `disabled`, com tabela vazia
  // ou não. O teste original caracterizava o comportamento CORRIGIDO; este
  // caracteriza o que a tela FAZ hoje aqui — exportar continua clicável.
  it("com a tabela vazia, o botao de exportar continua habilitado (defeito preservado: falta o fix do item 3 da task 11)", () => {
    render(<Produtos />);

    expect(
      screen.getByRole("button", { name: /exportar excel/i }),
    ).toBeEnabled();

    // Mesmo filtro de periodo do teste do estado vazio, para nao acoplar
    // esta plantacao a "pesquisa filtra".
    const [dataInicio, dataFim] = inputsDeData();
    fireEvent.change(dataInicio, { target: { value: "2030-01-01" } });
    fireEvent.change(dataFim, { target: { value: "2030-01-02" } });

    expect(linhasDaTabela()).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: /exportar excel/i }),
    ).toBeEnabled();
  });
});
