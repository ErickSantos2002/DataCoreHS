import { KpiCard } from "../../design-system/ui";
import { formatarValorAbreviado, type KpisDeClientes as Kpis } from "./clientes";

export interface KpisDeClientesProps {
  kpis: Kpis;
}

const DINHEIRO = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

/**
 * A faixa de quatro indicadores do topo.
 *
 * Nasce limpa, sobre o `KpiCard`. Saem os ícones em círculo colorido, como em
 * Vendedores e Estoque. O verde e o vermelho crus de ativos e inativos viram
 * `tone="positivo"` e `tone="perigo"`; o roxo do ticket, que não dizia nada,
 * sai.
 */
export function KpisDeClientes({ kpis }: KpisDeClientesProps) {
  return (
    <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
      <KpiCard
        label="Clientes Ativos"
        value={kpis.clientesAtivos}
        tone="positivo"
      />

      <KpiCard
        label="Inativos (90 dias)"
        value={kpis.clientesInativos}
        tone="perigo"
      />

      <KpiCard
        label="Top Cliente"
        value={kpis.topCliente?.nome || "N/A"}
        valorEhTexto
        note={
          kpis.topCliente
            ? formatarValorAbreviado(kpis.topCliente.totalCompradoPeriodo)
            : "R$ 0"
        }
      />

      <KpiCard
        label="Ticket Médio/Cliente"
        value={`R$ ${kpis.ticketMedioPorCliente.toLocaleString("pt-BR", DINHEIRO)}`}
        tone="acao"
      />
    </div>
  );
}
