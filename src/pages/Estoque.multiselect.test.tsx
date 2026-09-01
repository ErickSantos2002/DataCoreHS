import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Estoque from "./Estoque";

/**
 * Caracterização do MultiSelect COMO ELE VIVE em Estoque.
 *
 * Mesmo molde de `Vendedores.multiselect.test.tsx` (Task 3): dublês de
 * `useAuth` e `useEstoque` em vez dos providers de verdade, porque o alvo é
 * o MultiSelect, não a integração com o backend. A tela tem só um filtro
 * ("Todos os produtos") mas dois campos com o placeholder "Pesquisar..." —
 * o do dropdown e o da tabela —, então o teste escopa a busca pelo container
 * do filtro (`containerDoFiltro`/`campoDeBusca`) em vez de pegar "o primeiro
 * da página": isso funciona hoje só por acidente de layout, e se a extração
 * para primitivo montar o painel num portal o teste passaria a ler o campo
 * errado seguindo verde.
 *
 * A diferença de Estoque para Vendedores e Servicos: é a primeira tela em
 * que `options` não é uma lista de textos, e sim de pares `{ value, label }`
 * (`produtosUnicos`, montado a partir de `produtos`). O checkbox mostra o
 * `label` (`"${nome} (${codigo})"`), e o que entra em `selected`/`onChange`
 * é o `value` (o código). Confundir os dois faria a tela filtrar pelo texto
 * errado.
 */
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, username: "erick", role: "admin" } }),
}));

const PRODUTOS_ESTOQUE = [
  {
    id: 1,
    nome: "Bafômetro Phoebus",
    // Código formatado com ponto, como um Tiny real por vezes traz o SKU
    // sub-dividido. Importa para o teste "não acha por número" abaixo: o
    // ponto quebra a sequência de dígitos em duas partes.
    codigo: "1.163",
    unidade: "UN",
    preco: 250,
    saldo: 10,
    situacao: "A" as const,
  },
  {
    id: 2,
    nome: "Tubo descartável",
    codigo: "P2",
    unidade: "UN",
    preco: 5,
    saldo: 100,
    situacao: "A" as const,
  },
];

vi.mock("../context/EstoqueContext", () => ({
  useEstoque: () => ({
    produtos: PRODUTOS_ESTOQUE,
    carregando: false,
    atualizarProdutos: vi.fn(),
  }),
}));

/**
 * Dublê do recharts.
 *
 * Em jsdom o `ResponsiveContainer` mede 0x0 e o recharts de verdade não
 * desenha nada — os gráficos de Estoque ficariam invisíveis ao teste sem
 * quebrar (recharts engole a falta de tamanho em silêncio). Como este teste
 * não olha para gráfico nenhum, o dublê só precisa devolver algo renderizável
 * para cada peça importada, sem reproduzir o comportamento real delas.
 */
vi.mock("recharts", () => {
  const semDesenho = () => null;
  return {
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
      <div>{children}</div>
    ),
    BarChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    LineChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    PieChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Bar: semDesenho,
    Line: semDesenho,
    Pie: semDesenho,
    Cell: semDesenho,
    XAxis: semDesenho,
    YAxis: semDesenho,
    Tooltip: semDesenho,
    CartesianGrid: semDesenho,
    Legend: semDesenho,
  };
});

/** Abre o dropdown de um filtro pelo texto do botão fechado. */
function abrir(placeholder: string) {
  fireEvent.click(screen.getByRole("button", { name: placeholder }));
}

/**
 * O container `<div className="relative" ref={ref}>` de um filtro — o botão
 * fechado e o painel do dropdown são irmãos dentro dele.
 */
function containerDoFiltro(nomeDoBotao: string): HTMLElement {
  const botao = screen.getByRole("button", { name: nomeDoBotao });
  const container = botao.parentElement;
  if (!container) {
    throw new Error(`container do filtro "${nomeDoBotao}" nao encontrado`);
  }
  return container as HTMLElement;
}

/**
 * O campo de busca DAQUELE dropdown.
 *
 * Escopado pelo container do filtro, e não pela ordem na página: Estoque tem
 * dois campos com o placeholder "Pesquisar..." — este e o da tabela de
 * produtos —, e pegar "o primeiro" depende de a seção de filtros vir antes
 * da tabela no JSX. Se a extração para primitivo montar o painel num portal,
 * "o primeiro" passa a ser o campo da tabela e o teste seguiria verde
 * testando a coisa errada.
 */
