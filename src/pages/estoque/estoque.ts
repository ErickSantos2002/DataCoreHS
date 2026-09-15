/**
 * A conta pura da tela de Estoque, separada de `Estoque.tsx`.
 *
 * Cada função aqui é um `useMemo` que saiu do componente sem mudar de
 * comportamento. Os `useMemo` continuam na casca: `usePaginacao` volta para a
 * página 1 quando a lista muda de IDENTIDADE, e uma lista nova a cada render
 * prenderia a tabela na primeira página.
 *
 * Ao contrário das telas do Comercial, aqui a conta é toda do navegador: o
 * `EstoqueContext` entrega o catálogo inteiro (algumas centenas de produtos) e
 * a tela filtra, soma e ordena.
 *
 * Onde a lógica movida tem cara de defeito, o comentário registra o achado sem
 * corrigir — corrigir junto de mover impede saber qual dos dois quebrou.
 */

export interface ProdutoEstoque {
  id: number;
  nome: string;
  codigo: string;
  unidade: string;
  preco: number;
  saldo: number;
  /** A = ativo, I = inativo. */
  situacao: "A" | "I";
}

/**
 * Os códigos do filtro "Principais".
 *
 * Achado ao mover (não corrigido): a lista é cravada no código, sem nome de
 * produto ao lado nem registro de quem a definiu — um produto novo que passe a
 * ser "principal" só entra com deploy.
 */
export const CODIGOS_PRINCIPAIS = [
  "1", "3", "163", "4", "121", "210", "63", "119", "186", "156", "99", "320", "317",
  "318", "7", "80", "189", "128", "297", "15", "13", "21", "8", "22", "118", "117",
  "89", "173", "18",
];

export interface FiltrosDeEstoque {
  produto: string[];
  /** "todos" | "A" | "I" */
  situacao: string;
  /** "todos" | "comSaldo" | "semSaldo" | "Negativo" */
  saldo: string;
  /** "nenhum" | "rapido" */
  personalizado: string;
}

/** As opções do multiselect de produto: um por código, rótulo "nome (código)". */
export function opcoesDeProduto(produtos: ProdutoEstoque[]): { valor: string; rotulo: string }[] {
  return Array.from(
    new Map(
      produtos.map((p) => [p.codigo, { valor: p.codigo, rotulo: `${p.nome} (${p.codigo})` }]),
    ).values(),
  );
}

export function filtrarProdutos(
  produtos: ProdutoEstoque[],
  filtros: FiltrosDeEstoque,
): ProdutoEstoque[] {
  return produtos.filter((p) => {
    const produtoOk = filtros.produto.length === 0 || filtros.produto.includes(p.codigo);

    const situacaoOk =
      filtros.situacao === "todos" ||
      (filtros.situacao === "A" && p.situacao === "A") ||
      (filtros.situacao === "I" && p.situacao === "I");

    const saldoOk =
      filtros.saldo === "todos" ||
      (filtros.saldo === "comSaldo" && p.saldo > 0) ||
      (filtros.saldo === "semSaldo" && p.saldo === 0) ||
      (filtros.saldo === "Negativo" && p.saldo < 0);

    const personalizadoOk =
      filtros.personalizado === "nenhum" ||
      (filtros.personalizado === "rapido" && CODIGOS_PRINCIPAIS.includes(String(p.codigo)));

    return produtoOk && situacaoOk && saldoOk && personalizadoOk;
  });
}

export interface KpisDeEstoque {
  produtosAtivos: number;
  /** Só saldo ZERO — o negativo não entra. */
  produtosSemSaldo: number;
  /** Saldo × preço somado; saldo negativo abate. */
  valorTotalEstoque: number;
  produtoTop: { nome: string; valor: number; unidade: string; saldo: number } | null;
}

export function kpisDoEstoque(produtos: ProdutoEstoque[]): KpisDeEstoque {
  const produtosAtivos = produtos.filter((p) => p.situacao === "A").length;
  const produtosSemSaldo = produtos.filter((p) => p.saldo === 0).length;
  const valorTotalEstoque = produtos.reduce((acc, p) => acc + p.saldo * p.preco, 0);

  const produtoMaiorValor = produtos
    .map((p) => ({ ...p, valor: p.saldo * p.preco }))
    .sort((a, b) => b.valor - a.valor)[0];

  return {
    produtosAtivos,
    produtosSemSaldo,
    valorTotalEstoque,
    produtoTop: produtoMaiorValor
      ? {
          nome: produtoMaiorValor.nome,
          valor: produtoMaiorValor.valor,
          unidade: produtoMaiorValor.unidade,
          saldo: produtoMaiorValor.saldo,
        }
      : null,
  };
}

/** Uma barra do Top 10: `nome` cortado para o eixo, `fullName` para o balão. */
export interface BarraDoRanking {
  nome: string;
  fullName: string;
  valor: number;
  unidade: string;
}

