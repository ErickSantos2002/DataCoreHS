import { KpiCard } from "../../design-system/ui";
import type { KpisDeVendedor } from "./vendedores";

export interface KpisDeVendedoresProps {
  kpis: KpisDeVendedor;
}

const DINHEIRO = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

/**
 * A faixa de quatro indicadores do topo.
 *
 * Nasce limpa, sobre o `KpiCard`. Molde: `servicos/KpisDeServicos.tsx`. Saem
 * junto os quatro ícones em círculo colorido (`bg-blue-100 dark:bg-blue-900`,
 * roxo, verde, laranja): o `KpiCard` do design system não tem ícone, e a cor
 * de cada número vinha de uma paleta crua diferente sem significado — o
 * faturamento era azul no claro e AMARELO no escuro.
 *
 * "Produto Top" usa `valorEhTexto`, que trunca com reticências e põe o nome
 * inteiro no `title`. A nota embaixo mantém o formato que a tela tinha,
 * `toLocaleString("pt-BR")` sem casas fixas ("R$ 5.000"): mudar para duas casas
 * é decisão de apresentação, não desta extração.
 */
export function KpisDeVendedores({ kpis }: KpisDeVendedoresProps) {
  return (
    <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
      <KpiCard
        label="Faturamento Total"
        value={`R$ ${kpis.totalFaturado.toLocaleString("pt-BR", DINHEIRO)}`}
        tone="acao"
      />

      <KpiCard label="Número de Vendas" value={kpis.totalVendas} tone="positivo" />

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
