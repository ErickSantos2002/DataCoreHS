import { describe, expect, it } from "vitest";

import {
  calcularKpis,
  evolucaoDoResumo,
  indicesDeRotulo,
  ordenarEBuscar,
  produtosDoResumo,
  recorteDeProdutos,
  rotuloDoCliente,
  rotuloDoProduto,
  type ProdutoAgregado,
} from "./produtos";

/**
 * A conta pura de Produtos, testada como conta.
 *
 * Os cinco arquivos `Produtos.*.test.tsx` já caracterizam a tela renderizada
 * — filtros, KPIs, gráfico e tabela pelo que a pessoa vê. Aqui ficam as
 * bordas que a tela não exercita facilmente: lista vazia, empate no "mais
 * vendido", pesquisa sem resultado, e — desde que a fonte virou o resumo
 * agregado do Postgres — as traduções entre o rótulo que a tela mostra e o
 * id/chave que o servidor filtra. Nenhuma delas foi corrigida ao mover — só
 * registradas, quando têm cara de defeito.
 */

describe("rotuloDoCliente", () => {
  it("junta nome e documento no formato que o multi-select mostra", () => {
    expect(
      rotuloDoCliente({ nome: "Alfa Mineração", cpf_cnpj: "11.222.333/0001-44" }),
    ).toBe("Alfa Mineração (11.222.333/0001-44)");
  });
});

describe("rotuloDoProduto", () => {
  it("junta descrição e código", () => {
    expect(rotuloDoProduto({ descricao: "Bafômetro Phoebus", codigo: "P1" })).toBe(
      "Bafômetro Phoebus (P1)",
    );
  });

  it("sem código, escreve 'sem código' em vez de deixar o parêntese vazio", () => {
    // A fonte nova devolve `codigo: null` para item mal cadastrado no Tiny —
    // antes esses itens nem chegavam à tela, agora chegam e precisam de um
    // rótulo que a pessoa consiga escolher no multi-select.
    expect(rotuloDoProduto({ descricao: "Item sem código", codigo: null })).toBe(
      "Item sem código (sem código)",
    );
  });
});

describe("indicesDeRotulo", () => {
  it("mapeia o rótulo de volta para o id do cliente e a chave do produto", () => {
    const indices = indicesDeRotulo({
      clientes: [
        { id: 7, nome: "Alfa Mineração", cpf_cnpj: "11.222.333/0001-44" },
        { id: 9, nome: "Beta Logística", cpf_cnpj: "55.666.777/0001-88" },
      ],
      vendedores: ["Vendedor A"],
      produtos: [
        { chave: "P1", codigo: "P1", descricao: "Bafômetro Phoebus", valor: 0 },
        { chave: "#Tubo", codigo: null, descricao: "Tubo", valor: 0 },
      ],
    });

    expect(indices.idPorRotulo.get("Alfa Mineração (11.222.333/0001-44)")).toBe(7);
    expect(indices.idPorRotulo.get("Beta Logística (55.666.777/0001-88)")).toBe(9);
    expect(indices.chavePorRotulo.get("Bafômetro Phoebus (P1)")).toBe("P1");
    expect(indices.chavePorRotulo.get("Tubo (sem código)")).toBe("#Tubo");
  });
});

describe("recorteDeProdutos", () => {
  const INDICES = {
    idPorRotulo: new Map([["Alfa Mineração (11.222.333/0001-44)", 7]]),
    chavePorRotulo: new Map([["Bafômetro Phoebus (P1)", "P1"]]),
  };

  it("troca os rótulos escolhidos pelos ids e chaves que o servidor filtra", () => {
    const recorte = recorteDeProdutos(
      {
        empresa: ["Alfa Mineração (11.222.333/0001-44)"],
        vendedor: ["Vendedor A"],
        produto: ["Bafômetro Phoebus (P1)"],
        dataInicio: "2026-01-01",
        dataFim: "2026-12-31",
      },
      INDICES,
    );

    expect(recorte).toEqual({
      clientes: [7],
      vendedores: ["Vendedor A"],
      produtos: ["P1"],
      dataInicio: "2026-01-01",
      dataFim: "2026-12-31",
    });
  });

  it("descarta rótulo que não está no índice, em vez de mandar buraco para o servidor", () => {
    // O índice só é montado depois que `useFiltrosComerciais` responde. Um
    // rótulo que não casa vira `undefined` no `map`, e mandar esse `undefined`
    // no array faria a query string levar um filtro vazio — que não casa com
    // nada e zeraria a tela (ver `paramsDoRecorte`).
    const recorte = recorteDeProdutos(
      {
        empresa: ["Empresa que nao existe no indice"],
        vendedor: [],
        produto: ["Produto que nao existe no indice"],
        dataInicio: "",
        dataFim: "",
      },
      INDICES,
    );

    expect(recorte.clientes).toEqual([]);
    expect(recorte.produtos).toEqual([]);
  });
});

