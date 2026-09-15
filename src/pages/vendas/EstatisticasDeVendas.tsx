import { Card, CardTitle, DataList } from "../../design-system/ui";
import type { ComparativoMensal } from "./vendas";

const DINHEIRO = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

export interface EstatisticasDeVendasProps {
  resumo: { label: string; value: string | number }[];
  comparativo: ComparativoMensal | null;
  performance: { label: string; value: string }[];
}

/**
 * Os três cartões de rodapé: resumo do período, comparativo mensal e
 * performance.
 *
 * Nascem limpos, sobre o `DataList`. As cores cruas dos valores saem: verde na
 * maior venda, vermelho na menor e amarelo no desvio não diziam nada que o
 * rótulo já não dissesse. A variação perde o verde e o vermelho — o `DataList`
 * só recebe texto —, e o sentido fica no sinal, "+" ou "-".
 */
export function EstatisticasDeVendas({
  resumo,
  comparativo,
  performance,
}: EstatisticasDeVendasProps) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card padding="lg">
        <CardTitle className="mb-4">Resumo do Período</CardTitle>
        <DataList items={resumo.map((item) => ({ key: item.label, ...item }))} />
      </Card>

      <Card padding="lg">
        <CardTitle className="mb-4">Comparativo Mensal</CardTitle>
        {comparativo ? (
          <DataList
            items={[
              {
                key: "variacao",
                label: "Variação último mês",
                value: `${comparativo.variacao >= 0 ? "+" : ""}${comparativo.variacao.toFixed(1)}%`,
              },
              {
                key: "melhor",
                label: "Melhor mês",
                value: comparativo.melhorMes,
              },
              {
                key: "media",
                label: "Média mensal",
                value: `R$ ${comparativo.mediaMensal.toLocaleString("pt-BR", DINHEIRO)}`,
              },
            ]}
          />
        ) : null}
      </Card>

      <Card padding="lg">
        <CardTitle className="mb-4">Performance de Vendas</CardTitle>
        <DataList
          items={performance.map((item) => ({ key: item.label, ...item }))}
        />
      </Card>
    </div>
  );
}
