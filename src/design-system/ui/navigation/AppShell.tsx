import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Avatar } from "../core/Avatar";
import { Tooltip } from "../feedback/Tooltip";

export interface NavItem {
  label: string;
  path: string;
  // Divergência registrada do .d.ts de referência: lá `icon` é `IconName`,
  // o conjunto fechado de 25 traçados do `Icon` (Task 1). Esse conjunto não
  // cobre Home, LayoutDashboard, ShoppingCart, Package, Wrench, UserCheck,
  // Wallet, UserCog nem Settings — os ícones que a Task 12 exige para trocar
  // os 19 <img src="icons8..."> por componente. O design system já resolve
  // esse caso: "falta um ícone? pegue o equivalente em Lucide" (doc do
  // `Icon`, Task 1) — então o item de navegação recebe o componente Lucide
  // diretamente, não um nome de `ICON_PATHS`.
  icon: LucideIcon;
}

export interface NavGroup {
  /** "Principal", "Gestão", "Administração". */
  label: string;
  items: NavItem[];
}

export interface AppShellProps {
  /** Nome do sistema: HelpHS, ChamadosHS, DataCoreHS… */
  product?: string;
  logoSrc?: string;
  groups?: NavGroup[];
  activePath?: string;
  onNavigate?: (path: string) => void;
  user?: { name: string; role: string };
  version?: string;
  /** Sidebar recolhida para 72px, só ícones. */
  collapsed?: boolean;
  topbarActions?: ReactNode;
  pageTitle?: ReactNode;
  children?: ReactNode;
}

interface NavLinkProps {
  item: NavItem;
  collapsed: boolean;
  ativo: boolean;
  onNavigate?: (path: string) => void;
}

/**
 * Um item de navegação — âncora de verdade, não `<button onClick>`. O
 * original do design system usa botão porque o canvas do Claude Design não
 * tem roteador; aqui há um app de verdade por trás, então o item precisa
 * abrir em nova aba (Ctrl/Cmd/clique do meio), aparecer na barra de status
 * e ser anunciado como link. `preventDefault` só roda na navegação simples
 * — o resto o navegador cuida sozinho.
 */
function NavLink({ item, collapsed, ativo, onNavigate }: NavLinkProps) {
  const Icone = item.icon;

  const link = (
    <a
      href={item.path}
      aria-current={ativo ? "page" : undefined}
      onClick={(evento) => {
        if (evento.defaultPrevented || evento.button !== 0) return;
        if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
        evento.preventDefault();
        onNavigate?.(item.path);
      }}
      className={[
        "flex items-center gap-2 rounded-lg border-l-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
        ativo
          ? "border-action bg-action-tint text-action"
          : "border-transparent text-conteudo-muted hover:bg-surface-elevated",
      ].join(" ")}
    >
      <Icone size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </a>
  );

  // Recolhida, o rótulo do item some do fluxo — o Tooltip é quem carrega o
  // nome dali em diante. `title` nativo demora a aparecer e alguns leitores
  // de tela o ignoram; o Tooltip da Task 7 existe exatamente para isso.
  if (collapsed) {
    return (
      <Tooltip label={item.label} position="right">
        {link}
      </Tooltip>
    );
  }

  return link;
}

/**
 * Casca do aplicativo — sidebar agrupada, topbar de 64px e área de
 * conteúdo. Substitui `Header`/`Sidebar` como o único lugar que desenha a
 * navegação: quem consome só passa dado (`groups`, `user`) e recebe
 * `onNavigate` de volta.
 *
 * ```tsx
 * <AppShell
 *   product="DataCoreHS"
 *   logoSrc={logo}
 *   groups={grupos}
 *   activePath={location.pathname}
 *   onNavigate={navigate}
 *   user={{ name: user.username, role: user.role }}
 *   collapsed={collapsed}
 *   topbarActions={<AcoesDoTopo />}
 * >
 *   <AppRoutes />
 * </AppShell>
 * ```
 */
export function AppShell({
  product,
  logoSrc,
  groups = [],
  activePath,
  onNavigate,
  user,
  version,
  collapsed = false,
  topbarActions,
  pageTitle,
  children,
}: AppShellProps) {
  const inicialProduto = (product ?? "").trim().slice(0, 1).toUpperCase();

  return (
    <div className="flex h-full overflow-hidden bg-surface-base font-sans">
      <aside
        className={[
          "flex shrink-0 flex-col overflow-hidden border-r border-borda bg-surface transition-[width] duration-300 ease-in-out",
          collapsed ? "w-sidebar-collapsed" : "w-sidebar",
        ].join(" ")}
      >
        <div
          className={[
            "flex h-topbar shrink-0 items-center",
            collapsed ? "justify-center" : "gap-2 px-5",
          ].join(" ")}
        >
          {logoSrc ? (
            <img src={logoSrc} alt={product ?? "Logo"} className="h-7 object-contain" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-action-tint text-sm font-bold text-action">
              {inicialProduto}
            </span>
          )}
          {!collapsed && !logoSrc && product && (
            <span className="truncate text-base font-bold text-conteudo-heading">{product}</span>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-3">
          {groups.map((grupo) => (
            <div key={grupo.label}>
              {collapsed ? (
                <div className="mx-auto mb-1 w-6 border-t border-borda" />
              ) : (
                <p className="mb-1 truncate px-3 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-conteudo-faint">
                  {grupo.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {grupo.items.map((item) => (
                  <NavLink
                    key={item.path}
                    item={item}
                    collapsed={collapsed}
                    ativo={item.path === activePath}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {!collapsed && (
          <div className="shrink-0 border-t border-borda px-5 py-4 text-center">
            <p className="text-xs font-medium text-conteudo-muted">
              {product} {version}
            </p>
            <p className="text-[11px] text-conteudo-faint">© 2026 Health &amp; Safety Tech</p>
          </div>
        )}
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-topbar shrink-0 items-center justify-between gap-4 border-b border-borda bg-surface px-6">
          {pageTitle ? (
            <h1 className="truncate text-base font-semibold text-conteudo-heading">{pageTitle}</h1>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-4">
            {topbarActions}
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right leading-tight">
                  <p className="max-w-[160px] truncate text-sm font-medium text-conteudo">{user.name}</p>
                  <p className="text-xs text-conteudo-muted">{user.role}</p>
                </div>
                <Avatar name={user.name} size="sm" />
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
