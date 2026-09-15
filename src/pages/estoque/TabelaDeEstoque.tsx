import { useState } from "react";
import { ChevronDown, ChevronUp, Download, Search } from "lucide-react";

import SolicitacaoComprasModal from "../../components/SolicitacaoComprasModal";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Input,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../design-system/ui";
import type { CampoDeOrdenacao, OrdenacaoDeEstoque, ProdutoEstoque } from "./estoque";

const DINHEIRO = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

export interface TabelaDeEstoqueProps {
  /** A página visível. */
  produtos: ProdutoEstoque[];
  /** Tudo o que o filtro e a pesquisa deixaram, para a contagem. */
  total: number;
  pagina: number;
  onPagina: (pagina: number) => void;
  pesquisa: string;
  onPesquisar: (termo: string) => void;
  ordenacao: OrdenacaoDeEstoque;
  onOrdenar: (campo: CampoDeOrdenacao) => void;
  onExportar: () => void;
  /** O catálogo INTEIRO, sem filtro — é o que a solicitação de compras lista. */
  catalogo: ProdutoEstoque[];
  solicitante: string;
}

/**
 * "Detalhamento do Estoque": pesquisa, exportação, a solicitação de compras,
 * sete colunas — cinco ordenáveis — e paginação de 15 em 15.
 *
 * Nasce limpa, sobre os primitivos de tabela. O estado do modal de solicitação
 * veio junto (colocation): só esta tabela o abre e o fecha.
 *
 * Achados ao mover (não corrigidos):
 *   - o clique de ordenar mora no `<th>`, que não entra na ordem de tabulação:
 *     ordenar é ação só de mouse;
 *   - exportar não desabilita com a tabela vazia.
 */
export function TabelaDeEstoque({
  produtos,
  total,
  pagina,
  onPagina,
  pesquisa,
  onPesquisar,
  ordenacao,
  onOrdenar,
  onExportar,
  catalogo,
  solicitante,
}: TabelaDeEstoqueProps) {
  const [modalAberto, setModalAberto] = useState(false);

  const ordenavel = (campo: CampoDeOrdenacao, rotulo: string) => (
    <TableHeaderCell className="cursor-pointer" onClick={() => onOrdenar(campo)}>
      <span className="inline-flex select-none items-center gap-1">
        <span>{rotulo}</span>
        {ordenacao.campo === campo ? (
          ordenacao.direcao === "desc" ? (
            <ChevronDown className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          ) : (
            <ChevronUp className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          )
        ) : null}
      </span>
    </TableHeaderCell>
  );

  return (
    <Card padding="none">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-borda p-4">
        <CardTitle>Detalhamento do Estoque</CardTitle>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Pesquisar..."
              aria-label="Pesquisar produtos"
              value={pesquisa}
              onChange={(evento) => onPesquisar(evento.target.value)}
              icon={<Search className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
            />
          </div>
          <Button
            variant="success"
            onClick={onExportar}
            icon={<Download className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
          >
            Exportar Excel
          </Button>
          <Button variant="primary" onClick={() => setModalAberto(true)}>
            Solicitação de Compras
          </Button>
        </div>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            {ordenavel("nome", "Nome")}
            {ordenavel("codigo", "Código-SKU")}
            <TableHeaderCell>Unidade</TableHeaderCell>
            {ordenavel("preco", "Preço")}
            {ordenavel("saldo", "Saldo")}
            {ordenavel("situacao", "Situação")}
            <TableHeaderCell>Valor Total</TableHeaderCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {produtos.length === 0 ? (
            // Pagination some com total zero; sem isso a tabela ficava muda no
            // filtro sem resultado (defeito 2 do spec).
            <TableEmpty colSpan={7} />
          ) : (
            produtos.map((produto) => (
              <TableRow key={produto.id}>
                <TableCell className="text-sm font-medium">{produto.nome}</TableCell>
                <TableCell muted className="text-sm">
                  {produto.codigo}
                </TableCell>
                <TableCell muted className="text-sm">
                  {produto.unidade}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm font-semibold text-action">
                  R$ {produto.preco.toLocaleString("pt-BR", DINHEIRO)}
                </TableCell>
                <TableCell
                  className={[
                    "text-sm font-semibold",
                    produto.saldo > 0 ? "text-success" : "text-danger",
                  ].join(" ")}
                >
                  {produto.saldo.toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>
                  <Badge variant={produto.situacao === "A" ? "success" : "danger"}>
                    {produto.situacao === "A" ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm font-semibold">
                  R$ {(produto.saldo * produto.preco).toLocaleString("pt-BR", DINHEIRO)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="px-4 pb-4">
        {/*
          O `Pagination` do design system. As 105 linhas que saíram escondiam a
          frase de contagem dentro do `{totalPaginas > 1 && ...}`: quem tinha 15
          itens ou menos não lia contagem nenhuma.
        */}
        <Pagination
          page={pagina}
          pageSize={15}
          total={total}
          itemLabel="produtos"
          onPageChange={onPagina}
        />
      </div>

      <SolicitacaoComprasModal
        aberto={modalAberto}
        fechar={() => setModalAberto(false)}
        produtos={catalogo}
        solicitante={solicitante}
      />
    </Card>
  );
}
