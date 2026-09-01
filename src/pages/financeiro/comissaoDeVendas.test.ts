import { describe, expect, it } from "vitest";

import {
  ALIQUOTA_OUTBOUND,
  lerVendedorDigitado,
  vendedorDigitadoVazio,
  aliquotaDeRecompra,
  aliquotaDeInbound,
  bonusPorDesempenho,
  calcularComissoes,
  rateioPorVendedor,
  vendedorVazio,
  type FaturamentoDoVendedor,
} from "./comissaoDeVendas";

/**
 * A regra de comissão de vendas, do sistema de comissionamento do 2º
 * quadrimestre. As alíquotas mudam de faixa no meio de um real — 499.999,99
 * paga 0,75% e 500.000,00 paga 1% —, então o teste vive nas bordas: é lá que
 * um `>` trocado por `>=` muda o que alguém recebe.
 */

/** Um vendedor com só um dos três canais preenchido. */
function vendedor(
  campos: Partial<FaturamentoDoVendedor>,
): FaturamentoDoVendedor {
  return { ...vendedorVazio("v1"), nome: "Fulano", ...campos };
}

describe("comissão de vendas — alíquota de inbound", () => {
  it.each([
    [0, 0.0075],
    [199_999, 0.0075],
    [499_999.99, 0.0075],
    [500_000, 0.01],
    [749_999.99, 0.01],
    [750_000, 0.0125],
    [999_999.99, 0.0125],
    [1_000_000, 0.015],
    [5_000_000, 0.015],
  ])("faturamento total de %s paga %s", (total, esperada) => {
    expect(aliquotaDeInbound(total)).toBe(esperada);
  });
});

describe("comissão de vendas — alíquota de recompra", () => {
  it.each([
    [0, 0.005],
    [499_999.99, 0.005],
    [500_000, 0.01],
    [1_000_000, 0.01],
  ])("faturamento total de %s paga %s", (total, esperada) => {
    expect(aliquotaDeRecompra(total)).toBe(esperada);
  });

  it("não sobe além de 1% — a recompra tem só dois degraus", () => {
    // O inbound continua subindo até 1,5%; a recompra para em 1%. Espelhar um
    // no outro pagaria meio ponto a mais em toda recompra de quem vende bem.
    expect(aliquotaDeRecompra(5_000_000)).toBe(0.01);
  });
});

describe("comissão de vendas — alíquota de outbound", () => {
  it("é fixa em 1,5%, em qualquer faixa", () => {
    // Prospecção da origem é o maior esforço e por isso tem a maior alíquota
    // fixa: não depende de quanto o vendedor fez no mês.
    expect(ALIQUOTA_OUTBOUND).toBe(0.015);
  });
});

describe("comissão de vendas — bônus por desempenho", () => {
  it.each([
    [0, 0],
    [199_999.99, 0],
    [200_000, 250],
    [399_999.99, 250],
    [400_000, 500],
    [499_999.99, 500],
    [500_000, 750],
    [999_999.99, 750],
    [1_000_000, 1_500],
  ])("faturamento total de %s dá bônus de %s", (total, esperado) => {
    expect(bonusPorDesempenho(total)).toBe(esperado);
  });
});

describe("comissão de vendas — a faixa sai do TOTAL do vendedor", () => {
  it("soma os três canais antes de escolher a alíquota", () => {
    // 300.000 de inbound sozinho pagaria 0,75%. Com 300.000 de outbound no
    // mesmo mês o vendedor passa de 500.000 e o inbound dele vale 1%.
    const { linhas } = calcularComissoes(
      [vendedor({ inbound: 300_000, outbound: 300_000 })],
      0,
    );

    expect(linhas[0].total).toBe(600_000);
    expect(linhas[0].aliquotas.inbound).toBe(0.01);
    // 300.000 × 1% + 300.000 × 1,5% = 3.000 + 4.500.
    expect(linhas[0].comissao).toBeCloseTo(7_500, 2);
  });

  it("o bônus também sai do total, não de cada canal", () => {
    // 150.000 em cada canal: nenhum chega a 200.000 sozinho, o total chega.
    const { linhas } = calcularComissoes(
      [vendedor({ inbound: 150_000, recompra: 150_000 })],
      0,
    );

    expect(linhas[0].bonus).toBe(250);
  });
});

