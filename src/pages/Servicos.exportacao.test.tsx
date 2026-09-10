import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Servicos from "./Servicos";

/**
 * O retorno das duas exportações de Serviços.
 *
 * Exportar não usa a página que está na tela: `todosOsServicos`
 * (`servicos/useServicos.ts`) busca o recorte INTEIRO do servidor, de mil em
 * mil, e num recorte grande isso demora. O que este arquivo prende é o que a
 * tela faz durante essa espera — os dois botões desabilitam, o que roda diz
 * que está exportando, e um segundo clique não dispara a busca de novo.
 *
 * Para haver "durante", a busca do falso fica **pendente** até o teste
 * liberá-la: `BUSCA.liberar` resolve a promessa, e só então o `finally` de
 * `exportarExcel`/`exportarPDF` devolve os botões.
 */
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, username: "erick", role: "admin" } }),
}));

/** Dublê de `baixarPlanilha` — nenhum `.xlsx` de verdade é gerado aqui. */
vi.mock("../lib/planilha", () => ({
  baixarPlanilha: vi.fn(),
}));

/** Dublê do jsPDF: a montagem do documento não é o assunto deste arquivo, e
 *  o `doc.save` de verdade tentaria baixar arquivo no jsdom. */
vi.mock("jspdf", () => ({
  default: class {
    setFontSize() {}
    text() {}
    save() {}
  },
}));

vi.mock("jspdf-autotable", () => ({ default: vi.fn() }));

const { SERVICOS, BUSCA } = vi.hoisted(() => ({
  SERVICOS: [
    {
      id: 1,
      numero_nfse: 3001,
      data_emissao: "2026-01-10",
      valor_servico: 1000,
      razao_social_tomador: "Alfa Mineração",
      cpf_cnpj_tomador: "11.222.333/0001-44",
      cidade_tomador: "Recife",
      uf_tomador: "PE",
      discriminacao_servico: "Calibração de bafômetro",
    },
  ],
  /** Quantas vezes a tela pediu o recorte inteiro, e como liberar a espera. */
  BUSCA: { chamadas: 0, liberar: null as null | (() => void) },
}));

vi.mock("./servicos/useServicos", async (original) => {
  const real = await original<typeof import("./servicos/useServicos")>();
  const { criarHooksFalsosDeServicos } = await import("./servicos/hooksFalsos");
  const falsos = criarHooksFalsosDeServicos(SERVICOS);
  return {
    ...real,
    ...falsos,
    // O `todosOsServicos` do falso resolve na hora; este fica pendente de
    // propósito — é essa espera que o `exportando` cobre.
    todosOsServicos: () => {
      BUSCA.chamadas += 1;
      return new Promise((resolve) => {
        BUSCA.liberar = () => resolve(SERVICOS);
      });
    },
  };
});

/** Dublê do recharts — nenhum teste aqui olha para gráfico. */
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

beforeEach(() => {
  BUSCA.chamadas = 0;
  BUSCA.liberar = null;
});

/** Libera a busca pendente e deixa o `finally` das exportações rodar. */
async function terminarABusca(): Promise<void> {
  const liberar = BUSCA.liberar;
  if (!liberar) throw new Error("a tela nao pediu o recorte inteiro");
  await act(async () => {
    liberar();
  });
}

const botao = (nome: RegExp | string) => screen.getByRole("button", { name: nome });

/**
 * O botão que está exportando agora.
 *
 * O nome acessível é "Carregando... Exportando...", e não só o rótulo: o
 * `loading` do `Button` põe um `Spinner` dentro, e o `Spinner` tem
 * `aria-label="Carregando..."`. Mesmo desenho do botão de entrar
 * (`Login.tsx`), que é o molde da casa para ação em curso. Daí a busca por
 * pedaço do nome.
 */
const botaoExportando = () => botao(/Exportando\.\.\./);

describe("exportacao de Serviços", () => {
  it("enquanto o Excel exporta, o botao dele avisa e os dois ficam desabilitados", async () => {
    render(<Servicos />);

    expect(botao(/^excel$/i)).toBeEnabled();
    expect(botao(/^pdf$/i)).toBeEnabled();

    fireEvent.click(botao(/^excel$/i));

    // O rótulo troca só no botão que roda: com um `boolean` no lugar da união
    // `ExportacaoEmCurso`, o botão do PDF também diria "Exportando...".
    expect(botaoExportando()).toBeDisabled();
    expect(screen.queryByRole("button", { name: /^excel$/i })).toBeNull();
    expect(botao(/^pdf$/i)).toBeDisabled();

    await terminarABusca();

    expect(botao(/^excel$/i)).toBeEnabled();
    expect(botao(/^pdf$/i)).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Exportando\.\.\./ })).toBeNull();
  });

  it("enquanto o PDF exporta, o botao dele avisa e os dois ficam desabilitados", async () => {
    render(<Servicos />);

    fireEvent.click(botao(/^pdf$/i));

    expect(botaoExportando()).toBeDisabled();
    expect(screen.queryByRole("button", { name: /^pdf$/i })).toBeNull();
    expect(botao(/^excel$/i)).toBeDisabled();

    await terminarABusca();

    expect(botao(/^excel$/i)).toBeEnabled();
    expect(botao(/^pdf$/i)).toBeEnabled();
  });

  it("clicar de novo durante a exportacao nao dispara a busca outra vez", async () => {
    // O motivo do conserto: sem retorno na tela a pessoa clicava de novo, e
    // cada clique refazia a busca do recorte INTEIRO, página a página.
    render(<Servicos />);

    fireEvent.click(botao(/^excel$/i));
    expect(BUSCA.chamadas).toBe(1);

    // O clique num botão desabilitado não chega ao `onClick`; o segundo
    // clique é no PDF porque o do Excel já não existe com esse nome.
    fireEvent.click(botaoExportando());
    fireEvent.click(botao(/^pdf$/i));

    expect(BUSCA.chamadas).toBe(1);

    await terminarABusca();

    // Terminada a exportação, os botões voltam a valer.
    fireEvent.click(botao(/^excel$/i));
    expect(BUSCA.chamadas).toBe(2);

    await terminarABusca();
  });
});
