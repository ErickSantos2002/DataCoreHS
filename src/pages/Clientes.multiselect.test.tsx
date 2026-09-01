import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Clientes from "./Clientes";

/**
 * Caracterização do MultiSelect COMO ELE VIVE em Clientes.
 *
 * Mesmo molde de `Estoque.multiselect.test.tsx` (Task 4): dublê de `useData`
 * em vez do provider de verdade, porque o alvo é o MultiSelect, não a
 * integração com o backend. A tela tem três filtros ("Todos os clientes",
 * "Todos os produtos", "Todos os vendedores") e dois campos com o
 * placeholder "Pesquisar..." — o do dropdown de cliente e o da tabela —,
 * então o teste escopa a busca pelo container do filtro
 * (`containerDoFiltro`/`campoDeBusca`) em vez de pegar "o primeiro da
 * página": isso funciona hoje só por acidente de layout, e se a extração
 * para primitivo montar o painel num portal o teste passaria a ler o campo
 * errado seguindo verde. Este arquivo caracteriza só o filtro "Todos os
 * clientes" (`clientesUnicos`) — é o que distingue Clientes das telas
 * anteriores.
 *
 * `clientesUnicos` (~linha 133) é `{ value, label }[]` como em Estoque, mas
 * o `value` aqui já sai PRÉ-normalizado: `c.cpf_cnpj.replace(/\D/g, "")` —
 * só dígitos, sem pontuação. O `label` é `"${nome} (${cpf_cnpj})"`, com a
 * pontuação do CNPJ preservada.
 */
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, username: "erick", role: "admin" } }),
}));

const CLIENTES_ENRIQUECIDOS = [
  {
    id: 1,
    nome: "Alfa Mineração",
    cpf_cnpj: "11.222.333/0001-44",
    email: "contato@alfa.com",
    fone: "81999990000",
    totalComprado: 1000,
    numeroCompras: 1,
    ultimaCompra: new Date("2026-01-10"),
    status: "ativo" as const,
    ticketMedio: 1000,
  },
  {
    id: 2,
    nome: "Beta Logística",
    cpf_cnpj: "55.666.777/0001-88",
    email: "contato@beta.com",
    fone: "81888880000",
    totalComprado: 500,
    numeroCompras: 1,
    ultimaCompra: new Date("2026-02-10"),
    status: "ativo" as const,
    ticketMedio: 500,
  },
];

// Uma nota por cliente, para que os dois apareçam na tabela (só entra na
// tabela quem tem `numeroComprasPeriodo > 0`, ~linha 257) — é o que dá à
// asserção forte do `value` algo visível para diferenciar.
const NOTAS = [
  {
    id: 1,
    numero: 1001,
    data_emissao: "2026-01-10",
    valor_nota: 1000,
    valor_produtos: 1000,
    cliente: { id: 1, nome: "Alfa Mineração", cpf_cnpj: "11.222.333/0001-44" },
    nome_vendedor: "Vendedor A",
    tipo: null,
    itens: [
      { codigo: "P1", descricao: "Bafômetro Phoebus", quantidade: "2", valor_total: "1000" },
    ],
    observacoes: null,
  },
  {
    id: 2,
    numero: 1002,
    data_emissao: "2026-02-10",
    valor_nota: 500,
    valor_produtos: 500,
    cliente: { id: 2, nome: "Beta Logística", cpf_cnpj: "55.666.777/0001-88" },
    nome_vendedor: "Vendedor B",
    tipo: null,
    itens: [
      { codigo: "P2", descricao: "Tubo descartável", quantidade: "10", valor_total: "500" },
    ],
    observacoes: null,
  },
];

vi.mock("../context/DataContext", () => ({
  useData: () => ({
    clientes: CLIENTES_ENRIQUECIDOS.map(({ id, nome, cpf_cnpj, email, fone }) => ({
      id,
      nome,
      cpf_cnpj,
      email,
      fone,
    })),
    clientesEnriquecidos: CLIENTES_ENRIQUECIDOS,
    notas: NOTAS,
    carregando: false,
  }),
}));

