import { describe, expect, it } from "vitest";

import {
  buscarNasContas,
  calcularKpis,
  estaEmAberto,
  estaQuitada,
  fatiaDaPagina,
  filtrarContas,
  formatarData,
  formatarMoeda,
  formatarValorAbreviado,
  linhasDaPlanilha,
  montarCategorias,
  montarContrapartes,
  montarEvolucao,
  nomeDoArquivo,
  opcoesDistintas,
  ordenarContas,
  periodoDaBarra,
  periodoDoAno,
  periodoDoMes,
  periodoDoPreset,
  proximaOrdenacao,
  type ContaBase,
  type DialetoDeContas,
  type FiltrosDeContas,
} from "./contas";

/**
 * A regra das duas telas de Contas, exercitada sem tela.
 *
 * O teste de caracterização de `ContasReceber.test.tsx` e
 * `ContasPagar.test.tsx` já prova o comportamento pela tela renderizada — e é
 * ele que manda. Este arquivo cobre o que a tela não consegue mostrar de
 * forma barata: que a MESMA função responde diferente para os dois dialetos,
 * que é a razão de o módulo existir. Cada caso abaixo roda a função uma vez
 * com o dialeto de Contas a Receber e uma vez com o de Contas a Pagar.
 */

/** Uma conta a receber: emissão em `data`, quitada por `recebido` ou `pago`. */
interface ContaDeExemplo extends ContaBase {
  data: string;
  data_emissao: string;
  ocorrencia: string;
}

function conta(campos: Partial<ContaDeExemplo> & { id: number }): ContaDeExemplo {
  const data = campos.data ?? "2026-01-10";
  return {
    id_tiny: 100 + campos.id,
    data,
    data_emissao: data,
    vencimento: "2026-01-20",
    situacao: null,
    categoria: null,
    cliente_nome: "Sem Nome",
    cliente_cpf_cnpj: null,
    nro_documento: null,
    historico: null,
    liquidacao: null,
    cliente_cidade: null,
    cliente_uf: null,
    valor_numero: 0,
    saldo_numero: 0,
    ano: Number(data.slice(0, 4)),
    vencida: false,
    ocorrencia: "U",
    ...campos,
  };
}

const RECEBER: DialetoDeContas<ContaDeExemplo> = {
  campoDaEmissao: "data",
  situacoesQuitadas: ["recebido", "pago"],
  chaveQuitado: "recebido",
};

const PAGAR: DialetoDeContas<ContaDeExemplo> = {
  campoDaEmissao: "data_emissao",
  situacoesQuitadas: ["pago"],
  chaveQuitado: "pago",
};

const SEM_FILTRO: FiltrosDeContas = {
  situacao: [],
  categoria: [],
  contraparte: [],
  dataInicio: "",
  dataFim: "",
};

/** Meio-dia em UTC é o MESMO dia de calendário em UTC e em Brasília. */
const AGORA = new Date("2026-08-31T12:00:00Z");

describe("formatação", () => {
  it("dinheiro sai em real, com vírgula decimal", () => {
    expect(formatarMoeda(1234.5).replace(/\u00a0/g, " ")).toBe("R$ 1.234,50");
    expect(formatarMoeda(-50).replace(/\u00a0/g, " ")).toBe("-R$ 50,00");
  });

  it("o eixo do gráfico abrevia em K a partir de mil e em M a partir de um milhão", () => {
    expect(formatarValorAbreviado(2_500_000)).toBe("R$ 2.5M");
    expect(formatarValorAbreviado(3_400)).toBe("R$ 3.4K");
    expect(formatarValorAbreviado(999)).toBe("R$ 999");
  });

  it("data vira dd/mm/aaaa, e a ausência vira travessão", () => {
    expect(formatarData("2026-01-18")).toBe("18/01/2026");
    expect(formatarData(null)).toBe("-");
  });

  it("DEFEITO PRESERVADO: data com hora sai com a hora colada no dia", () => {
    // `formatarData` fatia em "-" e ignora o "T". Hoje a API manda data pura;
    // a troca por `src/lib/datas.ts` é da Fase 2.
    expect(formatarData("2026-01-18T10:00:00")).toBe("18T10:00:00/01/2026");
  });
});

