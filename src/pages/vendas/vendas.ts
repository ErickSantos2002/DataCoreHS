import type {
  FiltrosComerciais,
  NotaVenda,
  ResumoComercial,
} from "../../services/notasapi";
import type {
  CampoDeOrdenacao,
  RecorteComercial,
} from "../comercial/useComercial";

/**
 * A conta pura da tela de Vendas, separada de `Vendas.tsx`.
 *
 * Cada função aqui é um `useMemo` ou um trecho de JSX que saiu do componente
 * sem mudar de comportamento. A soma é do banco (`comercial/useComercial.ts`,
 * da outra frente); o que sobra para a tela é recortar, rotular e formatar.
 *
 * Onde a lógica movida tem cara de defeito, o comentário registra o achado sem
 * corrigir — corrigir junto de mover impede saber qual dos dois quebrou.
 */

type Cadastro = FiltrosComerciais["clientes"][number];
type ProdutoDoFiltro = FiltrosComerciais["produtos"][number];

/** "Nome (CNPJ)" — o que o multiselect de empresa mostra e guarda. */
export const rotuloDoCliente = (c: {
  nome: string | null;
  cpf_cnpj: string | null;
}) => `${c.nome} (${c.cpf_cnpj})`;

/** "Descrição (código)" — o que o multiselect de produto mostra e guarda. */
export const rotuloDoProduto = (p: {
  descricao: string | null;
  codigo: string | null;
}) => `${p.descricao} (${p.codigo ?? "sem código"})`;

/** Rótulo → id do cadastro, que é o que o recorte manda. */
export function idPorRotulo(clientes: Cadastro[]): Map<string, number> {
  const mapa = new Map<string, number>();
  clientes.forEach((c) => mapa.set(rotuloDoCliente(c), c.id));
  return mapa;
}

/** Rótulo → chave do produto, que é o que o servidor filtra. */
export function chavePorRotulo(
  produtos: ProdutoDoFiltro[],
): Map<string, string> {
  const mapa = new Map<string, string>();
  produtos.forEach((p) => mapa.set(rotuloDoProduto(p), p.chave));
  return mapa;
}

export interface FiltrosDeVendas {
  empresa: string[];
  vendedor: string[];
  produto: string[];
  dataInicio: string;
  dataFim: string;
}

export function recorteDosFiltros(
  filtros: FiltrosDeVendas,
  idDoRotulo: Map<string, number>,
  chaveDoRotulo: Map<string, string>,
): RecorteComercial {
  return {
    clientes: filtros.empresa
      .map((r) => idDoRotulo.get(r))
      .filter((id): id is number => id !== undefined),
    vendedores: filtros.vendedor,
    produtos: filtros.produto
      .map((r) => chaveDoRotulo.get(r))
      .filter((c): c is string => c !== undefined),
    dataInicio: filtros.dataInicio,
    dataFim: filtros.dataFim,
  };
}

export interface KpisDeVendas {
  /** O total da NOTA — Vendedores é que mede a mercadoria. */
  totalFaturado: number;
  totalVendas: number;
  ticketMedio: number;
  produtoMaisVendido: { nome: string; valor: number } | null;
}

/** Os quatro números do topo, somados pelo banco sobre o recorte inteiro.
 *  O produto do topo é o primeiro do ranking, que já vem por valor. */
export function kpisDoResumo(resumo: ResumoComercial): KpisDeVendas {
  const topo = resumo.por_produto[0];
  return {
    totalFaturado: resumo.kpis.faturamento,
    totalVendas: resumo.kpis.notas,
    ticketMedio: resumo.kpis.ticket_medio,
    produtoMaisVendido: topo
      ? { nome: topo.descricao ?? "N/A", valor: topo.valor }
      : null,
  };
}

export interface PontoDeEvolucao {
  mes: string;
  total: number;
  ordem: number;
}

/**
 * A evolução: um ponto por mês com venda, rotulado "jun. de 2026"; acima de 24
 * meses, um ponto por ano com a soma.
 */
export function evolucaoDoResumo(
  evolucao: ResumoComercial["evolucao_mensal"],
): PontoDeEvolucao[] {
  const dadosMensais = evolucao.map((m) => {
    const data = new Date(m.ano, m.mes - 1);
    return {
      mes: data.toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric",
      }),
      total: m.total,
      ordem: data.getTime(),
      ano: m.ano,
    };
  });

  if (dadosMensais.length > 24) {
    const porAno = dadosMensais.reduce((acc: Record<number, number>, item) => {
      acc[item.ano] = (acc[item.ano] ?? 0) + item.total;
      return acc;
    }, {});

    return Object.entries(porAno)
      .map(([ano, total]) => ({
        mes: ano,
        total,
        ordem: new Date(Number(ano), 0).getTime(),
      }))
      .sort((a, b) => a.ordem - b.ordem);
  }

  return dadosMensais;
}

/**
 * Os cinco produtos de maior valor.
 *
 * ⚠️ O ranking agrupa por CÓDIGO, e não pela grafia da descrição. Medido em
 * 2026-09-09: o mesmo produto aparecia repartido em até oito grafias, e o
 * Top 5 mostrava produto errado por causa disso.
 */
export function rankingDeProdutos(
  porProduto: ResumoComercial["por_produto"],
): { produto: string; valor: number }[] {
  return porProduto.slice(0, 5).map((p) => ({
    produto: p.descricao ?? "Sem descrição",
    valor: p.valor,
  }));
}

export function rankingDeVendedores(
  porVendedor: ResumoComercial["por_vendedor"],
): { vendedor: string; valor: number }[] {
  return porVendedor.slice(0, 5).map((v) => ({
    vendedor: v.nome,
    valor: v.valor,
  }));
}

