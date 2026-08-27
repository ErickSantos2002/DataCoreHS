import type { ReactElement, ReactNode } from "react";
import { isValidElement } from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KeyRound } from "lucide-react";

import useNavGroups from "./Sidebar";
import { AuthContext } from "../context/AuthContext";

type Usuario = { id: number; username: string; role: string } | null;

function wrapperPara(user: Usuario) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider
        value={{ user, token: null, loading: false, login: vi.fn(), logout: vi.fn(), error: null }}
      >
        {children}
      </AuthContext.Provider>
    );
  };
}

describe("useNavGroups", () => {
  it("monta os quatro grupos do design, na ordem e com os rotulos renomeados, para o admin", () => {
    const { result } = renderHook(() => useNavGroups(), {
      wrapper: wrapperPara({ id: 1, username: "erick", role: "admin" }),
    });

    expect(result.current.map((g) => g.label)).toEqual([
      "Principal",
      "Comercial",
      "Financeiro",
      "Administração",
    ]);
    expect(result.current[0].items.map((i) => i.label)).toEqual(["Início", "Meta do trimestre"]);
    expect(result.current[1].items.map((i) => i.label)).toEqual([
      "Vendas",
      "Serviços",
      "Clientes",
      "Produtos",
      "Vendedores",
    ]);
    expect(result.current[2].items.map((i) => i.label)).toEqual([
      "Gerenciamento",
      "Contas a pagar",
      "Contas a receber",
      "Locação",
    ]);
    expect(result.current[3].items.map((i) => i.label)).toEqual([
      "Estoque",
      "Usuários",
      "Configurações",
    ]);
  });

  it("usa o KeyRound do lucide para Locação, que não existe no ICON_PATHS do design system", () => {
    const { result } = renderHook(() => useNavGroups(), {
      wrapper: wrapperPara({ id: 1, username: "erick", role: "admin" }),
    });
    const financeiro = result.current.find((g) => g.label === "Financeiro");
    const locacao = financeiro?.items.find((i) => i.label === "Locação");
    expect(isValidElement(locacao?.icon)).toBe(true);
    expect((locacao?.icon as ReactElement).type).toBe(KeyRound);
  });

  it("some com o grupo Financeiro inteiro quando o usuário não tem nenhuma permissão dele", () => {
    const { result } = renderHook(() => useNavGroups(), {
      wrapper: wrapperPara({ id: 99, username: "vendedor", role: "vendas" }),
    });
    expect(result.current.map((g) => g.label)).toEqual(["Principal", "Comercial", "Administração"]);
  });

  it("mostra só Contas a pagar/receber no grupo Financeiro pro papel financeiro sem o id legado", () => {
    const { result } = renderHook(() => useNavGroups(), {
      wrapper: wrapperPara({ id: 99, username: "financeiro", role: "financeiro" }),
    });
    const financeiro = result.current.find((g) => g.label === "Financeiro");
    expect(financeiro?.items.map((i) => i.label)).toEqual(["Contas a pagar", "Contas a receber"]);
  });

  it("esconde Usuários e Configurações do grupo Administração pra quem não é admin", () => {
    const { result } = renderHook(() => useNavGroups(), {
      wrapper: wrapperPara({ id: 99, username: "vendedor", role: "vendas" }),
    });
    const administracao = result.current.find((g) => g.label === "Administração");
    expect(administracao?.items.map((i) => i.label)).toEqual(["Estoque"]);
  });
});
