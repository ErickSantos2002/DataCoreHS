import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

import { precarregarPaginas } from "../paginas-lazy";

// vitest.config.ts não liga `test.globals`, então o afterEach automático do
// @testing-library/react (que só se registra se `afterEach` já for global)
// nunca dispara. Sem isto, um arquivo de teste com mais de um `render()` em
// `it`s diferentes acumula botão sobre botão no mesmo `document.body` e
// `getByRole` passa a achar mais de um elemento a partir do segundo teste.
afterEach(() => {
  cleanup();
});

// As páginas do `router.tsx` são carregadas sob demanda, uma por rota. Os
// testes de rota renderizam e leem o DOM no mesmo tique, sem `await`, então
// sem isto a primeira vez que cada página aparece o que se vê é o fallback do
// `Suspense`, e não a tela — o teste passaria a falar de carregamento em vez
// de falar de acesso. Em arquivo que não importa o `router.tsx` a lista de
// páginas está vazia e este hook não custa nada.
beforeEach(async () => {
  await precarregarPaginas();
});
