import { KpiCard } from "../../design-system/ui";
import type { KpisDeProduto } from "./produtos";

export interface KpisDeProdutosProps {
  kpis: KpisDeProduto;
}

/**
 * A faixa de quatro indicadores do topo da tela de Produtos.
 *
 * Nasceu suja na Task 6 (extração inerte) e foi limpa na mesma task — por
 * isso nunca entrou no `PENDENTES_FASE_3`.
 *
 * "Produto Mais Vendido" usa `valorEhTexto`: o `KpiCard` então trunca com
 * reticências e, sozinho, coloca `title={String(value)}` no valor — é esse
 * atributo que `Produtos.kpis.test.tsx` usa (`getByTitle`) para distinguir
 * o card da mesma descrição que também aparece na tabela.
 */
export function KpisDeProdutos({ kpis }: KpisDeProdutosProps) {
  return (
    <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
      <KpiCard
        label="Quantidade Total Vendida"
        value={kpis.totalProdutosVendidos.toLocaleString("pt-BR")}
      />

      <KpiCard
        label="Faturamento Total"
        value={`R$ ${kpis.totalFaturado.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`}
        tone="positivo"
      />

      <KpiCard
        label="Ticket Médio por Produto"
        value={`R$ ${kpis.ticketMedio.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`}
      />

      <KpiCard
        label="Produto Mais Vendido"
        value={kpis.produtoMaisVendido?.descricao || "N/A"}
        valorEhTexto
        note={`Qtd: ${kpis.produtoMaisVendido?.quantidadeVendida?.toLocaleString("pt-BR") || "0"}`}
      />
    </div>
  );
}
