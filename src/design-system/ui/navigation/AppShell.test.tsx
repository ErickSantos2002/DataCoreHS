import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Home, ShoppingCart } from "lucide-react";
import { AppShell } from "./AppShell";
import type { NavGroup } from "./AppShell";

// Divergencia registrada em relacao ao pseudocodigo do brief: o .d.ts real
// do AppShell nao tem `items` nem `onLogout` — os grupos vem em `groups`
// (NavGroup[]), o campo do item e `path` (nao `to`) e nao existe prop de
// logout: o botao de sair e conteudo livre, passado em `topbarActions`. O
// icone tambem nao e `IconName` (string): e o proprio componente Lucide,
// pelo motivo documentado no topo de AppShell.tsx.
const grupos: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { label: "Início", path: "/inicio", icon: Home },
      { label: "Vendas", path: "/vendas", icon: ShoppingCart },
    ],
  },
];

function montar() {
  return render(
    <MemoryRouter>
      <AppShell
        user={{ name: "erick", role: "admin" }}
        groups={grupos}
        activePath="/inicio"
        onNavigate={() => {}}
      >
        <p>conteúdo da página</p>
      </AppShell>
    </MemoryRouter>,
  );
}

describe("AppShell", () => {
  it("monta topbar, navegacao e conteudo", () => {
    montar();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByText("conteúdo da página")).toBeInTheDocument();
  });

  it("cada item de menu e um link de verdade", () => {
    montar();
    expect(screen.getByRole("link", { name: /Início/ })).toHaveAttribute(
      "href",
      "/inicio",
    );
  });

  it("marca o item ativo com aria-current", () => {
    montar();
    expect(screen.getByRole("link", { name: /Início/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Vendas/ })).not.toHaveAttribute("aria-current");
  });
});