describe("produtosDoResumo", () => {
  it("renomeia os campos do resumo e deriva o valor médio, que o servidor não manda", () => {
    const agregados = produtosDoResumo([
      {
        chave: "P1",
        codigo: "P1",
        descricao: "Bafômetro Phoebus",
        quantidade: 5,
        valor: 500,
        notas: 2,
      },
    ]);

    expect(agregados).toEqual([
      {
        codigo: "P1",
        descricao: "Bafômetro Phoebus",
        quantidadeVendida: 5,
        valorTotal: 500,
        valorMedio: 100,
        numeroVendas: 2,
      },
    ]);
  });

  it("com quantidade zero o valor médio é zero, e não NaN nem Infinity", () => {
    const [agregado] = produtosDoResumo([
      { chave: "P1", codigo: "P1", descricao: "Devolvido", quantidade: 0, valor: 300, notas: 1 },
    ]);

    expect(agregado.valorMedio).toBe(0);
  });

  it("item sem código vira código vazio — e é isso que colide na key da tabela", () => {
    // Achado ao mover (não corrigido): a fonte nova inclui item sem código
    // (36 itens, 0,12% do valor), que a agregação antiga descartava. Aqui ele
    // perde a `chave` que o distinguiria (`'#' + descricao`) e fica com
    // `codigo: ""` — que `TabelaDeProdutos` usa como `key` do React.
    const agregados = produtosDoResumo([
      { chave: "#Tubo", codigo: null, descricao: "Tubo", quantidade: 1, valor: 10, notas: 1 },
      { chave: "#Filtro", codigo: null, descricao: null, quantidade: 2, valor: 20, notas: 1 },
    ]);

    expect(agregados.map((p) => p.codigo)).toEqual(["", ""]);
    expect(agregados[1].descricao).toBe("");
  });
});

describe("calcularKpis", () => {
  it("com lista vazia devolve zeros e produtoMaisVendido nulo, sem dividir por zero", () => {
    // `ticketMedio` é totalFaturado / totalProdutosVendidos — com lista
    // vazia os dois são 0, e só não vira NaN por causa da guarda
    // `totalProdutosVendidos > 0` (achado confirmado no brief, não corrigido).
    const kpis = calcularKpis([]);

    expect(kpis).toEqual({
      totalProdutosVendidos: 0,
      totalFaturado: 0,
      ticketMedio: 0,
      produtoMaisVendido: null,
      totalProdutosUnicos: 0,
    });
  });

  it("com empate na quantidade vendida, o primeiro da lista ganha o mais vendido", () => {
    // O reduce usa `>` estrito: um produto empatado com o atual líder não o
    // substitui, então quem aparece primeiro na lista de agregados vence o
    // empate — não é o de maior valorTotal nem o de menor código.
    const agregados: ProdutoAgregado[] = [
      {
        codigo: "P1",
        descricao: "Primeiro no empate",
        quantidadeVendida: 5,
        valorTotal: 100,
        valorMedio: 20,
        numeroVendas: 1,
      },
      {
        codigo: "P2",
        descricao: "Segundo no empate",
        quantidadeVendida: 5,
        valorTotal: 500,
        valorMedio: 100,
        numeroVendas: 1,
      },
    ];

    const kpis = calcularKpis(agregados);

    expect(kpis.produtoMaisVendido?.codigo).toBe("P1");
  });
});

describe("evolucaoDoResumo", () => {
  it("desenha um ponto por mês, com o mês certo — jan é 1, e não 0", () => {
    // `mes` chega do banco de 1 a 12 e o `Date` do JS conta de 0 a 11. É por
    // isso que a conversão faz `m.mes - 1`; sem isso janeiro viraria
    // fevereiro e dezembro viraria janeiro do ano seguinte.
    const pontos = evolucaoDoResumo([
      { ano: 2026, mes: 1, total: 0, total_produtos: 0, notas: 1, quantidade: 7 },
      { ano: 2026, mes: 12, total: 0, total_produtos: 0, notas: 1, quantidade: 3 },
    ]);

    expect(pontos).toHaveLength(2);
    expect(pontos[0].mes).toMatch(/jan/i);
    expect(pontos[0].mes).toContain("2026");
    expect(pontos[1].mes).toMatch(/dez/i);
    expect(pontos[0].total).toBe(7);
    expect(pontos[1].total).toBe(3);
  });

  it("passando de 24 meses, agrupa por ano e soma as quantidades do ano", () => {
    // O banco devolve mês a mês; agrupar acima de 24 é decisão da TELA (um
    // gráfico com 40 rótulos mensais fica ilegível), e por isso sobreviveu ao
    // `evolucaoPorMes` que morreu quando a agregação virou do Postgres.
    const meses = Array.from({ length: 25 }, (_, i) => ({
      ano: 2025 + Math.floor(i / 12),
      mes: (i % 12) + 1,
      total: 0,
      total_produtos: 0,
      notas: 1,
      quantidade: 1,
    }));

    const pontos = evolucaoDoResumo(meses);

    expect(pontos.map((p) => p.mes)).toEqual(["2025", "2026", "2027"]);
    expect(pontos.map((p) => p.total)).toEqual([12, 12, 1]);
  });

  it("com exatamente 24 meses continua mensal", () => {
    // A fronteira é `> 24`, e não `>= 24`: com dois anos cheios o gráfico
    // ainda mostra mês a mês.
    const meses = Array.from({ length: 24 }, (_, i) => ({
      ano: 2025 + Math.floor(i / 12),
      mes: (i % 12) + 1,
      total: 0,
      total_produtos: 0,
      notas: 1,
      quantidade: 1,
    }));

    expect(evolucaoDoResumo(meses)).toHaveLength(24);
  });
});

describe("ordenarEBuscar", () => {
  it("com pesquisa que não acha nada devolve lista vazia", () => {
    const agregados: ProdutoAgregado[] = [
      {
        codigo: "P1",
        descricao: "Bafômetro Phoebus",
        quantidadeVendida: 5,
        valorTotal: 500,
        valorMedio: 100,
        numeroVendas: 1,
      },
    ];

    const resultado = ordenarEBuscar(agregados, "termo que nao existe em nenhum produto", {
      campo: "quantidadeVendida",
      direcao: "desc",
    });

    expect(resultado).toEqual([]);
  });
});