describe("o que conta como quitado — a primeira divergência de domínio", () => {
  it("em Contas a Receber, `recebido` e `pago` valem a mesma coisa", () => {
    expect(estaQuitada("recebido", RECEBER)).toBe(true);
    expect(estaQuitada("pago", RECEBER)).toBe(true);
    expect(estaQuitada("PAGO", RECEBER)).toBe(true);
    expect(estaQuitada("pendente", RECEBER)).toBe(false);
  });

  it("em Contas a Pagar, só `pago` vale — `recebido` fica em aberto", () => {
    expect(estaQuitada("pago", PAGAR)).toBe(true);
    expect(estaQuitada("recebido", PAGAR)).toBe(false);
  });

  it("situação nula e vazia nunca são quitadas, nos dois dialetos", () => {
    for (const dialeto of [RECEBER, PAGAR]) {
      expect(estaQuitada(null, dialeto)).toBe(false);
      expect(estaQuitada("", dialeto)).toBe(false);
    }
  });

  it("`pendente` e `aberto` são as duas situações de conta ainda no prazo", () => {
    expect(estaEmAberto("pendente")).toBe(true);
    expect(estaEmAberto("Aberto")).toBe(true);
    expect(estaEmAberto("cancelado")).toBe(false);
    expect(estaEmAberto(null)).toBe(false);
  });
});

describe("qual campo de data manda — a segunda divergência de domínio", () => {
  const contas = [
    conta({ id: 1, data: "2026-01-10", data_emissao: "2026-08-10" }),
    conta({ id: 2, data: "2026-08-10", data_emissao: "2026-01-10" }),
  ];

  it("Contas a Receber filtra o período por `data`", () => {
    const filtradas = filtrarContas(
      contas,
      { ...SEM_FILTRO, dataInicio: "2026-08-01", dataFim: "2026-08-31" },
      RECEBER,
    );
    expect(filtradas.map((c) => c.id)).toEqual([2]);
  });

  it("Contas a Pagar filtra o mesmo período por `data_emissao`", () => {
    const filtradas = filtrarContas(
      contas,
      { ...SEM_FILTRO, dataInicio: "2026-08-01", dataFim: "2026-08-31" },
      PAGAR,
    );
    expect(filtradas.map((c) => c.id)).toEqual([1]);
  });

  it("as duas bordas do período são inclusivas", () => {
    const contas = [
      conta({ id: 1, data: "2026-02-15" }),
      conta({ id: 2, data: "2026-03-05" }),
      conta({ id: 3, data: "2026-03-06" }),
    ];
    const filtradas = filtrarContas(
      contas,
      { ...SEM_FILTRO, dataInicio: "2026-02-15", dataFim: "2026-03-05" },
      RECEBER,
    );
    expect(filtradas.map((c) => c.id)).toEqual([1, 2]);
  });

  it("os campos do filtro são E entre si e OU dentro de cada multi-seleção", () => {
    const contas = [
      conta({ id: 1, situacao: "pendente", categoria: "Serviços", cliente_nome: "Alfa" }),
      conta({ id: 2, situacao: "pago", categoria: "Serviços", cliente_nome: "Alfa" }),
      conta({ id: 3, situacao: "pendente", categoria: "Locação", cliente_nome: "Beta" }),
    ];

    expect(
      filtrarContas(contas, { ...SEM_FILTRO, situacao: ["pendente", "pago"] }, RECEBER).map(
        (c) => c.id,
      ),
    ).toEqual([1, 2, 3]);

    expect(
      filtrarContas(
        contas,
        { ...SEM_FILTRO, situacao: ["pendente"], categoria: ["Serviços"] },
        RECEBER,
      ).map((c) => c.id),
    ).toEqual([1]);

    expect(
      filtrarContas(contas, { ...SEM_FILTRO, contraparte: ["Beta"] }, RECEBER).map((c) => c.id),
    ).toEqual([3]);
  });
});

