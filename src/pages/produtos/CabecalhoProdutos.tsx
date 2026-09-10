import { Card } from "../../design-system/ui";

export interface CabecalhoProdutosProps {
  usuario?: { username?: string; role?: string } | null;
}

/**
 * Cabeçalho da tela de Produtos: título, quem está logado e uma frase sobre
 * o que a tela mostra.
 *
 * Limpeza retroativa decidida em 09/09/2026 (ver plano, "Mudança de rumo"):
 * o bloco tinha saído da Task 4 com `dark:` e paleta crua, forçando este
 * arquivo a entrar no `PENDENTES_FASE_3`. Aqui ele adota os tokens do design
 * system, como `CabecalhoContas.tsx` já faz para a tela irmã.
 */
export function CabecalhoProdutos({ usuario }: CabecalhoProdutosProps) {
  return (
    <Card padding="lg">
      <h1 className="text-3xl font-bold text-conteudo-heading">Produtos - Dashboard</h1>
      <p className="mt-1 text-sm text-conteudo">
        Bem-vindo, <span className="font-semibold">{usuario?.username}</span> ({usuario?.role})
      </p>
      <p className="mt-2 text-sm text-conteudo-muted">
        Análise detalhada de produtos vendidos, quantidades, valores e performance.
      </p>
    </Card>
  );
}