/**
 * Dublê do recharts.
 *
 * Em jsdom o `ResponsiveContainer` mede 0x0 e o recharts de verdade não
 * desenha nada — os gráficos de Clientes ficariam invisíveis ao teste sem
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
 * Escopado pelo container do filtro, e não pela ordem na página: Clientes
 * tem dois campos com o placeholder "Pesquisar..." — este e o da tabela de
 * clientes —, e pegar "o primeiro" depende de a seção de filtros vir antes
 * da tabela no JSX. Se a extração para primitivo montar o painel num portal,
 * "o primeiro" passa a ser o campo da tabela e o teste seguiria verde
 * testando a coisa errada.
 */
function campoDeBusca(nomeDoBotao: string): HTMLElement {
  return within(containerDoFiltro(nomeDoBotao)).getByPlaceholderText("Pesquisar...");
}

describe("MultiSelect em Clientes", () => {
  it("o botão fechado mostra o placeholder e, depois, quantos foram escolhidos", () => {
    render(<Clientes />);

    abrir("Todos os clientes");
    fireEvent.click(screen.getByRole("checkbox", { name: /Alfa Mineração/ }));

    expect(
      screen.getByRole("button", { name: "1 selecionado(s)" }),
    ).toBeInTheDocument();
  });

  it("a busca filtra a lista por texto", () => {
    render(<Clientes />);
    abrir("Todos os clientes");

    fireEvent.change(campoDeBusca("Todos os clientes"), {
      target: { value: "beta" },
    });

    expect(screen.getByRole("checkbox", { name: /Beta Logística/ })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Alfa/ })).not.toBeInTheDocument();
  });

  it("sem resultado, diz que não achou", () => {
    render(<Clientes />);
    abrir("Todos os clientes");

    fireEvent.change(campoDeBusca("Todos os clientes"), {
      target: { value: "gama" },
    });

    expect(screen.getByText("Nenhum resultado encontrado")).toBeInTheDocument();
  });

  // ── COMPORTAMENTO QUE DISTINGUE CLIENTES DAS TELAS ANTERIORES ───────────
  // A busca (~linha 592) casa três coisas, nesta ordem de fallback:
  //   1. `label.includes(termo)`             — texto exibido, com pontuação;
  //   2. `value.includes(termo)`             — o value CRU;
  //   3. dígitos do value ⊇ dígitos do termo — só quando o termo tem dígito.
  //
  // A pegadinha de Clientes: `value` aqui já sai pré-normalizado (só
  // dígitos, sem pontuação — ao contrário de Estoque, onde o `value` era o
  // código formatado "1.163"). Isso muda o que cada termo realmente exercita:
  //
  // - "alfa" só bate na condição 1 (não existe em `value`, que é numérico).
  // - "23330001" é um recorte contíguo dos dígitos do CNPJ da Alfa
  //   ("11.222.333/0001-44" → "11222333000144"), mas no LABEL esse mesmo
  //   trecho vem cortado por pontuação ("...222.333/0001..." — não é
  //   contíguo como texto). Ele só bate por já ser `value` cru (condição 2);
  //   como o termo digitado já é só dígito, a normalização (condição 3) é um
  //   no-op aqui e não prova nada sozinha — quem prova a condição 3 é o
  //   próximo caso.
  // - "11-222-333" usa hífen em vez do ponto do CNPJ real: não bate no label
  //   (pontuação diferente) nem no `value` cru (que não tem hífen nenhum).
  //   Só bate depois de tirar os não-dígitos dos dois lados — prova a
  //   condição 3 isoladamente. É o caso que a plantação do Passo 3 derruba.
  // - "beta" é o nome do OUTRO cliente do fixture, não um termo aleatório:
  //   prova que a busca por "Alfa Mineração" filtra de verdade — se a busca
  //   estivesse quebrada (ex.: ignorando o termo e devolvendo tudo), este
  //   caso pegaria o erro; um termo inventado sem relação com o fixture não
  //   pegaria.
  it("acha pelo rótulo, pelo valor cru e pelo número do valor", () => {
    render(<Clientes />);

    for (const [termo, achado] of [
      ["alfa", true],
      ["23330001", true],
      ["11-222-333", true],
      ["beta", false],
    ] as const) {
      abrir("Todos os clientes");
      fireEvent.change(campoDeBusca("Todos os clientes"), {
        target: { value: termo },
      });
      const achou = screen.queryByRole("checkbox", { name: /Alfa Mineração/ });
      expect(Boolean(achou)).toBe(achado);
      fireEvent.mouseDown(document.body);
    }
  });

  // ── ASSERÇÃO FORTE DO VALUE (correção pós-brief) ─────────────────────────
  // Marcar o checkbox e olhar só o botão ("1 selecionado(s)") não prova que
  // `selected` guarda o `value` (CNPJ normalizado) e não o `label` (nome +
  // CNPJ formatado) — essa contagem é igual nos dois casos. Quem de fato
  // consome `selected` como CNPJ é o filtro da TABELA (`clientesFiltrados`,
  // ~linha 259: `filtroCliente.includes(c.cpf_cnpj.replace(/\D/g, ""))`):
  // é lá que a confusão aparece. Por isso a asserção observa a tabela, não o
  // botão — e o fixture tem DOIS clientes com nota no período (Alfa e Beta)
  // para a tabela ter algo visível para diferenciar.
  it("o checkbox mostra o rótulo, e o que filtra a tabela é o CNPJ", () => {
    render(<Clientes />);
    abrir("Todos os clientes");

    fireEvent.click(screen.getByRole("checkbox", { name: /Alfa Mineração/ }));

    const tabela = screen.getByRole("table");
    expect(within(tabela).getByText("Alfa Mineração")).toBeInTheDocument();
    expect(within(tabela).queryByText("Beta Logística")).not.toBeInTheDocument();
  });

  // `MultiSelect` é declarado DENTRO do corpo de `Clientes` (não é um
  // componente à parte) — cada clique que muda `filtroCliente` re-renderiza
  // `Clientes` e recria a função `MultiSelect`, então React vê um componente
  // novo e o remonta do zero. Isso reseta o estado local `isOpen` para
  // `false`, e por isso o dropdown aparece fechado depois de QUALQUER
  // seleção — é preciso reabri-lo (`abrir(...)`) antes do próximo clique
  // dentro do painel, sempre.
  it("marcar de novo desmarca, e 'Limpar seleção' zera tudo", () => {
    render(<Clientes />);

    abrir("Todos os clientes");
    fireEvent.click(screen.getByRole("checkbox", { name: /Alfa Mineração/ }));
    expect(
      screen.getByRole("button", { name: "1 selecionado(s)" }),
    ).toBeInTheDocument();

    // Reclicar no MESMO checkbox desmarca — volta ao placeholder.
    abrir("1 selecionado(s)");
    fireEvent.click(screen.getByRole("checkbox", { name: /Alfa Mineração/ }));
    expect(
      screen.getByRole("button", { name: "Todos os clientes" }),
    ).toBeInTheDocument();

    // Seleciona de novo para testar "Limpar seleção" isoladamente.
    abrir("Todos os clientes");
    fireEvent.click(screen.getByRole("checkbox", { name: /Alfa Mineração/ }));
    abrir("1 selecionado(s)");
    fireEvent.click(screen.getByRole("button", { name: "Limpar seleção" }));

    expect(
      screen.getByRole("button", { name: "Todos os clientes" }),
    ).toBeInTheDocument();
  });

  it("clicar fora fecha o dropdown", () => {
    render(<Clientes />);
    abrir("Todos os clientes");
    const container = containerDoFiltro("Todos os clientes");
    expect(within(container).getByPlaceholderText("Pesquisar...")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    // O container do filtro continua no DOM (o botão vive nele); o que some
    // ao fechar é só o painel do dropdown, filho dele.
    expect(within(container).queryByPlaceholderText("Pesquisar...")).not.toBeInTheDocument();
  });
});
