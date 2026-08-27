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
// icone aceita os dois formatos que a Sidebar do DataCoreHS precisa: um
// `IconName` do design system (string, resolvida via `Icon`) ou um nó React
// já pronto — é o caso do lucide-react, usado quando falta traçado no
// `ICON_PATHS` (ex.: Locação/KeyRound). Por isso os ícones abaixo já vêm
// como elemento (`<Home .../>`), não como referência de componente.
const grupos: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { label: "Início", path: "/inicio", icon: <Home aria-hidden="true" /> },
      { label: "Vendas", path: "/vendas", icon: <ShoppingCart aria-hidden="true" /> },
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

  it("resolve icon como IconName do design system quando o item manda uma string", () => {
    const gruposComIconName: NavGroup[] = [
      { label: "Principal", items: [{ label: "Início", path: "/inicio", icon: "dashboard" }] },
    ];
    render(
      <MemoryRouter>
        <AppShell groups={gruposComIconName} onNavigate={() => {}}>
          <p>conteúdo</p>
        </AppShell>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /Início/ });
    expect(link.querySelector("svg")).toBeInTheDocument();
  });

  it("desenha o rotulo de cada grupo quando ha mais de um", () => {
    const gruposMultiplos: NavGroup[] = [
      { label: "Principal", items: [{ label: "Início", path: "/inicio", icon: "dashboard" }] },
      { label: "Comercial", items: [{ label: "Vendas", path: "/vendas", icon: "ticket" }] },
      { label: "Financeiro", items: [{ label: "Gerenciamento", path: "/financeiro", icon: "chart" }] },
      { label: "Administração", items: [{ label: "Estoque", path: "/estoque", icon: "cpu" }] },
    ];
    render(
      <MemoryRouter>
        <AppShell groups={gruposMultiplos} onNavigate={() => {}}>
          <p>conteúdo</p>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.getByText("Principal")).toBeInTheDocument();
    expect(screen.getByText("Comercial")).toBeInTheDocument();
    expect(screen.getByText("Financeiro")).toBeInTheDocument();
    expect(screen.getByText("Administração")).toBeInTheDocument();
  });

  it("um grupo sem nenhum item visivel nao renderiza rotulo, expandida", () => {
    const gruposComVazio: NavGroup[] = [
      { label: "Principal", items: [{ label: "Início", path: "/inicio", icon: "dashboard" }] },
      { label: "Vazio", items: [] },
    ];
    render(
      <MemoryRouter>
        <AppShell groups={gruposComVazio} onNavigate={() => {}}>
          <p>conteúdo</p>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.queryByText("Vazio")).not.toBeInTheDocument();
    expect(screen.queryByTestId("grupo-Vazio")).not.toBeInTheDocument();
  });

  it("um grupo sem nenhum item visivel nao renderiza o separador, recolhida", () => {
    const gruposComVazio: NavGroup[] = [
      { label: "Principal", items: [{ label: "Início", path: "/inicio", icon: "dashboard" }] },
      { label: "Vazio", items: [] },
    ];
    render(
      <MemoryRouter>
        <AppShell groups={gruposComVazio} onNavigate={() => {}} collapsed>
          <p>conteúdo</p>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("grupo-Vazio")).not.toBeInTheDocument();
    expect(screen.getByTestId("grupo-Principal")).toBeInTheDocument();
  });
});
