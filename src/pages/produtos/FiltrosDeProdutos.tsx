import { Filter } from "lucide-react";

import { FilterBar, Input, MultiSelect, Select, deTextos } from "../../design-system/ui";
import { PRESETS_DE_PERIODO } from "../../lib/periodo";

export interface FiltrosDeProdutosProps {
  opcoes: {
    empresas: string[];
    vendedores: string[];
    produtos: string[];
  };
  valores: {
    empresa: string[];
    vendedor: string[];
    produto: string[];
    presetPeriodo: string;
    dataInicio: string;
    dataFim: string;
  };
  onEmpresa: (selecionadas: string[]) => void;
  onVendedor: (selecionadas: string[]) => void;
  onProduto: (selecionadas: string[]) => void;
  onPreset: (preset: string) => void;
  onDataInicio: (data: string) => void;
  onDataFim: (data: string) => void;
}

/**
 * A barra de filtros da tela de Produtos: três multi-seleções (empresas,
 * vendedores, produtos), o preset de período e as duas datas.
 *
 * Limpeza retroativa decidida em 09/09/2026 (ver plano, "Mudança de rumo"):
 * o bloco tinha saído da Task 5 com `dark:` e paleta crua, forçando este
 * arquivo a entrar no `PENDENTES_FASE_3`. Aqui ele adota `FilterBar`,
 * `Select` e `Input` do design system, como `FiltrosDeContas.tsx` já faz
 * para as telas de Contas.
 *
 * `onDataInicio`/`onDataFim` continuam responsáveis por também levar o
 * preset para "custom" — esse acoplamento já existia em `Produtos.tsx` e o
 * componente só recebe a função pronta de fora, sem repetir a decisão aqui.
 */
export function FiltrosDeProdutos({
  opcoes,
  valores,
  onEmpresa,
  onVendedor,
  onProduto,
  onPreset,
  onDataInicio,
  onDataFim,
}: FiltrosDeProdutosProps) {
  return (
    // `mb-6` (e não `flex flex-col gap-6` como em Contas) porque `Produtos.tsx`
    // ainda não migrou o wrapper da página para espaçamento por `gap` — o
    // `FilterBar`/`Card` não traz margem própria, e sem isto os KPIs abaixo
    // colam na barra de filtros.
    <FilterBar className="mb-6">
      <div className="flex w-full items-center gap-2">
        <Filter className="h-4 w-4 text-conteudo-muted" strokeWidth={2} aria-hidden="true" />
        <h2 className="text-base font-semibold text-conteudo-heading">Filtros</h2>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        <MultiSelect
          rotulo="Empresas"
          opcoes={deTextos(opcoes.empresas)}
          selecionados={valores.empresa}
          onChange={onEmpresa}
          placeholder="Todas as empresas"
        />

        <MultiSelect
          rotulo="Vendedores"
          opcoes={deTextos(opcoes.vendedores)}
          selecionados={valores.vendedor}
          onChange={onVendedor}
          placeholder="Todos os vendedores"
        />

        <MultiSelect
          rotulo="Produtos"
          opcoes={deTextos(opcoes.produtos)}
          selecionados={valores.produto}
          onChange={onProduto}
          placeholder="Todos os produtos"
        />

        <Select
          label="Período Rápido"
          options={PRESETS_DE_PERIODO}
          value={valores.presetPeriodo}
          onChange={(evento) => onPreset(evento.target.value)}
        />

        <Input
          label="Data Início"
          type="date"
          value={valores.dataInicio}
          onChange={(evento) => onDataInicio(evento.target.value)}
        />

        <Input
          label="Data Fim"
          type="date"
          value={valores.dataFim}
          onChange={(evento) => onDataFim(evento.target.value)}
        />
      </div>
    </FilterBar>
  );
}
