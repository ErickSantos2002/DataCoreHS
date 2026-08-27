import React from "react";

/** O formato de um módulo de página: `export default` e nada mais. */
type ModuloPagina = { default: React.ComponentType };

/**
 * Todos os carregadores criados por `paginaLazy` neste processo. Existe por
 * causa de `precarregarPaginas` — ver o comentário lá embaixo.
 */
const carregadores: Array<() => Promise<unknown>> = [];

/**
 * Uma página que só é buscada pela rede quando a rota é aberta.
 *
 * Faz o mesmo que `React.lazy`, com uma diferença que importa para os testes:
 * depois que o módulo chega, o componente renderiza **de forma síncrona**, sem
 * passar de novo pelo `Suspense`. O `React.lazy` só resolve o próprio estado
 * dentro de um render, então a primeira renderização de cada página sempre
 * suspende — e um teste síncrono de rota (`render()` seguido de leitura do
 * DOM, sem `await`) enxerga o fallback em vez da página. Com o cache aqui
 * fora, `precarregarPaginas()` dá conta disso antes do teste rodar.
 *
 * A suspensão em si é o contrato normal: enquanto não há módulo, o componente
 * lança a promessa — a mesma, guardada, nunca uma nova a cada render.
 */
export function paginaLazy(carregar: () => Promise<ModuloPagina>): React.FC {
  let modulo: ModuloPagina | undefined;
  let promessa: Promise<unknown> | undefined;

  const garantirCarregada = () => {
    promessa ??= carregar().then((m) => {
      modulo = m;
    });
    return promessa;
  };

  carregadores.push(garantirCarregada);

  const Pagina: React.FC = () => {
    if (!modulo) throw garantirCarregada();

    const Real = modulo.default;
    return <Real />;
  };

  Pagina.displayName = "PaginaLazy";
  return Pagina;
}

/**
 * Busca de uma vez todas as páginas já declaradas com `paginaLazy`.
 *
 * Quem chama é `src/test/setup.ts`, num `beforeEach`: os testes de rota
 * renderizam e leem o DOM no mesmo tique, sem `await`, e o que eles querem
 * afirmar é quem chega até a página — não que o navegador saiba esperar um
 * chunk. Pré-carregar mantém esses testes falando do assunto deles.
 *
 * O custo fica onde deve: em arquivo de teste que não importa o `router.tsx`,
 * a lista está vazia e isto não faz nada.
 */
export async function precarregarPaginas(): Promise<void> {
  await Promise.all(carregadores.map((carregar) => carregar()));
}
