import { KpiCard } from "../../design-system/ui";
import type { KpisDeVendas as Kpis } from "./vendas";

export interface KpisDeVendasProps {
  kpis: Kpis;
}

const DINHEIRO = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

/**
 * A faixa de quatro indicadores do topo.
 *
 * Nasce limpa, sobre o `KpiCard`. Saem os ícones em círculo colorido e as
 * cores cruas sem significado — o faturamento era azul no claro e amarelo no
 * escuro, como em Vendedores.
 *
 * A nota do "Produto Top" mantém o formato que a tela tinha, sem casas fixas
 * ("R$ 6.000").
 */
export function KpisDeVendas({ kpis }: KpisDeVendasProps) {
  return (
    <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
      <KpiCard
        label="Faturamento Total"
        value={`R$ ${kpis.totalFaturado.toLocaleString("pt-BR", DINHEIRO)}`}
        tone="acao"
      />

      <KpiCard
        label="Número de Vendas"
        value={kpis.totalVendas}
        tone="positivo"
      />

      <KpiCard
        label="Ticket Médio"
        value={`R$ ${kpis.ticketMedio.toLocaleString("pt-BR", DINHEIRO)}`}
      />

      <KpiCard
        label="Produto Top"
        value={kpis.produtoMaisVendido?.nome || "N/A"}
        valorEhTexto
        note={`R$ ${kpis.produtoMaisVendido?.valor?.toLocaleString("pt-BR") || "0"}`}
      />
    </div>
  );
}
