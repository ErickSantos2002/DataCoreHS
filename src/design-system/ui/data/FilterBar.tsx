import type { ReactNode } from "react";
import { Card } from "../core/Card";
import { Chip } from "../core/Chip";

export interface FilterBarAppliedFilter {
  /** Identifica o filtro nas callbacks — não aparece na pílula. */
  key: string;
  /** Texto da pílula — ex.: "Cliente: INTERCEMENT". */
  label: string;
}

export interface FilterBarView {
  /** Identifica a visão nas callbacks — não aparece na pílula. */
  key: string;
  /** Texto da pílula — ex.: "Minha visão". */
  label: string;
}

export interface FilterBarProps {
  /** Campos de filtro. O `FilterBar` não conhece os filtros de cada tela —
   * quem usa compõe `SearchSelect`, `Select`, `Input` etc. aqui dentro. */
  children: ReactNode;
  /** Bloco de ações à direita da primeira linha, empurrado por `ml-auto`.
   * Só aparece quando fornecido. */
  actions?: ReactNode;
  /** Filtros atualmente aplicados — cada um vira um `Chip` variante
   * "aplicado" na segunda linha, com `×`. */
  appliedFilters?: FilterBarAppliedFilter[];
  /** Chamado com a `key` do filtro removido ao clicar no `×` de uma pílula. */
  onRemoveFilter?: (key: string) => void;
  /** Chamado ao clicar em "Limpar filtros". */
  onClearFilters?: () => void;
  /** Visões salvas — cada uma vira um `Chip` variante "salvo". */
  views?: FilterBarView[];
  /** Chamado com a `key` da visão escolhida ao clicar numa pílula de visão. */
  onSelectView?: (key: string) => void;
  className?: string;
}

/**
 * Moldura de filtros de uma tela de listagem — campos na primeira linha,
 * filtros aplicados e visões salvas na segunda. Não é port: não existe
 * `.d.ts` para ele no design system, a anatomia vem do design do Erick e se
 * repete em oito das doze telas grandes da Fase 3 (Vendas, Serviços,
 * Clientes, Produtos, Vendedores, Estoque e as duas de Contas).
 *
 * Não guarda estado nem decide onde uma visão é salva — memória,
 * `localStorage`, banco. Recebe `appliedFilters` e `views` como propriedade
 * e só avisa por callback quando algo é removido, limpo ou escolhido; quem
 * usa decide o que fazer com o aviso.
 *
 * A segunda linha (separador + "Aplicados"/"Visões") some inteira quando
 * não há nem filtro aplicado nem visão salva — uma barra recém-aberta não
 * mostra estrutura vazia. Cada metade da segunda linha também é
 * independente: só "Aplicados" quando não há visões, só "Visões" quando não
 * há filtros aplicados, com o separador vertical só entre as duas quando
 * ambas aparecem.
 *
 * ```tsx
 * <FilterBar
 *   actions={<Button variant="secondary">Exportar</Button>}
 *   appliedFilters={[{ key: "cliente", label: "Cliente: INTERCEMENT" }]}
 *   onRemoveFilter={(key) => removerFiltro(key)}
 *   onClearFilters={() => limparFiltros()}
 *   views={[{ key: "vencidas", label: "Vencidas" }]}
 *   onSelectView={(key) => aplicarVisao(key)}
 * >
 *   <SearchSelect label="Cliente" ... />
 *   <Select label="Status" ... />
 * </FilterBar>
 * ```
 */
export function FilterBar({
  children,
  actions,
  appliedFilters = [],
  onRemoveFilter,
  onClearFilters,
  views = [],
  onSelectView,
  className,
}: FilterBarProps) {
  const temAplicados = appliedFilters.length > 0;
  const temVisoes = views.length > 0;
  const mostraSegundaLinha = temAplicados || temVisoes;

  return (
    <Card className={className}>
      <div className="flex flex-wrap items-end gap-3">
        {children}
        {actions ? <div className="ml-auto flex items-end gap-2">{actions}</div> : null}
      </div>
      {mostraSegundaLinha ? (
        <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-borda pt-3.5">
          {temAplicados ? (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-conteudo-faint">
                Aplicados
              </span>
              {appliedFilters.map((filtro) => (
                <Chip
                  key={filtro.key}
                  variant="aplicado"
                  onRemove={onRemoveFilter ? () => onRemoveFilter(filtro.key) : undefined}
                >
                  {filtro.label}
                </Chip>
              ))}
              <button
                type="button"
                onClick={onClearFilters}
                className="text-xs font-medium text-conteudo-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                Limpar filtros
              </button>
            </>
          ) : null}
          {temAplicados && temVisoes ? (
            <span aria-hidden="true" className="h-[18px] w-px bg-borda" />
          ) : null}
          {temVisoes ? (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-conteudo-faint">
                Visões
              </span>
              {views.map((visao) =>
                onSelectView ? (
                  <button
                    key={visao.key}
                    type="button"
                    onClick={() => onSelectView(visao.key)}
                    className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <Chip variant="salvo">{visao.label}</Chip>
                  </button>
                ) : (
                  <Chip key={visao.key} variant="salvo">
                    {visao.label}
                  </Chip>
                ),
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