describe("opções dos filtros", () => {
  it("são os valores distintos, e o vazio nunca vira opção", () => {
    expect(opcoesDistintas(["Zinco", "Boletos", "Boletos", null])).toEqual([
      "Boletos",
      "Zinco",
    ]);
    // Também na lista de cliente/fornecedor, que era a única que deixava o
    // vazio passar e virar a opção "(vazio)".
    expect(opcoesDistintas(["Zeta", "", "Alfa", null])).toEqual(["Alfa", "Zeta"]);
  });

  it("o acento entra na ordem do alfabeto, e não no fim da lista", () => {
    // `.sort()` cru ordenava por código UTF-16 e jogava "Água" depois de
    // "Zinco"; `localeCompare` com pt-BR põe cada palavra no lugar dela.
    expect(opcoesDistintas(["Zinco", "Água", "Boletos"])).toEqual([
      "Água",
      "Boletos",
      "Zinco",
    ]);
    expect(
      opcoesDistintas(["Óleo", "Nafta", "Ácido", "Zinco"]),
    ).toEqual(["Ácido", "Nafta", "Óleo", "Zinco"]);
  });
});

describe("presets de período", () => {
  it("Todos limpa as duas pontas", () => {
    expect(periodoDoPreset("todos", AGORA)).toEqual({ inicio: "", fim: "" });
  });

  it("Personalizado não mexe em nada — devolve nulo", () => {
    expect(periodoDoPreset("custom", AGORA)).toBeNull();
  });

  it("Ano atual é o único que olha para a frente: 01/01 a 31/12", () => {
    expect(periodoDoPreset("anoAtual", AGORA)).toEqual({
      inicio: "2026-01-01",
      fim: "2026-12-31",
    });
  });

  it("Mês atual é o mês INTEIRO, do dia 1 ao último — e não até hoje", () => {
    // No meio do mês o fim é o último dia, não o dia de hoje: o preset diz
    // "mês atual", e uma conta emitida dia 20 tem de aparecer no dia 15.
    expect(periodoDoPreset("mesAtual", new Date("2026-03-15T12:00:00Z"))).toEqual({
      inicio: "2026-03-01",
      fim: "2026-03-31",
    });
    // O último dia é calculado, não chutado em 30: fevereiro de 2026 tem 28.
    expect(periodoDoPreset("mesAtual", new Date("2026-02-10T12:00:00Z"))).toEqual({
      inicio: "2026-02-01",
      fim: "2026-02-28",
    });
    expect(periodoDoPreset("mesAtual", AGORA)).toEqual({
      inicio: "2026-08-01",
      fim: "2026-08-31",
    });
  });

  it("Últimos 30 dias conta 30 dias para trás", () => {
    expect(periodoDoPreset("30dias", AGORA)).toEqual({
      inicio: "2026-08-01",
      fim: "2026-08-31",
    });
  });

  it("na virada do dia, as duas pontas saem do dia LOCAL", () => {
    // 01/09 às 02h em Greenwich ainda é 31/08 às 23h em Brasília. Antes o
    // início vinha de `getFullYear`/`getMonth` (local) e o fim de
    // `toISOString` (UTC), e o "mês atual" atravessava a virada: 01/08 a
    // 01/09. Agora as duas pontas contam o mesmo dia — o do relógio de quem
    // olha a tela.
    const viradaDoMes = new Date("2026-09-01T02:00:00Z");
    const foraDoUtc = viradaDoMes.getTimezoneOffset() !== 0;

    expect(periodoDoPreset("mesAtual", viradaDoMes)).toEqual(
      foraDoUtc
        ? { inicio: "2026-08-01", fim: "2026-08-31" }
        : { inicio: "2026-09-01", fim: "2026-09-30" },
    );
    expect(periodoDoPreset("30dias", viradaDoMes)).toEqual(
      foraDoUtc
        ? { inicio: "2026-08-01", fim: "2026-08-31" }
        : { inicio: "2026-08-02", fim: "2026-09-01" },
    );
  });

  it("na virada do ano, o ano atual é o ano LOCAL — e não o de Greenwich", () => {
    // 01/01/2026 às 02h em Greenwich ainda é 31/12/2025 em Brasília. Antes o
    // "ano atual" saía inteiro do ano local e o "mês atual" terminava no dia
    // em UTC, então dezembro aparecia rotulado como mês atual de janeiro.
    const viradaDoAno = new Date("2026-01-01T02:00:00Z");
    const foraDoUtc = viradaDoAno.getTimezoneOffset() !== 0;

    expect(periodoDoPreset("anoAtual", viradaDoAno)).toEqual(
      foraDoUtc
        ? { inicio: "2025-01-01", fim: "2025-12-31" }
        : { inicio: "2026-01-01", fim: "2026-12-31" },
    );
    expect(periodoDoPreset("mesAtual", viradaDoAno)).toEqual(
      foraDoUtc
        ? { inicio: "2025-12-01", fim: "2025-12-31" }
        : { inicio: "2026-01-01", fim: "2026-01-31" },
    );
  });
});

