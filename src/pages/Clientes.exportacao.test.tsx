import { fireEvent, render, screen } from "@testing-library/react";
import autoTable from "jspdf-autotable";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Clientes from "./Clientes";
import {
  ESTADO_CLIENTES,
  HOJE_CLIENTES,
  reiniciarEstadoDeClientes,
} from "./clientes/clientesFalsos";
import { baixarPlanilha } from "../lib/planilha";

/**
 * Caracterização das duas exportações de Clientes, a planilha e o PDF.
 *
 * As duas saem da TABELA como ela está — pesquisada e na ordem —, e não do
 * resumo cru. O que se observa são os argumentos de `baixarPlanilha` e do
 * `autoTable`, que é onde cabeçalho e linhas se encontram; `jsPDF` é dublê
 * que anota os textos e o nome do arquivo.
 */

const { PDF } = vi.hoisted(() => ({
  PDF: { textos: [] as string[], arquivo: "" },
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, username: "erick", role: "admin" } }),
}));

vi.mock("./comercial/useComercial", async (original) => {
  const real = await original<typeof import("./comercial/useComercial")>();
  const { hooksDeClientes } = await import("./clientes/clientesFalsos");
  return { ...real, ...hooksDeClientes() };
});

vi.mock("../lib/planilha", () => ({ baixarPlanilha: vi.fn() }));

vi.mock("jspdf", () => ({
  default: class {
    setFontSize() {}
    text(texto: string) {
      PDF.textos.push(texto);
    }
    save(nome: string) {
      PDF.arquivo = nome;
    }
  },
}));

vi.mock("jspdf-autotable", () => ({ default: vi.fn() }));

vi.mock("recharts", () => {
  const semDesenho = () => null;
  const caixa = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  );
  return {
    ResponsiveContainer: caixa,
    BarChart: caixa,
    LineChart: caixa,
    PieChart: caixa,
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
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(HOJE_CLIENTES);
  reiniciarEstadoDeClientes();
  vi.mocked(baixarPlanilha).mockClear();
  vi.mocked(autoTable).mockClear();
  PDF.textos.length = 0;
  PDF.arquivo = "";
});

afterEach(() => {
  vi.useRealTimers();
});

function exportar(rotulo: "Excel" | "PDF") {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(rotulo) }));
}

function planilha() {
  const chamada = vi.mocked(baixarPlanilha).mock.calls[0];
  if (!chamada) throw new Error("baixarPlanilha nao foi chamado");
  const [abas, arquivo] = chamada;
  return { abas, arquivo };
}

function tabelaDoPdf() {
  const chamada = vi.mocked(autoTable).mock.calls[0];
  if (!chamada) throw new Error("autoTable nao foi chamado");
  const opcoes = chamada[1] as { head: string[][]; body: string[][] };
  return { head: opcoes.head, body: opcoes.body };
}

describe("planilha de Clientes", () => {
  it("uma aba 'Clientes', com o nome do arquivo no dia local", () => {
    render(<Clientes />);
    exportar("Excel");

    const { abas, arquivo } = planilha();
    expect(abas.map((a) => a.nome)).toEqual(["Clientes"]);
    expect(arquivo).toBe("clientes_2026-09-15.xlsx");
  });

  it("uma linha por cliente, na ordem da tabela, com as nove colunas", () => {
    render(<Clientes />);
    exportar("Excel");

    const linhas = planilha().abas[0].linhas;
    expect(linhas).toHaveLength(12);
    expect(linhas[0]).toEqual({
      Nome: "Alfa Mineração Recife Ltda",
      "CPF/CNPJ": "11.222.333/0001-44",
      Email: "compras@alfa.com",
      Telefone: "81999990000",
      "Última Compra": "10/09/2026",
      "Total Comprado": 50000.5,
      "Número de Compras": 4,
      "Ticket Médio": 12500.125,
      Status: "Ativo",
    });
    // A última da ordem padrão: sem compra, sem contato.
    expect(linhas[11]).toEqual({
      Nome: "Delta Engenharia",
      "CPF/CNPJ": "44.333.222/0001-11",
      Email: "",
      Telefone: "",
      "Última Compra": "Nunca",
      "Total Comprado": 9000,
      "Número de Compras": 1,
      "Ticket Médio": 9000,
      Status: "Inativo",
    });
  });

  it("sai pesquisada e na ordem escolhida", () => {
    render(<Clientes />);
    fireEvent.change(screen.getByPlaceholderText("Pesquisar..."), {
      target: { value: "cliente" },
    });
    fireEvent.click(screen.getByText("Valor Total"));
    exportar("Excel");

    const nomes = planilha().abas[0].linhas.map((l) => l.Nome);
    expect(nomes).toEqual([
      "Cliente 06",
      "Cliente 07",
      "Cliente 08",
      "Cliente 09",
      "Cliente 10",
      "Cliente 11",
      "Cliente 12",
    ]);
  });
});

describe("PDF de Clientes", () => {
  it("titulo, data, usuario e o nome do arquivo no dia local", () => {
    render(<Clientes />);
    exportar("PDF");

    expect(PDF.textos).toEqual([
      "Relatório de Clientes",
      "Data: 15/09/2026",
      "Usuário: erick",
    ]);
    expect(PDF.arquivo).toBe("clientes_2026-09-15.pdf");
  });

  it("cinco colunas, e o nome cortado em 25 caracteres", () => {
    render(<Clientes />);
    exportar("PDF");

    const { head, body } = tabelaDoPdf();
    expect(head).toEqual([
      ["Nome", "CPF/CNPJ", "Última Compra", "Total", "Status"],
    ]);
    expect(body[0]).toEqual([
      "Alfa Mineração Recife Ltd",
      "11.222.333/0001-44",
      "10/09/2026",
      "R$ 50000.50",
      "Ativo",
    ]);
    expect(body[11]).toEqual([
      "Delta Engenharia",
      "44.333.222/0001-11",
      "Nunca",
      "R$ 9000.00",
      "Inativo",
    ]);
  });

  it("sai pesquisado", () => {
    render(<Clientes />);
    fireEvent.change(screen.getByPlaceholderText("Pesquisar..."), {
      target: { value: "beta" },
    });
    exportar("PDF");

    expect(tabelaDoPdf().body.map((l) => l[0])).toEqual(["Beta Logística"]);
  });

  it("sem cliente, as duas exportacoes ainda saem", () => {
    ESTADO_CLIENTES.vazio = true;
    render(<Clientes />);

    exportar("Excel");
    exportar("PDF");

    expect(planilha().abas[0].linhas).toEqual([]);
    expect(tabelaDoPdf().body).toEqual([]);
  });
});
