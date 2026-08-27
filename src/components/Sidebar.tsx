import { KeyRound } from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import type { NavGroup, NavItem } from "../design-system/ui/navigation/AppShell";

interface ItemBruto {
  label: string;
  path: string;
  icon: NavItem["icon"];
  mostrar: boolean;
}

/**
 * Itens de navegação do DataCoreHS, por papel do usuário e por seção.
 *
 * Esta é a mesma regra de permissão que já existia — antes espalhada entre
 * este arquivo (que decidia o que aparecia no menu) e `router.tsx` (que
 * decidia o que era permitido acessar, com o mesmo `[1, 3, 4].includes(user.id)`
 * duplicado). Ela só mudou de forma: primeiro de JSX com `<img>` colorido por
 * querystring para dado (`NavGroup[]`) que o `AppShell` consome (Task 12);
 * agora de um único grupo "Principal" com os 14 itens para os quatro grupos
 * do design (Principal/Comercial/Financeiro/Administração). Os três
 * predicados de permissão (`idsFinanceiroLegado`, `podeContas`, `ehAdmin`) e
 * os itens que cada um esconde não mudaram — só a posição deles na lista.
 * Unificar essa regra com a de `router.tsx` é trabalho da Fase 2.
 *
 * Os ícones vêm do `Icon` do design system (`IconName`, ex.: "dashboard"),
 * exceto Locação: não existe traço de "chave" no `ICON_PATHS`, então ela usa
 * o `KeyRound` do lucide-react — o próprio `Icon` recomenda pegar o
 * equivalente em Lucide quando falta um traçado.
 */
export default function useNavGroups(): NavGroup[] {
  const { user } = useAuth();
  const idsFinanceiroLegado = [1, 3, 4].includes(user?.id ?? -1);
  const podeContas = user?.role === "admin" || user?.role === "financeiro";
  const ehAdmin = user?.role === "admin";

  const secoes: { label: string; itens: ItemBruto[] }[] = [
    {
      label: "Principal",
      itens: [
        { label: "Início", path: "/inicio", icon: "dashboard", mostrar: true },
        { label: "Meta do trimestre", path: "/dashboard", icon: "chart", mostrar: true },
      ],
    },
    {
      label: "Comercial",
      itens: [
        { label: "Vendas", path: "/vendas", icon: "ticket", mostrar: true },
        { label: "Serviços", path: "/servicos", icon: "clock", mostrar: true },
        { label: "Clientes", path: "/clientes", icon: "users", mostrar: true },
        { label: "Produtos", path: "/produtos", icon: "box", mostrar: true },
        { label: "Vendedores", path: "/vendedores", icon: "groups", mostrar: true },
      ],
    },
    {
      label: "Financeiro",
      itens: [
        { label: "Gerenciamento", path: "/financeiro", icon: "chart", mostrar: idsFinanceiroLegado },
        { label: "Contas a pagar", path: "/contas-pagar", icon: "tag", mostrar: podeContas },
        { label: "Contas a receber", path: "/contas-receber", icon: "tag", mostrar: podeContas },
        {
          label: "Locação",
          path: "/locacao",
          // "key" não existe no ICON_PATHS do Icon — pegando o equivalente
          // em Lucide, como a própria doc do design system recomenda.
          icon: <KeyRound size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />,
          mostrar: idsFinanceiroLegado,
        },
      ],
    },
    {
      label: "Administração",
      itens: [
        { label: "Estoque", path: "/estoque", icon: "cpu", mostrar: true },
        { label: "Usuários", path: "/usuarios", icon: "groups", mostrar: ehAdmin },
        { label: "Configurações", path: "/configuracoes", icon: "shield", mostrar: ehAdmin },
      ],
    },
  ];

  return secoes
    .map((secao) => ({
      label: secao.label,
      items: secao.itens
        .filter((item) => item.mostrar)
        .map(({ label, path, icon }) => ({ label, path, icon })),
    }))
    .filter((grupo) => grupo.items.length > 0);
}
