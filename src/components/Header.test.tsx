import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import Header from "./Header";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

vi.mock("../context/ThemeContext", () => ({
  useTheme: () => ({ darkMode: false, toggleDarkMode: vi.fn() }),
}));

/**
 * O botão de menu da topbar faz duas coisas diferentes conforme a largura.
 *
 * No desktop recolhe a sidebar para o trilho de 72px. No celular a sidebar fixa
 * não existe (`hidden sm:flex` no `AppShell`), e recolher algo invisível
 * deixaria a pessoa sem caminho nenhum para a navegação — o botão tem de abrir
 * a gaveta.
 */
const larguraOriginal = window.innerWidth;

function naLargura(largura: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: largura,
  });
}

afterEach(() => naLargura(larguraOriginal));

function montar() {
  const onToggleSidebar = vi.fn();
  const onOpenMobileMenu = vi.fn();
  render(
    <MemoryRouter>
      <Header
        collapsed={false}
        onToggleSidebar={onToggleSidebar}
        onOpenMobileMenu={onOpenMobileMenu}
      />
    </MemoryRouter>,
  );
  return { onToggleSidebar, onOpenMobileMenu };
}

describe("Header", () => {
  it("no desktop, o botao de menu recolhe a sidebar e nao abre gaveta", () => {
    naLargura(1280);
    const { onToggleSidebar, onOpenMobileMenu } = montar();

    fireEvent.click(screen.getByRole("button", { name: "Recolher menu" }));

    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
    expect(onOpenMobileMenu).not.toHaveBeenCalled();
  });

  it("no celular, o botao de menu abre a gaveta e nao mexe na sidebar fixa", () => {
    naLargura(390);
    const { onToggleSidebar, onOpenMobileMenu } = montar();

    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));

    expect(onOpenMobileMenu).toHaveBeenCalledTimes(1);
    expect(onToggleSidebar).not.toHaveBeenCalled();
  });

  it("Sair continua com nome acessivel quando o texto some no celular", () => {
    naLargura(390);
    montar();

    const sair = screen.getByRole("button", { name: "Sair" });
    expect(screen.getByText("Sair")).toHaveClass("hidden", "sm:inline");
    expect(sair).toContainElement(screen.getByText("Sair"));
  });
});
