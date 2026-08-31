export interface PaginationProps {
  /** 1-based. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Plural do que está sendo listado: "chamados", "usuários", "notas". */
  itemLabel?: string;
}

const TAMANHO_JANELA = 5;

function calcularJanela(page: number, totalPages: number): number[] {
  const metade = Math.floor(TAMANHO_JANELA / 2);
  let inicio = Math.max(1, page - metade);
  let fim = inicio + TAMANHO_JANELA - 1;
  if (fim > totalPages) {
    fim = totalPages;
    inicio = Math.max(1, fim - TAMANHO_JANELA + 1);
  }
  const paginas: number[] = [];
  for (let p = inicio; p <= fim; p += 1) paginas.push(p);
  return paginas;
}

/**
 * Paginação de listagem — janela de até 5 páginas mais a contagem de
 * registros em frase completa ("Mostrando 1 a 10 de 84 notas"), nunca em
 * fração ("1-10 / 84"). `itemLabel` parametriza o substantivo porque cada
 * tela lista uma coisa diferente: a de Vendas conta notas, a de Clientes
 * conta clientes.
 *
 * ```tsx
 * <Pagination page={pagina} pageSize={10} total={total} itemLabel="notas" onPageChange={setPagina} />
 * ```
 *
 * **Com `total` zero não renderiza nada.** Paginar o nada não significa
 * coisa alguma: a frase de contagem não conta, os botões Anterior e Próxima
 * nascem desabilitados e o botão de página "1" leva à mesma página vazia. E
 * a tabela logo acima já disse que está vazia.
 *
 * Por isso o primitivo **pressupõe um estado vazio na listagem que ele
 * pagina** — `TableEmpty` na tabela, ou equivalente. Quem usar `Pagination`
 * sem esse estado vazio perde, no zero, a única informação que havia na
 * tela. É a regra que as telas do sistema seguem.
 */
export function Pagination({ page, pageSize, total, onPageChange, itemLabel = "registros" }: PaginationProps) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const janela = calcularJanela(page, totalPages);

  const emPrimeira = page <= 1;
  const emUltima = page >= totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borda pt-3 text-sm text-conteudo-muted">
      <p>{`Mostrando ${from} a ${to} de ${total} ${itemLabel}`}</p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={emPrimeira}
          onClick={() => onPageChange(page - 1)}
          className={[
            "rounded-lg border border-borda bg-surface px-3 py-1.5 text-sm font-medium text-conteudo transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
            "disabled:cursor-not-allowed disabled:opacity-40",
          ].join(" ")}
        >
          Anterior
        </button>
        {janela.map((numero) => {
          const ativa = numero === page;
          return (
            <button
              key={numero}
              type="button"
              disabled={ativa}
              aria-current={ativa ? "page" : undefined}
              onClick={() => onPageChange(numero)}
              className={[
                "flex h-8 min-w-[2.25rem] items-center justify-center rounded-lg border px-2 text-sm font-medium transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                ativa
                  ? "border-action bg-action text-on-primary"
                  : "border-borda bg-surface text-conteudo hover:bg-surface-elevated",
              ].join(" ")}
            >
              {numero}
            </button>
          );
        })}
        <button
          type="button"
          disabled={emUltima}
          onClick={() => onPageChange(page + 1)}
          className={[
            "rounded-lg border border-borda bg-surface px-3 py-1.5 text-sm font-medium text-conteudo transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
            "disabled:cursor-not-allowed disabled:opacity-40",
          ].join(" ")}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
