import { describe, expect, it } from "vitest";

import type { ResumoDeServicos } from "../../services/notasapi";
import {
  cidadesDoResumo,
  evolucaoDoResumo,
  kpisDoResumo,
  linhasDaPlanilha,
  rankingDoResumo,
  recorteDeServicos,
  type Servico,
} from "./servicos";

/**
 * A conta pura de Serviços, testada como conta.
 *
 * Os cinco arquivos `Servicos.*.test.tsx` caracterizam a tela renderizada —
 * filtros, KPIs, gráfico e tabela pelo que a pessoa vê. Aqui ficam as bordas
 * que a tela não exercita: resumo vazio, o corte do top dez, a troca para
 * escala anual acima de 24 meses e a ordem das colunas da planilha.
 *
 * ⚠️ Toda asserção de mapeamento usa valores DISTINTOS campo a campo. A lição
 * de Produtos é que uma troca simétrica entre dois campos mantém o conjunto de
 * valores e escapa de qualquer asserção que só olhe o conjunto: com `1` e `2`
 * repetidos, trocar `faturamento` com `ticket_medio` passaria verde.
 */

const SERVICO_BASE: Servico = {
  id: 1,
  numero_nfse: 1001,
  data_emissao: "2026-01-10",
  valor_servico: 100,
  razao_social_tomador: "Cliente A",
  cpf_cnpj_tomador: "11.222.333/0001-44",
  cidade_tomador: "Recife",
  uf_tomador: "PE",
  discriminacao_servico: "Calibração de bafômetro",
};

const RESUMO_BASE: ResumoDeServicos = {
  kpis: { faturamento: 0, notas: 0, ticket_medio: 0 },
  evolucao_mensal: [],
  por_cliente: [],
  por_cidade: [],
  opcoes: { clientes: [], cidades: [], tipos: [] },
};

describe("recorteDeServicos", () => {
  it("renomeia os cinco campos sem trocar nenhum de lugar", () => {
    // Os três primeiros são `string[]` e os dois últimos `string`: com
    // conteúdo distinto em cada um, trocar dois de lugar — mesmo em par —
    // derruba as duas pontas.
    const recorte = recorteDeServicos({
      cliente: ["Alfa (11.222.333/0001-44)"],
      cidade: ["Recife/PE"],
      tipoServico: ["Calibração de bafômetro"],
      dataInicio: "2026-01-01",
      dataFim: "2026-02-28",
    });

    expect(recorte).toEqual({
      clientes: ["Alfa (11.222.333/0001-44)"],
      cidades: ["Recife/PE"],
      tipos: ["Calibração de bafômetro"],
      dataInicio: "2026-01-01",
      dataFim: "2026-02-28",
    });
  });
});

describe("kpisDoResumo", () => {
  it("cada numero do resumo vai para o KPI correspondente", () => {
    // Os três números são distintos entre si de propósito: trocar
    // `faturamento` com `ticket_medio` (a troca simétrica clássica) muda os
    // dois lados desta asserção.
    const kpis = kpisDoResumo({
      ...RESUMO_BASE,
      kpis: { faturamento: 2200, notas: 3, ticket_medio: 733.33 },
      por_cliente: [
        { nome: "Alfa Mineração", valor: 1700, notas: 2 },
        { nome: "Beta Logística", valor: 500, notas: 1 },
      ],
    });

    expect(kpis).toEqual({
      totalFaturado: 2200,
      totalServicos: 3,
      ticketMedio: 733.33,
      topCliente: { nome: "Alfa Mineração", valor: 1700 },
    });
  });

  it("com o resumo sem cliente nenhum, topCliente e nulo", () => {
    // O cartão do topo mostra "N/A" nesse caso. Sem a guarda, `por_cliente[0]`
    // seria `undefined` e ler `.nome` estouraria a tela inteira.
    expect(kpisDoResumo(RESUMO_BASE).topCliente).toBeNull();
  });
});