describe("clique numa barra do gráfico", () => {
  it("no modo anual, a barra vira o ano inteiro", () => {
    expect(periodoDaBarra("2025", "anual", null)).toEqual(periodoDoAno("2025"));
    expect(periodoDoAno("2025")).toEqual({ inicio: "2025-01-01", fim: "2025-12-31" });
  });

  it("no modo mensal, a barra vira o mês inteiro — e acerta o mês curto", () => {
    expect(periodoDaBarra("Fev", "mensal", 2026)).toEqual({
      inicio: "2026-02-01",
      fim: "2026-02-28",
    });
    expect(periodoDoMes(2024, 1).fim).toBe("2024-02-29");
  });

  it("barra sem rótulo, ou com rótulo que não é mês, não filtra nada", () => {
    expect(periodoDaBarra(undefined, "mensal", 2026)).toBeNull();
    expect(periodoDaBarra("Nubembro", "mensal", 2026)).toBeNull();
    expect(periodoDaBarra("Jan", "mensal", null)).toBeNull();
  });
});

describe("KPIs", () => {
  const contas = [
    conta({ id: 1, data: "2026-01-05", valor_numero: 1000, saldo_numero: 100, situacao: "recebido" }),
    conta({ id: 2, data: "2026-02-05", valor_numero: 500, saldo_numero: 400, situacao: "pendente" }),
  ];

  it("a mesma base dá números diferentes nos dois dialetos", () => {
    // A conta 1 está "recebido": quitada para Contas a Receber, em aberto
    // para Contas a Pagar. É a divergência de domínio aparecendo no número.
    const receber = calcularKpis(contas, RECEBER, AGORA);
    expect(receber.totalQuitado).toBe(1000);
    expect(receber.totalAberto).toBe(400);

    const pagar = calcularKpis(contas, PAGAR, AGORA);
    expect(pagar.totalQuitado).toBe(0);
    expect(pagar.totalAberto).toBe(500);
  });

  it("DEFEITO PRESERVADO: quitada entra pelo valor cheio, aberta entra pelo saldo", () => {
    // A conta 1 vale 1000 e ainda deve 100. Ela entra com 1000 no "recebido";
    // se estivesse em aberto entraria com 100. São grandezas diferentes no
    // mesmo painel — defeito 1.1 do levantamento.
    const kpis = calcularKpis([contas[0]], RECEBER, AGORA);
    expect(kpis.totalQuitado).toBe(1000);
    expect(calcularKpis([contas[0]], PAGAR, AGORA).totalAberto).toBe(100);
  });

  it("DEFEITO PRESERVADO: a média divide pelos meses distintos de EMISSÃO", () => {
    // Três contas emitidas no mesmo mês, vencendo em três meses diferentes:
    // um mês só, então a média é a soma inteira.
    const mesmoMes = [
      conta({ id: 1, data: "2026-05-01", vencimento: "2026-06-01", saldo_numero: 100 }),
      conta({ id: 2, data: "2026-05-20", vencimento: "2026-07-01", saldo_numero: 200 }),
      conta({ id: 3, data: "2026-05-31", vencimento: "2026-08-01", saldo_numero: 300 }),
    ];
    expect(calcularKpis(mesmoMes, RECEBER, AGORA).mediaMensal).toBe(600);
  });

  it("sem nenhuma conta, a média é zero e não vira NaN", () => {
    expect(calcularKpis([], RECEBER, AGORA).mediaMensal).toBe(0);
  });

  it("a vencer em 30 dias inclui hoje e o trigésimo dia, e ignora as quitadas", () => {
    const janela = [
      conta({ id: 1, vencimento: "2026-08-30", situacao: "pendente" }),
      conta({ id: 2, vencimento: "2026-08-31", situacao: "pendente" }),
      conta({ id: 3, vencimento: "2026-09-30", situacao: "pendente" }),
      conta({ id: 4, vencimento: "2026-10-01", situacao: "pendente" }),
      conta({ id: 5, vencimento: "2026-09-10", situacao: "recebido" }),
    ];
    expect(calcularKpis(janela, RECEBER, AGORA).aVencer30).toBe(2);
    // Para Contas a Pagar, "recebido" não é quitada: a 5 entra na janela.
    expect(calcularKpis(janela, PAGAR, AGORA).aVencer30).toBe(3);
  });

  it("a contagem de vencidas vem pronta do contexto, e a tela só soma", () => {
    const vencidas = [
      conta({ id: 1, vencida: true }),
      conta({ id: 2, vencida: false }),
      conta({ id: 3, vencida: true }),
    ];
    expect(calcularKpis(vencidas, RECEBER, AGORA).contasVencidas).toBe(2);
  });
});

