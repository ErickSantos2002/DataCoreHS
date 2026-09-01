import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext } from "./AuthContext";
import { ContasPagarProvider, useContasPagar } from "./ContasPagarContext";
import { ContasReceberProvider, useContasReceber } from "./ContasReceberContext";
import { ServicosProvider, useServicos } from "./ServicosContext";
import { VendasProvider, useVendas } from "./VendasContext";

/**
 * Os quatro contextos que alimentam o Financeiro contam quando a busca falha.
 *
 * Sem isso a tela abre inteira em "Sem dados" com a API caída, e quem olha
 * não distingue "a API caiu" de "a empresa não faturou" — foi o que a
 * conferência no navegador mostrou. É o mesmo defeito 1.10 que as gêmeas
 * fecharam para as contas; aqui ele se fecha para vendas e serviços, e o que
 * já funcionava fica travado por teste.
 */

const fetchVendas = vi.hoisted(() => vi.fn());
const fetchNotasServico = vi.hoisted(() => vi.fn());
const fetchContasPagar = vi.hoisted(() => vi.fn());
const fetchContasReceber = vi.hoisted(() => vi.fn());
vi.mock("../services/notasapi", () => ({
  fetchVendas,
  fetchNotasServico,
  fetchContasPagar,
  fetchContasReceber,
}));

/** O `ServicosProvider` lê o usuário da sessão; os outros três não. */
function ComSessao({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: { id: 1, username: "erick", role: "admin" },
        token: "t",
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        error: null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function EspiaoDeVendas() {
  const { erro, carregando } = useVendas();
  return <p>{carregando ? "carregando" : (erro ?? "sem erro")}</p>;
}

function EspiaoDeServicos() {
  const { erro, carregando } = useServicos();
  return <p>{carregando ? "carregando" : (erro ?? "sem erro")}</p>;
}

function EspiaoDePagar() {
  const { erro, carregando } = useContasPagar();
  return <p>{carregando ? "carregando" : (erro ?? "sem erro")}</p>;
}

function EspiaoDeReceber() {
  const { erro, carregando } = useContasReceber();
  return <p>{carregando ? "carregando" : (erro ?? "sem erro")}</p>;
}

/** Os quatro, com a frase que cada um deve dizer quando a busca falha. */
const CONTEXTOS = [
  {
    nome: "vendas",
    busca: fetchVendas,
    frase: "Não foi possível carregar as notas de venda.",
    montar: () => (
      <ComSessao>
        <VendasProvider>
          <EspiaoDeVendas />
        </VendasProvider>
      </ComSessao>
    ),
  },
  {
    nome: "serviços",
    busca: fetchNotasServico,
    frase: "Não foi possível carregar as notas de serviço.",
    montar: () => (
      <ComSessao>
        <ServicosProvider>
          <EspiaoDeServicos />
        </ServicosProvider>
      </ComSessao>
    ),
  },
  {
    nome: "contas a pagar",
    busca: fetchContasPagar,
    frase: "Não foi possível carregar as contas a pagar.",
    montar: () => (
      <ComSessao>
        <ContasPagarProvider>
          <EspiaoDePagar />
        </ContasPagarProvider>
      </ComSessao>
    ),
  },
  {
    nome: "contas a receber",
    busca: fetchContasReceber,
    frase: "Não foi possível carregar as contas a receber.",
    montar: () => (
      <ComSessao>
        <ContasReceberProvider>
          <EspiaoDeReceber />
        </ContasReceberProvider>
      </ComSessao>
    ),
  },
];

let console_error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Os quatro registram a falha no console de propósito; o teste silencia o
  // ruído sem esconder o comportamento.
  console_error = vi.spyOn(console, "error").mockImplementation(() => {});
  for (const { busca } of CONTEXTOS) busca.mockReset();
});

afterEach(() => {
  console_error.mockRestore();
});

describe("os quatro contextos do Financeiro contam a falha de carga", () => {
  it.each(CONTEXTOS)("$nome diz o que não carregou", async ({ busca, frase, montar }) => {
    for (const outro of CONTEXTOS) outro.busca.mockResolvedValue([]);
    busca.mockRejectedValue(new Error("500 da API"));

    render(montar());

    expect(await screen.findByText(frase)).toBeInTheDocument();
  });

  it.each(CONTEXTOS)("$nome não inventa erro quando dá certo", async ({ montar }) => {
    for (const outro of CONTEXTOS) outro.busca.mockResolvedValue([]);

    render(montar());

    expect(await screen.findByText("sem erro")).toBeInTheDocument();
  });
});