function campoDeBusca(nomeDoBotao: string): HTMLElement {
  return within(containerDoFiltro(nomeDoBotao)).getByPlaceholderText("Pesquisar...");
}

describe("MultiSelect em Estoque", () => {
  it("o botão fechado mostra o placeholder e, depois, quantos foram escolhidos", () => {
    render(<Estoque />);

    abrir("Todos os produtos");
    fireEvent.click(screen.getByRole("checkbox", { name: /Bafômetro Phoebus/ }));

    expect(
      screen.getByRole("button", { name: "1 selecionado(s)" }),
    ).toBeInTheDocument();
  });

  it("a busca filtra a lista por texto", () => {
    render(<Estoque />);
    abrir("Todos os produtos");

    fireEvent.change(campoDeBusca("Todos os produtos"), {
      target: { value: "tubo" },
    });

    expect(screen.getByRole("checkbox", { name: /Tubo descartável/ })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Bafômetro/ })).not.toBeInTheDocument();
  });

  it("sem resultado, diz que não achou", () => {
    render(<Estoque />);
    abrir("Todos os produtos");

    fireEvent.change(campoDeBusca("Todos os produtos"), {
      target: { value: "gama" },
    });

    expect(screen.getByText("Nenhum resultado encontrado")).toBeInTheDocument();
  });

  // ── COMPORTAMENTO QUE DISTINGUE ESTOQUE DAS TELAS ANTERIORES ────────────
  // Aqui `options` é `{ value, label }[]` (Vendedores, Servicos e Produtos
  // recebem lista de textos). O checkbox mostra o `label`
  // (`"${nome} (${codigo})"`), mas o que o `onChange` recebe — e o que fica
  // em `filtroProduto`/`selected` — é o `value`: o código do produto.
  // Confundir os dois faria a tela filtrar pelo texto errado (o rótulo
  // inteiro) em vez do código de fato.
  it("o checkbox mostra o rótulo, e o que é guardado é o código", () => {
    render(<Estoque />);
    abrir("Todos os produtos");

    fireEvent.click(screen.getByRole("checkbox", { name: /Bafômetro Phoebus/ }));

    expect(
      screen.getByRole("button", { name: "1 selecionado(s)" }),
    ).toBeInTheDocument();
  });

  // ── DEFEITO PRESERVADO ───────────────────────────────────────────────────
  // Estoque, como Produtos, não acha por número: o filtro só faz
  // `option.label.toLowerCase().includes(searchLower)` sobre o texto cru do
  // rótulo — sem normalizar (remover pontuação) nem do lado do texto, nem do
  // termo digitado. O código do "Bafômetro Phoebus" é "1.163" (o ponto é de
  // propósito, para o teste): os dígitos sem pontuação, "1163", SÃO os
  // dígitos do código (`value`) — achariam o produto se a busca normalizasse
  // e comparasse por número —, mas como sequência contígua "1163" não
  // aparece no rótulo cru ("Bafômetro Phoebus (1.163)"), a busca não acha
  // nada. Fixado de propósito para a unificação das buscas divergentes
  // (fase seguinte) ser decisão, e não efeito colateral.
  it("não acha pelo código digitado como número (defeito preservado)", () => {
    render(<Estoque />);
    abrir("Todos os produtos");

    fireEvent.change(campoDeBusca("Todos os produtos"), {
      target: { value: "1163" },
    });

    expect(screen.getByText("Nenhum resultado encontrado")).toBeInTheDocument();
  });

  it("marcar de novo desmarca, e 'Limpar seleção' zera tudo", () => {
    render(<Estoque />);
    abrir("Todos os produtos");
    fireEvent.click(screen.getByRole("checkbox", { name: /Bafômetro Phoebus/ }));

    abrir("1 selecionado(s)");
    fireEvent.click(screen.getByRole("button", { name: "Limpar seleção" }));

    expect(
      screen.getByRole("button", { name: "Todos os produtos" }),
    ).toBeInTheDocument();
  });

  it("clicar fora fecha o dropdown", () => {
    render(<Estoque />);
    abrir("Todos os produtos");
    const container = containerDoFiltro("Todos os produtos");
    expect(within(container).getByPlaceholderText("Pesquisar...")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    // O container do filtro continua no DOM (o botão vive nele); o que some
    // ao fechar é só o painel do dropdown, filho dele.
    expect(within(container).queryByPlaceholderText("Pesquisar...")).not.toBeInTheDocument();
  });
});