describe("gráfico de evolução", () => {
  it("a série de quitado leva o nome do dialeto", () => {
    const contas = [conta({ id: 1, data: "2026-01-05", valor_numero: 10, situacao: "pago" })];

    expect(montarEvolucao(contas, RECEBER, AGORA).dados[0]).toEqual({
      label: "Jan",
      recebido: 10,
      aberto: 0,
    });
    expect(montarEvolucao(contas, PAGAR, AGORA).dados[0]).toEqual({
      label: "Jan",
      pago: 10,
      aberto: 0,
    });
  });

  it("com um ano só, desenha os doze meses — inclusive os zerados", () => {
    const evolucao = montarEvolucao([conta({ id: 1, data: "2026-03-05" })], RECEBER, AGORA);

    expect(evolucao.modo).toBe("mensal");
    expect(evolucao.ano).toBe(2026);
    expect(evolucao.titulo).toBe("Evolução Mensal — 2026");
    expect(evolucao.dados).toHaveLength(12);
  });

  it("com mais de um ano, troca para anual e só desenha ano que tem conta", () => {
    const contas = [
      conta({ id: 1, data: "2026-01-01", saldo_numero: 20 }),
      conta({ id: 2, data: "2020-01-01", saldo_numero: 10 }),
    ];
    const evolucao = montarEvolucao(contas, RECEBER, AGORA);

    expect(evolucao.modo).toBe("anual");
    expect(evolucao.titulo).toBe("Evolução Anual");
    expect(evolucao.dados).toEqual([
      { label: "2020", recebido: 0, aberto: 10 },
      { label: "2026", recebido: 0, aberto: 20 },
    ]);
  });

  it("sem nenhuma conta, cai no ano do relógio", () => {
    expect(montarEvolucao([], RECEBER, AGORA).titulo).toBe("Evolução Mensal — 2026");
  });
});