describe("comissão de vendas — rateio de 1%", () => {
  it("é 1% do faturamento total dividido pelos vendedores", () => {
    expect(rateioPorVendedor(1_000_000, 4)).toBe(2_500);
  });

  it("sem vendedor nenhum não divide por zero", () => {
    expect(rateioPorVendedor(1_000_000, 0)).toBe(0);
  });

  it("divide entre TODOS da lista, inclusive quem não vendeu", () => {
    // A Beto aparece no fechamento com zero em tudo. Tirá-la da conta daria
    // um rateio maior aos outros quatro e nenhum a ela — o oposto do que o
    // mínimo garantido existe para fazer.
    const { rateio } = calcularComissoes(
      [vendedor({ id: "a", inbound: 100_000 }), vendedor({ id: "b" })],
      1_000_000,
    );

    expect(rateio).toBe(5_000);
  });
});

describe("comissão de vendas — o que o vendedor recebe", () => {
  it("recebe a comissão quando ela supera o rateio", () => {
    const { linhas } = calcularComissoes(
      [vendedor({ inbound: 700_000 })],
      1_000_000,
    );

    // 700.000 × 1% = 7.000 + bônus 750 = 7.750, contra rateio de 10.000/1.
    expect(linhas[0].comissao).toBeCloseTo(7_000, 2);
    expect(linhas[0].bonus).toBe(750);
    expect(linhas[0].rateio).toBe(10_000);
    // Aqui o rateio ganha, porque é um vendedor só na lista.
    expect(linhas[0].recebe).toBe(10_000);
    expect(linhas[0].peloRateio).toBe(true);
  });

  it("recebe o rateio quando a comissão fica abaixo dele", () => {
    const { linhas } = calcularComissoes(
      [
        vendedor({ id: "a", nome: "Ana", inbound: 700_000 }),
        vendedor({ id: "b", nome: "Bruno", inbound: 150_000 }),
        vendedor({ id: "c", nome: "Carla", inbound: 420_000 }),
        vendedor({ id: "d", nome: "Diego", inbound: 80_000 }),
      ],
      1_000_000,
    );

    const [ana, bruno, , diego] = linhas;
    // Rateio 1.000.000 × 1% ÷ 4 = 2.500.
    expect(ana.recebe).toBeCloseTo(7_750, 2); // 7.000 + 750
    expect(ana.peloRateio).toBe(false);
    expect(bruno.recebe).toBe(2_500); // 1.125 + 0 perde para o rateio
    expect(bruno.peloRateio).toBe(true);
    expect(diego.recebe).toBe(2_500); // 600 + 0 perde para o rateio
  });

  it("vendedor sem venda nenhuma recebe o rateio inteiro", () => {
    const { linhas } = calcularComissoes(
      [vendedor({ id: "a", inbound: 500_000 }), vendedor({ id: "b" })],
      800_000,
    );

    expect(linhas[1].total).toBe(0);
    expect(linhas[1].comissao).toBe(0);
    expect(linhas[1].recebe).toBe(4_000);
  });

  it("o total a pagar é a soma do que cada um recebe", () => {
    const { linhas, totalAPagar } = calcularComissoes(
      [
        vendedor({ id: "a", inbound: 700_000 }),
        vendedor({ id: "b", inbound: 150_000 }),
      ],
      1_000_000,
    );

    expect(totalAPagar).toBeCloseTo(linhas[0].recebe + linhas[1].recebe, 2);
  });
});

describe("comissão de vendas — incentivos ainda inativos", () => {
  it("Inbound Plus não muda o valor enquanto estiver desligado", () => {
    // A conta existe e está testada abaixo; o que este teste fixa é que ela
    // NÃO entra no resultado enquanto a regra não for confirmada.
    const semPlus = calcularComissoes([vendedor({ inbound: 100_000 })], 0);
    const comPlus = calcularComissoes(
      [vendedor({ inbound: 100_000, inboundPlus: 100_000 })],
      0,
    );

    expect(comPlus.linhas[0].recebe).toBe(semPlus.linhas[0].recebe);
  });

  it("Recompra Ativa não muda o valor enquanto estiver desligada", () => {
    const sem = calcularComissoes([vendedor({ recompra: 100_000 })], 0);
    const com = calcularComissoes(
      [vendedor({ recompra: 100_000, recomprasAtivas: 5 })],
      0,
    );

    expect(com.linhas[0].recebe).toBe(sem.linhas[0].recebe);
  });

  it("quando ligados, Inbound Plus soma 0,25% só sobre a parcela Plus", () => {
    // Aplicar os 0,25% sobre o inbound inteiro, como o simulador do site faz,
    // pagaria o adicional em toda venda fácil do mês.
    const linha = calcularComissoes(
      [vendedor({ inbound: 100_000, inboundPlus: 40_000 })],
      0,
      { incentivosAtivos: true },
    ).linhas[0];

    // 100.000 × 0,75% + 40.000 × 0,25% = 750 + 100.
    expect(linha.comissao).toBeCloseTo(850, 2);
  });

  it("quando ligada, Recompra Ativa soma R$ 100 por venda ativada", () => {
    const linha = calcularComissoes(
      [vendedor({ recompra: 100_000, recomprasAtivas: 3 })],
      0,
      { incentivosAtivos: true },
    ).linhas[0];

    // 100.000 × 0,5% = 500 de comissão; 3 × 100 = 300 somados ao bônus.
    expect(linha.comissao).toBeCloseTo(500, 2);
    expect(linha.bonus).toBe(300);
  });
});

