import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GraficosDeProdutos } from "./GraficosDeProdutos";
import type { ProdutoAgregado } from "./produtos";

/**
 * O rótulo do eixo Y do gráfico "Top 10 Produtos (Valor)".
 *
 * Os cinco `Produtos.*.test.tsx` mocam o recharts com `YAxis: () => null`, o
 * que deixa a render-prop de `tick` sem NUNCA executar — foi por isso que o
 * `fontSize={11}` daquele eixo atravessou a migração inteira sem ninguém ver.
 * O dublê daqui é o mesmo em espírito, com uma diferença: quando `tick` é
 * função, ele a CHAMA e desenha o que ela devolve. O `<svg>` em volta é
 * necessário para o React criar o `<text>` no namespace certo.
 *
 * Só isso: o que se testa continua sendo o nosso código — a render-prop que
 * `GraficosDeProdutos.tsx` escreve —, e não o recharts, que segue sendo dublê.
 */
vi.mock("recharts", () => {
  const semDesenho = () => null;
  const passante = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: passante,
    BarChart: passante,
    LineChart: passante,
    Bar: semDesenho,
    Line: semDesenho,
    XAxis: semDesenho,
    YAxis: ({ tick }: { tick?: unknown }) =>
      typeof tick === "function" ? (
        <svg>{tick({ x: 0, y: 0, payload: { value: 1500 } })}</svg>
      ) : null,
    Tooltip: semDesenho,
    CartesianGrid: semDesenho,
  };
});

const RANKING: ProdutoAgregado[] = [
  {
    codigo: "P1",
    descricao: "Bafômetro Digital",
    quantidadeVendida: 10,
    valorTotal: 1500,
    valorMedio: 150,
    numeroVendas: 3,
  },
];

describe("GraficosDeProdutos", () => {
  it("o rotulo do eixo Y do ranking nao desce abaixo de 12px", () => {
    // Item 5 do checklist de tela migrada: 11px é abaixo do piso legível, e
    // rótulo de eixo é justamente o texto lido de relance. As outras três
    // marcações desta tela já usavam 12 — só esta destoava.
    render(<GraficosDeProdutos evolucao={[]} ranking={RANKING} />);

    const rotulo = screen.getByText("R$ 1.5K");

    expect(rotulo.getAttribute("font-size")).toBe("12");
  });
});