describe("gráficos de categoria e de contraparte", () => {
  it("categoria soma o valor cheio, ordena do maior e para em oito fatias", () => {
    const contas = Array.from({ length: 10 }, (_, i) =>
      conta({ id: i + 1, categoria: `Cat ${i + 1}`, valor_numero: (i + 1) * 10 }),
    );
    const fatias = montarCategorias(contas);

    expect(fatias).toHaveLength(8);
    expect(fatias[0]).toEqual({ name: "Cat 10", value: 100 });
    // As SETE maiores levam o nome delas; a oitava é a de "Outros".
    expect(fatias[6]).toEqual({ name: "Cat 4", value: 40 });
  });

  it("o que não cabe nas sete maiores vira a fatia Outros, e nada se perde", () => {
    // Antes a nona categoria em diante sumia do gráfico, e o percentual que
    // o recharts escreve em cada fatia era calculado sobre a soma das oito.
    const contas = Array.from({ length: 10 }, (_, i) =>
      conta({ id: i + 1, categoria: `Cat ${i + 1}`, valor_numero: (i + 1) * 10 }),
    );
    const fatias = montarCategorias(contas);

    // Cat 3 + Cat 2 + Cat 1 = 30 + 20 + 10.
    expect(fatias[7]).toEqual({ name: "Outros", value: 60 });
    const soma = fatias.reduce((total, fatia) => total + fatia.value, 0);
    expect(soma).toBe(550);
    expect(contas.reduce((total, c) => total + c.valor_numero, 0)).toBe(550);
  });

  it("com oito categorias ou menos não há fatia Outros nenhuma", () => {
    const contas = Array.from({ length: 8 }, (_, i) =>
      conta({ id: i + 1, categoria: `Cat ${i + 1}`, valor_numero: (i + 1) * 10 }),
    );
    expect(montarCategorias(contas).map((f) => f.name)).toEqual([
      "Cat 8",
      "Cat 7",
      "Cat 6",
      "Cat 5",
      "Cat 4",
      "Cat 3",
      "Cat 2",
      "Cat 1",
    ]);
  });

  it("categoria nula vira Sem categoria, e vazia é uma fatia à parte", () => {
    const contas = [
      conta({ id: 1, categoria: null, valor_numero: 100 }),
      conta({ id: 2, categoria: "", valor_numero: 50 }),
    ];
    expect(montarCategorias(contas)).toEqual([
      { name: "Sem categoria", value: 100 },
      { name: "", value: 50 },
    ]);
  });

  it("contraparte soma por nome cru e para em dez", () => {
    const contas = Array.from({ length: 12 }, (_, i) =>
      conta({ id: i + 1, cliente_nome: `Cliente ${i + 1}`, valor_numero: (i + 1) * 10 }),
    );
    expect(montarContrapartes(contas)).toHaveLength(10);
    expect(montarContrapartes(contas)[0]).toEqual({ nome: "Cliente 12", valor: 120 });
  });

  it("DEFEITO PRESERVADO: caixa e espaço sobrando viram contrapartes diferentes", () => {
    const contas = [
      conta({ id: 1, cliente_nome: "Alfa", valor_numero: 100 }),
      conta({ id: 2, cliente_nome: "ALFA", valor_numero: 50 }),
      conta({ id: 3, cliente_nome: "Alfa ", valor_numero: 10 }),
    ];
    expect(montarContrapartes(contas)).toHaveLength(3);
  });
});