describe("comissão de vendas — fechamento de julho/2026", () => {
  /**
   * O fechamento real que o Financeiro fez na planilha, usado como teste de
   * aceitação: se a calculadora não reproduz o mês que já foi pago, ela não
   * serve. Os cinco vendedores e o total de 1_000_000 saem do arquivo
   * "a planilha do fechamento".
   */
  const JULHO: FaturamentoDoVendedor[] = [
    {
      ...vendedorVazio("1"),
      nome: "Vendedor A",
      inbound: 150_000,
      outbound: 70_000,
    },
    { ...vendedorVazio("2"), nome: "Vendedor B", inbound: 280_000 },
    { ...vendedorVazio("3"), nome: "Vendedor C", inbound: 250_000 },
    { ...vendedorVazio("4"), nome: "Vendedor D", inbound: 85_000 },
    { ...vendedorVazio("5"), nome: "Vendedor E" },
  ];
  const FATURAMENTO_TOTAL = 1_000_000;

  it("reproduz o valor de cada vendedor", () => {
    const { linhas, rateio } = calcularComissoes(JULHO, FATURAMENTO_TOTAL);
    const [vendedorA, vendedorB, vendedorC, vendedorD, vendedorE] = linhas;

    // 1_000_000 × 1% ÷ 5 vendedores.
    expect(rateio).toBeCloseTo(2_000, 2);

    // Vendedor A: 150_000 × 0,75% + 70_000 × 1,5% + bônus 250.
    expect(vendedorA.total).toBeCloseTo(220_000, 2);
    expect(vendedorA.recebe).toBeCloseTo(2_425, 2);

    // Vendedor B: 280_000 × 0,75% + 250 = 2_350 — cai EXATAMENTE em meio
    // centavo. O módulo devolve o número cheio de propósito; arredondar aqui
    // esconderia a decisão de quem paga, que é onde ela tem de estar.
    expect(vendedorB.recebe).toBe(2_350);

    // Vendedor C: 250_000 × 0,75% + 250.
    expect(vendedorC.recebe).toBeCloseTo(2_125, 2);

    // Vendedor D: 85_000 × 0,75% = 642,85, abaixo do rateio — leva o rateio.
    expect(vendedorD.recebe).toBeCloseTo(2_000, 2);
    expect(vendedorD.peloRateio).toBe(true);

    // Beto não vendeu no mês e mesmo assim leva o mínimo garantido.
    expect(vendedorE.recebe).toBeCloseTo(2_000, 2);
  });

  it("fecha a folha de comissão do mês", () => {
    const { totalAPagar } = calcularComissoes(JULHO, FATURAMENTO_TOTAL);

    expect(totalAPagar).toBeCloseTo(10_900, 2);
  });
});

describe("comissão de vendas — o que a tela digita", () => {
  it("lê o valor mascarado sem dividir por mil", () => {
    // A máscara escreve "1.234.567"; o parse tem de devolver um milhão e
    // duzentos, não mil e duzentos. É o defeito que o Centro de Custo tem por
    // usar um parse próprio, e que aqui não se repete porque a leitura é a do
    // `src/lib/dinheiro.ts`.
    const digitado = {
      ...vendedorDigitadoVazio("1"),
      nome: "Ana",
      inbound: "1.234.567",
      recompra: "1.234,56",
      outbound: "700.000",
    };

    const lido = lerVendedorDigitado(digitado);

    expect(lido.inbound).toBe(1_234_567);
    expect(lido.recompra).toBe(1_234.56);
    expect(lido.outbound).toBe(700_000);
    expect(lido.nome).toBe("Ana");
  });

  it("campo em branco vale zero, não NaN", () => {
    const lido = lerVendedorDigitado(vendedorDigitadoVazio("1"));

    expect(lido.inbound).toBe(0);
    expect(lido.recomprasAtivas).toBe(0);
  });

  it("a contagem de recompras ativas é inteiro, não dinheiro", () => {
    const lido = lerVendedorDigitado({
      ...vendedorDigitadoVazio("1"),
      recomprasAtivas: "3",
    });

    expect(lido.recomprasAtivas).toBe(3);
  });
});
