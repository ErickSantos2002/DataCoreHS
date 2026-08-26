import type { LucideIcon } from "lucide-react";
import {
  Home,
  LayoutDashboard,
  ShoppingCart,
  KeyRound,
  Tag,
  Wrench,
  Users,
  UserCheck,
  Package,
  Wallet,
  Receipt,
  TrendingUp,
  UserCog,
  Settings,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import type { NavGroup } from "../design-system/ui/navigation/AppShell";

interface ItemBruto {
  label: string;
  path: string;
  icon: LucideIcon;
  mostrar: boolean;
}

/**
 * Itens de navegação do DataCoreHS, por papel do usuário.
 *
 * Esta é a mesma regra de permissão que já existia — antes espalhada entre
 * este arquivo (que decidia o que aparecia no menu) e `router.tsx` (que
 * decidia o que era permitido acessar, com o mesmo `[1, 3, 4].includes(user.id)`
 * duplicado). Ela só mudou de forma: de JSX com `<img>` colorido por
 * querystring para dado (`NavGroup[]`) que o `AppShell` consome. Unificar as
 * duas cópias da regra é trabalho da Fase 2, não desta task.
 *
 * A cor do ícone também não precisa mais de cálculo: os ícones do lucide
 * herdam `currentColor`, e é o próprio `AppShell` quem decide a cor do item
 * (`text-action` ativo, `text-conteudo-muted` inativo) — o que a Sidebar
 * antiga fazia na mão com `getColor(isActive)`.
 */
export default function useNavGroups(): NavGroup[] {
  const { user } = useAuth();
  const idsFinanceiroLegado = [1, 3, 4].includes(user?.id ?? -1);
  const podeContas = user?.role === "admin" || user?.role === "financeiro";
  const ehAdmin = user?.role === "admin";

  const itens: ItemBruto[] = [
    { label: "Início", path: "/inicio", icon: Home, mostrar: true },
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, mostrar: true },
    { label: "Vendas", path: "/vendas", icon: ShoppingCart, mostrar: true },
    { label: "Locação", path: "/locacao", icon: KeyRound, mostrar: idsFinanceiroLegado },
    { label: "Produtos", path: "/produtos", icon: Tag, mostrar: true },
    { label: "Serviços", path: "/servicos", icon: Wrench, mostrar: true },
    { label: "Clientes", path: "/clientes", icon: Users, mostrar: true },
    { label: "Vendedores", path: "/vendedores", icon: UserCheck, mostrar: true },
    { label: "Estoque", path: "/estoque", icon: Package, mostrar: true },
    { label: "Financeiro", path: "/financeiro", icon: Wallet, mostrar: idsFinanceiroLegado },
    { label: "Contas a Pagar", path: "/contas-pagar", icon: Receipt, mostrar: podeContas },
    { label: "Contas a Receber", path: "/contas-receber", icon: TrendingUp, mostrar: podeContas },
    { label: "Usuários", path: "/usuarios", icon: UserCog, mostrar: ehAdmin },
    { label: "Configurações", path: "/configuracoes", icon: Settings, mostrar: ehAdmin },
  ];

  return [
    {
      label: "Principal",
      items: itens.filter((item) => item.mostrar).map(({ label, path, icon }) => ({ label, path, icon })),
    },
  ];
}