describe("busca da tabela", () => {
  const contas = [
    conta({ id: 1, cliente_nome: "Beta Mineração", categoria: "Locação" }),
    conta({ id: 2, cliente_nome: "Gama", nro_documento: "NF-002", historico: "Contrato anual" }),
  ];

  it("procura em nome, categoria, nº do documento e histórico, sem diferenciar caixa", () => {
    expect(buscarNasContas(contas, "bETA").map((c) => c.id)).toEqual([1]);
    expect(buscarNasContas(contas, "locação").map((c) => c.id)).toEqual([1]);
    expect(buscarNasContas(contas, "nf-002").map((c) => c.id)).toEqual([2]);
    expect(buscarNasContas(contas, "contrato").map((c) => c.id)).toEqual([2]);
  });

  it("termo vazio devolve a lista inteira", () => {
    expect(buscarNasContas(contas, "")).toHaveLength(2);
  });

  it("a busca ignora acento nos dois lados", () => {
    expect(buscarNasContas(contas, "mineração").map((c) => c.id)).toEqual([1]);
    expect(buscarNasContas(contas, "mineracao").map((c) => c.id)).toEqual([1]);
    // A cedilha entra pelo mesmo caminho: `ç` normalizado vira `c`.
    expect(buscarNasContas(contas, "locacao").map((c) => c.id)).toEqual([1]);
    expect(buscarNasContas(contas, "LOCAÇÃO").map((c) => c.id)).toEqual([1]);
    // E continua sem casar quem de fato não está lá.
    expect(buscarNasContas(contas, "mineradora")).toEqual([]);
  });
});

describe("ordenação", () => {
  const contas = [
    conta({ id: 1, cliente_nome: "Beta", valor_numero: 200 }),
    conta({ id: 2, cliente_nome: "Alfa", valor_numero: 1000 }),
    conta({ id: 3, cliente_nome: "Gama", valor_numero: 30 }),
  ];

  it("número compara como número, não como texto", () => {
    expect(
      ordenarContas(contas, { campo: "valor_numero", direcao: "asc" }).map((c) => c.id),
    ).toEqual([3, 1, 2]);
  });

  it("texto compara com localeCompare, nas duas direções", () => {
    expect(
      ordenarContas(contas, { campo: "cliente_nome", direcao: "asc" }).map((c) => c.id),
    ).toEqual([2, 1, 3]);
    expect(
      ordenarContas(contas, { campo: "cliente_nome", direcao: "desc" }).map((c) => c.id),
    ).toEqual([3, 1, 2]);
  });

  it("empate devolve a ordem da API nas DUAS direções, e não a invertida", () => {
    const empatadas = [
      conta({ id: 1, valor_numero: 100 }),
      conta({ id: 2, valor_numero: 100 }),
      conta({ id: 3, valor_numero: 100 }),
    ];
    expect(ordenarContas(empatadas, { campo: "valor_numero", direcao: "asc" }).map((c) => c.id)).toEqual([1, 2, 3]);
    expect(ordenarContas(empatadas, { campo: "valor_numero", direcao: "desc" }).map((c) => c.id)).toEqual([1, 2, 3]);
  });

  it("não mexe na lista que recebeu", () => {
    const original = [...contas];
    ordenarContas(contas, { campo: "valor_numero", direcao: "desc" });
    expect(contas).toEqual(original);
  });

  it("o primeiro clique numa coluna é sempre decrescente, inclusive na já ordenada", () => {
    expect(proximaOrdenacao({ campo: "vencimento", direcao: "asc" }, "vencimento")).toEqual({
      campo: "vencimento",
      direcao: "desc",
    });
    expect(proximaOrdenacao({ campo: "vencimento", direcao: "desc" }, "vencimento")).toEqual({
      campo: "vencimento",
      direcao: "asc",
    });
    expect(proximaOrdenacao({ campo: "vencimento", direcao: "desc" }, "valor_numero")).toEqual({
      campo: "valor_numero",
      direcao: "desc",
    });
  });
});

describe("paginação", () => {
  it("a página tem quinze linhas", () => {
    const contas = Array.from({ length: 20 }, (_, i) => conta({ id: i + 1 }));
    expect(fatiaDaPagina(contas, 1)).toHaveLength(15);
    expect(fatiaDaPagina(contas, 1).map((c) => c.id)[0]).toBe(1);
    expect(fatiaDaPagina(contas, 2).map((c) => c.id)).toEqual([16, 17, 18, 19, 20]);
  });
});

