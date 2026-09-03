import { useEffect, useMemo, useState } from "react";

/**
 * Estado de paginação de uma listagem: a página atual, o corte da lista e o
 * total. Feito para casar com o `Pagination` do design system, que quer
 * `page`, `pageSize`, `total` e `onPageChange`.
 *
 * **Volta para a primeira página quando `itens` muda de referência.** É o
 * conserto de um defeito concreto que estava nas seis telas da Fase 4: quem
 * estava na página 7 de 84 produtos e filtrava para 20 continuava na 7 —
 * `slice(60, 70)` num array de 20 devolve nada, então a tabela ficava em
 * branco, e o rodapé escrevia "Mostrando 61 a 20 de 20 registros", com o
 * intervalo invertido. Pior: o botão Próxima comparava `7 === 2` e seguia
 * habilitado, levando à página 8.
 *
 * **O reset olha a identidade de `itens`, não o tamanho** — filtrar pode
 * devolver a mesma quantidade e ainda assim ser outra lista. Isso impõe um
 * contrato ao chamador: **`itens` precisa vir de um `useMemo`** cujas
 * dependências sejam os filtros. Uma lista remontada a cada render prenderia
 * a paginação na página 1, calada. Nas seis telas isso já era verdade antes
 * do hook existir — todas fazem
 * `useMemo(..., [<listaFiltrada>, pesquisaTabela, ordenacao])`.
 *
 * Resetar ao ordenar é intencional e não é efeito colateral: Contas já fazia
 * isso à mão desde `457e4176`, com nove `setPagina(1)` espalhados pelos
 * pontos de filtro e de ordenação. O hook generaliza a decisão em vez de
 * pedir que cada tela lembre dela.
 */
export function usePaginacao<T>(itens: T[], tamanhoDaPagina: number) {
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    // O reset ao trocar de lista e o contrato deste hook (ver docblock);
    // nao e estado derivado de render, e sim reacao a troca de identidade
    // de `itens`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPagina(1);
  }, [itens]);

  const itensDaPagina = useMemo(() => {
    const inicio = (pagina - 1) * tamanhoDaPagina;
    return itens.slice(inicio, inicio + tamanhoDaPagina);
  }, [itens, pagina, tamanhoDaPagina]);

  return { pagina, setPagina, itensDaPagina, total: itens.length };
}
