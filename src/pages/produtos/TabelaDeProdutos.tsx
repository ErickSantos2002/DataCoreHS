import { ChevronDown, ChevronUp, Download, Search } from "lucide-react";
import type { ReactNode } from "react";

import {
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
import type { OrdenacaoDeProdutos, ProdutoAgregado } from "./produtos";

export interface TabelaDeProdutosProps {
  /** A página já cortada — quem pagina é a tela, esta tabela só desenha. */
  produtos: ProdutoAgregado[];
  /** O recorte inteiro (filtro + busca), não a página — é o que o rodapé conta. */
  total: number;
  pagina: number;
  onPagina: (pagina: number) => void;
  pesquisa: string;
  onPesquisar: (termo: string) => void;
  ordenacao: OrdenacaoDeProdutos;
  onOrdenar: (campo: string) => void;
  onExportar: () => void;
}

/** As seis colunas, na ordem em que aparecem. `campo` fica de fora só em
 *  "Nº Vendas" — a única sem ordenação. */
interface ColunaDeProdutos {
  chave: string;
  rotulo: string;
  campo?: string;
}

const COLUNAS: ColunaDeProdutos[] = [
  { chave: "codigo", rotulo: "Código", campo: "codigo" },
  { chave: "descricao", rotulo: "Produto", campo: "descricao" },
  { chave: "quantidade", rotulo: "Quantidade", campo: "quantidadeVendida" },
  { chave: "valorTotal", rotulo: "Valor Total", campo: "valorTotal" },
  { chave: "valorMedio", rotulo: "Valor Médio", campo: "valorMedio" },
  { chave: "numeroVendas", rotulo: "Nº Vendas" },
];

/**
 * A tabela de produtos: busca, seis colunas — cinco ordenáveis — exportação
 * para Excel e paginação de 15 em 15.
 *
 * O `onClick` de ordenação fica no próprio `<TableHeaderCell>` (o `<th>`), e
 * não num `<button>` por dentro dele como em `TabelaDeContas.tsx`: achado ao
 * limpar, não corrigido — o cabeçalho já nascia sem foco de teclado
 * (`Produtos.tsx` original também tinha o clique só no `<th>`), e
 * `Produtos.tabela.test.tsx` dispara o clique no `<th>` que encontra por
 * `closest("th")`. Trocar para o botão do primitivo exigiria reescrever esse
 * teste, e a task pede para ele passar sem edição.
 *
 * "Código" chama `onOrdenar("codigo")` mas não reordena nada — outro achado
 * preservado: `ordenarEBuscar` (`produtos.ts`) não tem `case "codigo"` no
 * `switch`, então o clique muda o estado sem mudar a ordem da tabela.
 */
export function TabelaDeProdutos({
  produtos,
  total,
  pagina,
  onPagina,
  pesquisa,
  onPesquisar,
  ordenacao,
  onOrdenar,
  onExportar,
}: TabelaDeProdutosProps) {
  const celula = (produto: ProdutoAgregado, chave: string): ReactNode => {
    switch (chave) {
      case "codigo":
        return (
          <TableCell key={chave} muted>
            {produto.codigo}
          </TableCell>
        );
      case "descricao":
        return (
          <TableCell key={chave}>
            <p className="font-medium">{produto.descricao}</p>
          </TableCell>
        );
      case "quantidade":
        return (
          <TableCell key={chave} muted>
            {produto.quantidadeVendida.toLocaleString("pt-BR")}
          </TableCell>
        );
      case "valorTotal":
        return (
          <TableCell key={chave} className="font-semibold text-action">
            R$ {produto.valorTotal.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </TableCell>
        );
      case "valorMedio":
        return (
          <TableCell key={chave} muted>
            R$ {produto.valorMedio.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </TableCell>
        );
      case "numeroVendas":
        return (
          <TableCell key={chave} muted>
            {produto.numeroVendas}
          </TableCell>
        );
      default:
        return null;
    }
  };

  return (
    <Card padding="none">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-borda p-4">
        <CardTitle>Detalhamento de Produtos</CardTitle>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Pesquisar produto..."
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
        </div>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            {COLUNAS.map(({ chave, rotulo, campo }) =>
              campo ? (
                <TableHeaderCell
                  key={chave}
                  onClick={() => onOrdenar(campo)}
                  className="cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1">
                    {rotulo}
                    {ordenacao.campo === campo ? (
                      ordenacao.direcao === "desc" ? (
                        <ChevronDown className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                      ) : (
                        <ChevronUp className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                      )
                    ) : null}
                  </span>
                </TableHeaderCell>
              ) : (
                <TableHeaderCell key={chave}>{rotulo}</TableHeaderCell>
              ),
            )}
          </TableRow>
        </TableHead>

        <TableBody>
          {produtos.length === 0 ? (
            // Pagination some com total zero; sem isso a tabela ficava
            // muda no filtro sem resultado (defeito 2 do spec). Mensagem
            // padrão do `TableEmpty` — os testes de caracterização (a busca
            // sem resultado e o filtro de período vazio) fixam
            // "Nenhum resultado encontrado.".
            <TableEmpty colSpan={COLUNAS.length} />
          ) : (
            produtos.map((produto) => (
              <TableRow key={produto.codigo}>
                {COLUNAS.map(({ chave }) => celula(produto, chave))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/*
        O `Pagination` do design system, e não as 104 linhas que estavam
        aqui. As que saíram escondiam a frase de contagem dentro do
        `{totalPaginas > 1 && ...}`: quem tinha 10 produtos ou menos não
        lia contagem nenhuma. É o mesmo defeito 1.7 que a Fase 1 corrigiu
        em Contas, e ele morre junto com o bloco.
      */}
      <div className="px-4 pb-4">
        <Pagination
          page={pagina}
          pageSize={15}
          total={total}
          itemLabel="produtos"
          onPageChange={onPagina}
        />
      </div>
    </Card>
  );
}