describe("planilha", () => {
  const FORMATO_RECEBER = {
    aba: "Contas a Receber",
    prefixoDoArquivo: "contas_a_receber",
    rotuloDaContraparte: "Cliente",
    colunasProprias: () => ({ "Forma Pagamento": "Boleto", Portador: "Banco Um" }),
  };

  const FORMATO_PAGAR = {
    aba: "Contas a Pagar",
    prefixoDoArquivo: "contas_a_pagar",
    rotuloDaContraparte: "Fornecedor",
    colunasProprias: (c: ContaDeExemplo) => ({ Ocorrência: c.ocorrencia }),
  };

  const umaConta = conta({
    id: 1,
    cliente_nome: "Alfa",
    valor_numero: 1000,
    saldo_numero: 0,
    situacao: "recebido",
    data: "2026-01-10",
    vencimento: "2026-01-20",
  });

  it("as duas telas exportam as mesmas colunas, na mesma ordem", () => {
    // Só o nome da contraparte e a coluna que existe numa API só é que
    // mudam. `ID Tiny` e `Emissão` existem nas duas.
    expect(Object.keys(linhasDaPlanilha([umaConta], RECEBER, FORMATO_RECEBER)[0])).toEqual([
      "ID Tiny",
      "Cliente",
      "CPF_CNPJ",
      "Categoria",
      "Nº Documento",
      "Histórico",
      "Valor",
      "Saldo",
      "Emissão",
      "Vencimento",
      "Liquidação",
      "Situação",
      "Vencida",
      "Forma Pagamento",
      "Portador",
      "Cidade",
      "UF",
    ]);

    expect(Object.keys(linhasDaPlanilha([umaConta], PAGAR, FORMATO_PAGAR)[0])).toEqual([
      "ID Tiny",
      "Fornecedor",
      "CPF_CNPJ",
      "Categoria",
      "Nº Documento",
      "Histórico",
      "Valor",
      "Saldo",
      "Emissão",
      "Vencimento",
      "Liquidação",
      "Situação",
      "Vencida",
      "Ocorrência",
      "Cidade",
      "UF",
    ]);
  });

  it("dinheiro sai como número e data sai como texto dd/mm/aaaa", () => {
    const linha = linhasDaPlanilha([umaConta], RECEBER, FORMATO_RECEBER)[0];
    expect(linha.Valor).toBe(1000);
    expect(linha.Emissão).toBe("10/01/2026");
    expect(linha.Liquidação).toBe("-");
  });

  it("a coluna Situação guarda a situação real, e o vencimento vira coluna própria", () => {
    // Antes a `Situação` da vencida era trocada pelo literal "Vencida", e
    // quem abria a planilha não distinguia mais "pendente" de "aberto".
    const vencida = conta({ id: 2, situacao: "pendente", vencida: true });
    const noPrazo = conta({ id: 3, situacao: "aberto", vencida: false });

    const linhas = linhasDaPlanilha([vencida, noPrazo], RECEBER, FORMATO_RECEBER);
    expect(linhas[0].Situação).toBe("pendente");
    expect(linhas[0].Vencida).toBe("Sim");
    expect(linhas[1].Situação).toBe("aberto");
    expect(linhas[1].Vencida).toBe("Não");
  });

  it("o nome do arquivo usa a data LOCAL, e não a de Greenwich", () => {
    // Às 23h de 31/08 em Brasília já é 01/09 em Greenwich: o arquivo saía
    // com a data de amanhã e quem exportava à noite arquivava errado.
    const viradaDoMes = new Date("2026-09-01T02:00:00Z");
    const foraDoUtc = viradaDoMes.getTimezoneOffset() !== 0;

    expect(nomeDoArquivo("contas_a_receber", AGORA)).toBe("contas_a_receber_2026-08-31.xlsx");
    expect(nomeDoArquivo("contas_a_receber", viradaDoMes)).toBe(
      foraDoUtc ? "contas_a_receber_2026-08-31.xlsx" : "contas_a_receber_2026-09-01.xlsx",
    );
  });
});