/** Os oito maiores clientes, agrupados pelo documento: dois cadastros do
 *  mesmo CNPJ apareciam como duas fatias da pizza. */
export function distribuicaoDeEmpresas(
  porCliente: ResumoComercial["por_cliente"],
): { name: string; value: number }[] {
  return porCliente.slice(0, 8).map((c) => ({
    name: c.nome ?? "Não informado",
    value: c.valor,
  }));
}

/**
 * "R$ 1.2M", "R$ 3.4K", "R$ 999.5" — os eixos, o balão da evolução e o da
 * pizza.
 *
 * Achado ao mover (não corrigido): ponto decimal, e abaixo de mil nem casas
 * fixas ("R$ 999.5"). O de Estoque, Vendedores e Clientes tem o mesmo ponto.
 */
export function formatarValorAbreviado(valor: number): string {
  if (valor >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toFixed(1)}M`;
  } else if (valor >= 1_000) {
    return `R$ ${(valor / 1_000).toFixed(1)}K`;
  }
  return `R$ ${valor}`;
}

export interface OrdenacaoDeVendas {
  campo: CampoDeOrdenacao;
  direcao: "asc" | "desc";
}

/** O primeiro clique numa coluna é decrescente; clicar na que já está
 *  decrescente inverte. A ordem em si é do servidor. */
export function proximaOrdenacao(
  atual: OrdenacaoDeVendas,
  campo: CampoDeOrdenacao,
): OrdenacaoDeVendas {
  return {
    campo,
    direcao: atual.campo === campo && atual.direcao === "desc" ? "asc" : "desc",
  };
}

const DINHEIRO = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

/**
 * "Resumo do Período", já como texto.
 *
 * Achado ao mover (não corrigido): a média de itens sai com `toFixed` —
 * "2.6", com ponto.
 */
export function resumoDoPeriodo(
  resumo: ResumoComercial,
): { label: string; value: string | number }[] {
  return [
    { label: "Total de Clientes", value: resumo.por_cliente.length },
    {
      label: "Total de Vendedores",
      value: resumo.por_vendedor.filter((v) => v.nome !== "Não informado")
        .length,
    },
    { label: "Total de Produtos", value: resumo.por_produto.length },
    {
      label: "Média de Itens/Venda",
      value:
        resumo.kpis.notas > 0
          ? (resumo.kpis.itens / resumo.kpis.notas).toFixed(1)
          : "0",
    },
  ];
}

export interface ComparativoMensal {
  /** Em porcentagem; 0 quando o penúltimo ponto é zero. */
  variacao: number;
  melhorMes: string;
  mediaMensal: number;
}

/**
 * "Comparativo Mensal": variação do último ponto sobre o penúltimo, o melhor
 * ponto e a média. `null` com menos de dois pontos.
 *
 * Achados ao mover (não corrigidos):
 *   - acima de 24 meses a evolução é ANUAL, e o cartão compara anos sob os
 *     rótulos "Variação último mês", "Melhor mês" e "Média mensal";
 *   - o último ponto é o mês corrente, ainda aberto: no dia 3 a variação sai
 *     perto de −100%;
 *   - com menos de dois pontos o cartão fica só com o título, sem frase.
 */
export function comparativoMensal(
  evolucao: PontoDeEvolucao[],
): ComparativoMensal | null {
  if (evolucao.length < 2) return null;
  const ultimo = evolucao[evolucao.length - 1]?.total || 0;
  const penultimo = evolucao[evolucao.length - 2]?.total || 0;
  return {
    variacao: penultimo > 0 ? ((ultimo - penultimo) / penultimo) * 100 : 0,
    melhorMes:
      evolucao.reduce(
        (max, item) => (item.total > (max?.total || 0) ? item : max),
        evolucao[0],
      )?.mes || "N/A",
    mediaMensal:
      evolucao.reduce((acc, item) => acc + item.total, 0) / evolucao.length,
  };
}

/** "Performance de Vendas", já como texto. */
export function performanceDeVendas(
  resumo: ResumoComercial,
): { label: string; value: string }[] {
  return [
    {
      label: "Maior venda",
      value: `R$ ${resumo.kpis.maior_venda.toLocaleString("pt-BR", DINHEIRO)}`,
    },
    {
      label: "Menor venda",
      value: `R$ ${resumo.kpis.menor_venda.toLocaleString("pt-BR", DINHEIRO)}`,
    },
    {
      label: "Desvio padrão",
      value: `R$ ${resumo.kpis.desvio_padrao_venda.toLocaleString("pt-BR", DINHEIRO)}`,
    },
  ];
}

/** "2026-03-05" → "05/03/2026", sem passar por `Date`. */
export function dataDaNota(dataEmissao: string): string {
  return dataEmissao.split("-").reverse().join("/");
}

/**
 * As linhas da planilha "Vendas".
 *
 * A "Data" é a mesma da tabela, montada na string. Passava por
 * `new Date("2026-03-05")`, que é meia-noite em UTC — em Brasília ainda é dia
 * 4, e a planilha saía com um dia a menos que a tela.
 */
export function linhasDaPlanilha(
  notas: NotaVenda[],
): Record<string, unknown>[] {
  return notas.map((n) => ({
    Data: dataDaNota(n.data_emissao),
    Cliente: n.cliente?.nome || "",
    CNPJ: n.cliente?.cpf_cnpj || "",
    Valor: n.valor_nota,
    Vendedor: n.nome_vendedor || "",
    Produtos: n.itens?.map((i) => i.descricao).join(", ") || "",
  }));
}