describe("evolucaoDoResumo", () => {
  it("rotula cada mes em portugues e mantem a ordem do resumo", () => {
    const pontos = evolucaoDoResumo([
      { ano: 2026, mes: 1, total: 1000, notas: 2 },
      { ano: 2026, mes: 12, total: 700, notas: 1 },
    ]);

    // O rótulo prova o mês CERTO: `mes - 1` é o índice do `Date`, e somar em
    // vez de subtrair jogaria janeiro em fevereiro.
    expect(pontos.map((p) => p.mes)).toEqual(["jan. de 2026", "dez. de 2026"]);
    expect(pontos.map((p) => p.total)).toEqual([1000, 700]);
    expect(pontos.map((p) => p.ano)).toEqual([2026, 2026]);
    expect(pontos[0].ordem).toBeLessThan(pontos[1].ordem);
  });

  it("passando de 24 meses, troca a escala mensal pela anual", () => {
    // 30 meses seguidos, a partir de janeiro de 2024: dois anos cheios e seis
    // meses de 2026. Um gráfico com 30 rótulos mensais fica ilegível, e é essa
    // a decisão de desenho que sobreviveu à mudança de fonte.
    const meses = Array.from({ length: 30 }, (_, i) => ({
      ano: 2024 + Math.floor(i / 12),
      mes: (i % 12) + 1,
      total: 10,
      notas: 1,
    }));

    const pontos = evolucaoDoResumo(meses);

    expect(pontos.map((p) => p.mes)).toEqual(["2024", "2025", "2026"]);
    expect(pontos.map((p) => p.total)).toEqual([120, 120, 60]);
  });

  it("com 24 meses exatos, continua mensal", () => {
    // A borda: o `if` é `> 24`, então 24 ainda desenha mês a mês.
    const meses = Array.from({ length: 24 }, (_, i) => ({
      ano: 2024 + Math.floor(i / 12),
      mes: (i % 12) + 1,
      total: 10,
      notas: 1,
    }));

    expect(evolucaoDoResumo(meses)).toHaveLength(24);
  });
});

describe("rankingDoResumo", () => {
  it("corta em dez clientes, preservando a ordem que o banco mandou", () => {
    const porCliente = Array.from({ length: 12 }, (_, i) => ({
      nome: `Cliente ${String(i + 1).padStart(2, "0")}`,
      valor: 1200 - i * 100,
      notas: 1,
    }));

    const ranking = rankingDoResumo(porCliente);

    expect(ranking).toHaveLength(10);
    expect(ranking[0]).toEqual({
      cliente: "Cliente 01",
      clienteCompleto: "Cliente 01",
      valor: 1200,
    });
    expect(ranking[9].clienteCompleto).toBe("Cliente 10");
  });

  it("nome com mais de 20 caracteres sai cortado no eixo, inteiro no tooltip", () => {
    // 26 caracteres: o eixo do gráfico tem 140px, e o nome inteiro estoura.
    const nome = "Mineração Santa Luzia Ltda";
    expect(nome).toHaveLength(26);

    const [barra] = rankingDoResumo([{ nome, valor: 900, notas: 3 }]);

    expect(barra.cliente).toBe("Mineração Santa Luzi...");
    expect(barra.clienteCompleto).toBe(nome);
  });

  it("nome com 20 caracteres exatos nao ganha reticencias", () => {
    // A borda: o corte é `> 20`, então 20 passa inteiro.
    const nome = "Mineração Santa Luz.";
    expect(nome).toHaveLength(20);

    expect(rankingDoResumo([{ nome, valor: 1, notas: 1 }])[0].cliente).toBe(nome);
  });
});

describe("cidadesDoResumo", () => {
  it("corta em dez cidades e renomeia os dois campos para o que a pizza le", () => {
    const porCidade = Array.from({ length: 11 }, (_, i) => ({
      nome: `Cidade ${String(i + 1).padStart(2, "0")}/PE`,
      valor: 1100 - i * 100,
      notas: 1,
    }));

    const fatias = cidadesDoResumo(porCidade);

    expect(fatias).toHaveLength(10);
    expect(fatias[0]).toEqual({ name: "Cidade 01/PE", value: 1100 });
    expect(fatias[9]).toEqual({ name: "Cidade 10/PE", value: 200 });
  });
});

describe("linhasDaPlanilha", () => {
  it("exporta as sete colunas, na ordem em que a tela as mostrava", () => {
    const linha = linhasDaPlanilha([SERVICO_BASE])[0];

    expect(Object.keys(linha)).toEqual([
      "Número NFS-e",
      "Cliente",
      "CNPJ/CPF",
      "Data Emissão",
      "Cidade",
      "Valor",
      "Descrição",
    ]);
  });

  it("valor sai como número, e cliente/cidade saem formatados", () => {
    const linha = linhasDaPlanilha([SERVICO_BASE])[0];

    expect(linha.Valor).toBe(100);
    expect(linha.Cliente).toBe("Cliente A");
    expect(linha.Cidade).toBe("Recife/PE");
  });
});