/** Só quem tem saldo E preço positivos, do maior valor ao menor, dez. */
export function rankingDoEstoque(produtos: ProdutoEstoque[]): BarraDoRanking[] {
  return produtos
    .filter((p) => p.saldo > 0 && p.preco > 0)
    .map((p) => ({
      nome: p.nome.length > 20 ? p.nome.substring(0, 20) + "..." : p.nome,
      fullName: p.nome,
      valor: p.saldo * p.preco,
      unidade: p.unidade,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);
}

export interface FatiaDeValor {
  name: string;
  fullName: string;
  value: number;
}

/** Os mesmos produtos do ranking, com o nome cortado em 15, oito fatias. */
export function distribuicaoDeValor(produtos: ProdutoEstoque[]): FatiaDeValor[] {
  return produtos
    .filter((p) => p.saldo > 0 && p.preco > 0)
    .map((p) => ({
      name: p.nome.length > 15 ? p.nome.substring(0, 15) + "..." : p.nome,
      fullName: p.nome,
      value: p.saldo * p.preco,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

/** Ativos e inativos, sem fatia de zero. */
export function situacaoDosProdutos(produtos: ProdutoEstoque[]): { name: string; value: number }[] {
  const ativos = produtos.filter((p) => p.situacao === "A").length;
  const inativos = produtos.filter((p) => p.situacao === "I").length;
  return [
    { name: "Ativos", value: ativos },
    { name: "Inativos", value: inativos },
  ].filter((item) => item.value > 0);
}

const DINHEIRO = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

/**
 * As quatro linhas de "Estatísticas do Estoque", já como texto.
 *
 * No formato brasileiro, como os cartões ao lado. Saíam com `toFixed` — ponto
 * decimal, "R$ 256.42" e "R$ 1200.00" ao lado de "R$ 6.440,00" —, e o vazio
 * era "0,00" com vírgula: dois formatos de dinheiro na mesma tela.
 */
export function estatisticasDoEstoque(
  produtos: ProdutoEstoque[],
): { label: string; value: string | number }[] {
  const n = produtos.length;
  const precoMedio = n > 0 ? produtos.reduce((acc, p) => acc + p.preco, 0) / n : 0;
  const saldoMedio = n > 0 ? produtos.reduce((acc, p) => acc + p.saldo, 0) / n : 0;
  // `Math.max()` sem argumento é -Infinity: o vazio tem de ser tratado antes.
  const maiorPreco = n > 0 ? Math.max(...produtos.map((p) => p.preco)) : 0;
  return [
    { label: "Total de Produtos", value: n },
    { label: "Preço Médio", value: `R$ ${precoMedio.toLocaleString("pt-BR", DINHEIRO)}` },
    {
      label: "Saldo Médio",
      value: saldoMedio.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    },
    { label: "Maior Preço", value: `R$ ${maiorPreco.toLocaleString("pt-BR", DINHEIRO)}` },
  ];
}

export type CampoDeOrdenacao = "nome" | "codigo" | "preco" | "saldo" | "situacao";

export interface OrdenacaoDeEstoque {
  campo: CampoDeOrdenacao;
  direcao: "asc" | "desc";
}

/**
 * A tabela: pesquisa por nome, código ou unidade, e a ordem.
 *
 * Achados ao mover (não corrigidos):
 *   - o comparador nunca devolve `0` (`aVal > bVal ? 1 : -1`): em empate a
 *     ordem não é estável;
 *   - o código ordena como TEXTO — "900" antes de "4" no decrescente.
 */
export function buscarEOrdenar(
  produtos: ProdutoEstoque[],
  pesquisa: string,
  ordenacao: OrdenacaoDeEstoque,
): ProdutoEstoque[] {
  let filtrados = [...produtos];

  if (pesquisa) {
    const termo = pesquisa.toLowerCase();
    filtrados = filtrados.filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) ||
        String(p.codigo).toLowerCase().includes(termo) ||
        p.unidade.toLowerCase().includes(termo),
    );
  }

  filtrados.sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (ordenacao.campo) {
      case "nome":
        aVal = a.nome.toLowerCase();
        bVal = b.nome.toLowerCase();
        break;
      case "codigo":
        aVal = a.codigo;
        bVal = b.codigo;
        break;
      case "preco":
        aVal = a.preco;
        bVal = b.preco;
        break;
      case "saldo":
        aVal = a.saldo;
        bVal = b.saldo;
        break;
      case "situacao":
        aVal = a.situacao;
        bVal = b.situacao;
        break;
      default:
        return 0;
    }

    if (ordenacao.direcao === "asc") {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  return filtrados;
}

/** O primeiro clique numa coluna é decrescente; clicar na que já está
 *  decrescente inverte. */
export function proximaOrdenacao(
  atual: OrdenacaoDeEstoque,
  campo: CampoDeOrdenacao,
): OrdenacaoDeEstoque {
  return {
    campo,
    direcao: atual.campo === campo && atual.direcao === "desc" ? "asc" : "desc",
  };
}

/** "R$ 1.2M", "R$ 3.4K", "R$ 12.50" — o eixo do Top 10. */
export function formatarValorAbreviado(valor: number): string {
  if (valor >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toFixed(1)}M`;
  } else if (valor >= 1_000) {
    return `R$ ${(valor / 1_000).toFixed(1)}K`;
  }
  return `R$ ${valor.toFixed(2)}`;
}

/** As linhas da planilha: a tabela como está — filtrada, pesquisada e na ordem. */
export function linhasDaPlanilha(produtos: ProdutoEstoque[]): Record<string, unknown>[] {
  return produtos.map((p) => ({
    Nome: p.nome,
    "Código-SKU": p.codigo,
    Unidade: p.unidade,
    Preço: p.preco,
    Saldo: p.saldo,
    Situação: p.situacao === "A" ? "Ativo" : "Inativo",
    "Valor Total": p.saldo * p.preco,
  }));
}
