import { contagemDaPagina, janelaDePaginas, totalDePaginas } from "./contas";

export interface PaginacaoDeContasProps {
  /** 1-based. */
  pagina: number;
  /** Quantas contas o recorte inteiro tem. */
  total: number;
  onPagina: (pagina: number) => void;
}

/**
 * A paginação das duas telas de Contas: a contagem em frase e uma janela de
 * até cinco números.
 *
 * NÃO é o `Pagination` do design system, e a diferença é proposital nesta
 * fase. O primitivo escreve "Próxima" (aqui é "Próximo") e mostra a contagem
 * SEMPRE, inclusive com uma página só. As duas telas fazem o contrário: a
 * frase "Mostrando X a Y de N registros" mora dentro do bloco que só existe
 * com duas páginas ou mais, então quem tem 15 contas ou menos não lê contagem
 * nenhuma — é o defeito 1.7 do levantamento, e a Fase 1 não corrige defeito.
 *
 * Quando a Fase 2 corrigir o 1.7, este componente inteiro some e vira
 * `<Pagination itemLabel="registros" />`. É uma troca de uma linha; o que
 * falta é a autorização de mudar a asserção que trava o comportamento de
 * hoje.
 *
 * O que já mudou: o bloco duplicado de botões para telas estreitas saiu. Ele
 * repetia os mesmos controles com `<` e `>` como texto fazendo papel de
 * ícone; a barra única quebra em várias linhas sozinha.
 */
export function PaginacaoDeContas({ pagina, total, onPagina }: PaginacaoDeContasProps) {
  const paginas = totalDePaginas(total);
  if (paginas <= 1) return null;

  const naPrimeira = pagina === 1;
  const naUltima = pagina === paginas;

  const classeDoBotao = [
    "rounded-lg border border-borda bg-surface px-3 py-1.5 text-sm font-medium text-conteudo",
    "transition-colors hover:bg-surface-elevated",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
    "disabled:cursor-not-allowed disabled:opacity-40",
  ].join(" ");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borda p-4 text-sm text-conteudo-muted">
      <p>{contagemDaPagina(pagina, total)}</p>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPagina(Math.max(1, pagina - 1))}
          disabled={naPrimeira}
          className={classeDoBotao}
        >
          Anterior
        </button>

        {janelaDePaginas(pagina, paginas).map((numero) => {
          const ativa = numero === pagina;
          return (
            <button
              key={numero}
              type="button"
              aria-current={ativa ? "page" : undefined}
              onClick={() => onPagina(numero)}
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
          onClick={() => onPagina(Math.min(paginas, pagina + 1))}
          disabled={naUltima}
          className={classeDoBotao}
        >
          Próximo
        </button>
      </div>
    </div>
  );
}
