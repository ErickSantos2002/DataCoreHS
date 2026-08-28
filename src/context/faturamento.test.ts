import { describe, expect, it } from "vitest";

import type { NotaServico, NotaVenda } from "../services/notasapi";
import {
  emissaoEmAnoMes,
  extrairCFOP,
  rotuloDoMes,
  somarServicos,
  somarVendas,
  totaisPorMes,
  valorDoServico,
  vendaConta,
  type RegrasDeFaturamento,
} from "./faturamento";

/**
 * A regra que decide o que é faturamento, testada como regra.
 *
 * Ela estava embutida no DashboardContext, repetida em dois lugares, e agora
 * é aplicada em três recortes (trimestre, ano corrente, ano anterior). Cada
 * condição que se perder aqui muda TODOS os números da tela de Meta de uma
 * vez — e muda em silêncio, porque nota a mais ou a menos não quebra nada,
 * só engorda ou magrece um total plausível.
 */

const REGRAS: RegrasDeFaturamento = {
  cfopValidos: ["5102", "6102"],
  marcadoresInvalidos: ["bonificação", "amostra"],
};

function venda(parcial: Partial<NotaVenda>): NotaVenda {
  return {
    id: 1,
    data_emissao: "2026-06-15",
    valor_nota: 1_000,
    cliente: null,
    nome_vendedor: "",
    itens: [],
    natureza_operacao: "5102 - Venda de mercadoria",
    descricao_situacao: "Emitida DANFE",
    ...parcial,
  } as NotaVenda;
}

function servico(parcial: Partial<NotaServico>): NotaServico {
  return {
    id: 1,
    numero_nfse: "1",
    data_emissao: "2026-06-15",
    valor_servico: "1000.00",
    razao_social_tomador: "",
    cpf_cnpj_tomador: "",
    cidade_tomador: "",
    uf_tomador: "",
    discriminacao_servico: "",
    ...parcial,
  } as NotaServico;
}

describe("CFOP da natureza de operação", () => {
  it("acha os quatro dígitos no meio do texto livre do Tiny", () => {
    expect(extrairCFOP("5102 - Venda de mercadoria")).toBe("5102");
    expect(extrairCFOP("Venda 6102 fora do estado")).toBe("6102");
  });

  it("sem quatro dígitos, devolve vazio — e vazio não está em CFOP_VALIDOS", () => {
    expect(extrairCFOP("Venda de mercadoria")).toBe("");
    expect(extrairCFOP(null)).toBe("");
    expect(extrairCFOP(undefined)).toBe("");
  });
});

describe("o que conta como venda faturada", () => {
  it("conta a nota com CFOP válido, DANFE emitida e valor positivo", () => {
    expect(vendaConta(venda({}), REGRAS)).toBe(true);
  });

  it("não conta CFOP fora da lista", () => {
    expect(
      vendaConta(venda({ natureza_operacao: "5910 - Bonificação" }), REGRAS),
    ).toBe(false);
  });

  it("não conta nota que não chegou a virar DANFE", () => {
    // Cancelada, denegada, "em digitação": é nota que existe e não faturou.
    for (const situacao of ["Cancelada", "Denegada", "Em digitação", ""]) {
      expect(vendaConta(venda({ descricao_situacao: situacao }), REGRAS)).toBe(
        false,
      );
    }
  });

  it("lê a situação sem depender de caixa nem de espaço em volta", () => {
    expect(
      vendaConta(venda({ descricao_situacao: "  EMITIDA DANFE " }), REGRAS),
    ).toBe(true);
  });

  it("um único marcador proibido tira a nota inteira", () => {
    expect(
      vendaConta(
        venda({
          marcadores: [{ descricao: "Cliente novo" }, { descricao: "Amostra" }],
        }),
        REGRAS,
      ),
    ).toBe(false);
  });

  it("marcador que não está na lista de proibidos não atrapalha", () => {
    expect(
      vendaConta(venda({ marcadores: [{ descricao: "Cliente novo" }] }), REGRAS),
    ).toBe(true);
  });

  it("nota sem valor não conta", () => {
    expect(vendaConta(venda({ valor_nota: 0 }), REGRAS)).toBe(false);
  });
});

describe("valor da nota de serviço", () => {
  it("lê o ponto decimal do jeito americano", () => {
    expect(valorDoServico(servico({ valor_servico: "1234.50" }))).toBeCloseTo(
      1234.5,
      2,
    );
  });

  it("lê milhar com ponto e decimal com vírgula", () => {
    // Sem este desvio, parseFloat("1.234,50") devolve 1,234: uma nota de mil
    // e duzentos reais entraria na soma do ano valendo um real e pouco.
    expect(valorDoServico(servico({ valor_servico: "1.234,50" }))).toBeCloseTo(
      1234.5,
      2,
    );
  });

  it("aceita o valor quando ele vem como número", () => {
    expect(valorDoServico(servico({ valor_servico: 900.25 }))).toBeCloseTo(
      900.25,
      2,
    );
  });

  it("o que não vira número vale zero, e não NaN", () => {
    expect(valorDoServico(servico({ valor_servico: "" }))).toBe(0);
    expect(valorDoServico(servico({ valor_servico: "isento" }))).toBe(0);
  });
});

describe("somas", () => {
  it("soma só as vendas que passam pelo filtro", () => {
    const total = somarVendas(
      [
        venda({ valor_nota: 1_000 }),
        venda({ valor_nota: 500, descricao_situacao: "Cancelada" }),
        venda({ valor_nota: 250, natureza_operacao: "9999 - Outra" }),
        venda({ valor_nota: 300 }),
      ],
      REGRAS,
    );

    expect(total).toBe(1_300);
  });

  it("soma serviço sem filtrar por CFOP nem marcador", () => {
    expect(
      somarServicos([
        servico({ valor_servico: "1.500,00" }),
        servico({ valor_servico: "500.50" }),
      ]),
    ).toBeCloseTo(2_000.5, 2);
  });
});

describe("mês da data de emissão", () => {
  it("lê ano e mês de AAAA-MM-DD", () => {
    expect(emissaoEmAnoMes("2026-07-04")).toEqual({ ano: 2026, mes: 7 });
  });

  it("data ausente ou fora do formato não vira mês nenhum", () => {
    // `new Date("")` viraria janeiro: um mês errado com cara de certo.
    expect(emissaoEmAnoMes("")).toBeNull();
    expect(emissaoEmAnoMes(null)).toBeNull();
    expect(emissaoEmAnoMes("04/07/2026")).toBeNull();
    expect(emissaoEmAnoMes("2026-13-01")).toBeNull();
  });
});

describe("faturamento mês a mês do ano", () => {
  it("distribui venda e serviço pelo mês da emissão", () => {
    const totais = totaisPorMes({
      vendas: [
        venda({ data_emissao: "2026-01-10", valor_nota: 100 }),
        venda({ data_emissao: "2026-01-31", valor_nota: 50 }),
        venda({ data_emissao: "2026-12-01", valor_nota: 700 }),
      ],
      servicos: [
        servico({ data_emissao: "2026-01-05", valor_servico: "25,00" }),
        servico({ data_emissao: "2026-03-05", valor_servico: "400.00" }),
      ],
      regras: REGRAS,
      ano: 2026,
    });

    expect(totais).toHaveLength(12);
    expect(totais[0]).toBeCloseTo(175, 2); // janeiro: 100 + 50 + 25
    expect(totais[2]).toBeCloseTo(400, 2); // março
    expect(totais[11]).toBeCloseTo(700, 2); // dezembro
    expect(totais[1]).toBe(0); // fevereiro sem nota é zero, não buraco
  });

  it("aplica o mesmo filtro de venda que o total do trimestre", () => {
    const totais = totaisPorMes({
      vendas: [
        venda({ data_emissao: "2026-02-10", valor_nota: 900 }),
        venda({
          data_emissao: "2026-02-11",
          valor_nota: 900,
          descricao_situacao: "Cancelada",
        }),
      ],
      servicos: [],
      regras: REGRAS,
      ano: 2026,
    });

    expect(totais[1]).toBe(900);
  });

  it("nota de outro ano não entra no balde", () => {
    // A requisição é por intervalo de data, mas o balde não confia nisso: uma
    // nota de dezembro do ano anterior somaria em dezembro do ano corrente.
    const totais = totaisPorMes({
      vendas: [venda({ data_emissao: "2025-12-20", valor_nota: 900 })],
      servicos: [servico({ data_emissao: "2025-12-20", valor_servico: "10" })],
      regras: REGRAS,
      ano: 2026,
    });

    expect(totais.reduce((a, b) => a + b, 0)).toBe(0);
  });
});

describe("rótulo do mês", () => {
  it("escreve o mês por extenso com inicial maiúscula e o ano", () => {
    expect(rotuloDoMes(1, 2026)).toBe("Janeiro/2026");
    expect(rotuloDoMes(9, 2025)).toBe("Setembro/2025");
  });
});
