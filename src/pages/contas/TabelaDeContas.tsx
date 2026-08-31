import { ChevronDown, ChevronUp, Download, Search } from "lucide-react";
import type { ReactNode } from "react";

import {
  Badge,
  Button,
  Card,
  CardTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../design-system/ui";
import { PaginacaoDeContas } from "./PaginacaoDeContas";
import {
  estaEmAberto,
  estaQuitada,
  formatarData,
  formatarMoeda,
  type ContaBase,
  type DialetoDeContas,
  type Ordenacao,
} from "./contas";

/** As oito colunas que as duas telas conhecem. A ORDEM vem da configuração. */
export type ChaveDeColuna =
  | "id"
  | "contraparte"
  | "categoria"
  | "emissao"
  | "vencimento"
  | "valor"
  | "saldo"
  | "situacao";

export interface ColunaDeContas {
  chave: ChaveDeColuna;
  /** O que o cabeçalho mostra — "Cliente"/"Fornecedor", "Data"/"Emissão". */
  rotulo: string;
  /** O campo da conta por onde a coluna ordena. */
  campo: string;
}

export interface TabelaDeContasProps<C extends ContaBase> {
  titulo: string;
  colunas: ColunaDeContas[];
  dialeto: DialetoDeContas<C>;
  /** A página que está na tela. */
  contas: C[];
  /** Quantas contas o recorte inteiro tem — a paginação fala dele. */
  total: number;
  pagina: number;
  onPagina: (pagina: number) => void;
  pesquisa: string;
  onPesquisar: (termo: string) => void;
  ordenacao: Ordenacao;
  onOrdenar: (campo: string) => void;
  onExportar: () => void;
  /**
   * O que a tabela diz quando não sobra linha nenhuma. Ausente, o corpo fica
   * mudo — é o que Contas a Receber faz hoje.
   *
   * DIVERGÊNCIA ACIDENTAL 3.1, ainda não unificada: Contas a Pagar diz
   * "Nenhuma conta encontrada." e Contas a Receber não diz nada. Unificar
   * muda a asserção de caracterização de Receber, então aguarda a decisão do
   * Erick.
   */
  mensagemDeVazio?: string;
  /**
   * O texto do selo verde de conta quitada. Ausente, o selo mostra a situação
   * crua que a API mandou.
   *
   * DIVERGÊNCIA ACIDENTAL 3.2, ainda não unificada: Receber desenha
   * `{situacao}` cru ("PAGO" da API aparece "PAGO") e Pagar desenha o literal
   * "Pago". A mesma linha do Tiny sai escrita diferente nas duas telas.
   */
  rotuloDeQuitada?: string;
  /**
   * Se a célula da contraparte mostra o CPF/CNPJ numa segunda linha.
   *
   * DIVERGÊNCIA ACIDENTAL 3.5, ainda não unificada: Receber mostra, Pagar
   * trunca o nome e não mostra documento nenhum.
   */
  mostrarDocumento?: boolean;
}

/** O selo de situação: quitada, vencida, em aberto, ou o que a API mandou. */
function SeloDeSituacao<C extends ContaBase>({
  conta,
  dialeto,
  rotuloDeQuitada,
}: {
  conta: C;
  dialeto: DialetoDeContas<C>;
  rotuloDeQuitada?: string;
}) {
  if (estaQuitada(conta.situacao, dialeto)) {
    return <Badge variant="success">{rotuloDeQuitada ?? conta.situacao}</Badge>;
  }
  // A ordem importa e é a de hoje: "Vencida" vem ANTES de "pendente"/"aberto",
  // e por isso apaga a situação de verdade depois do vencimento (defeito 1.5).
  if (conta.vencida) return <Badge variant="danger">Vencida</Badge>;
  if (estaEmAberto(conta.situacao)) return <Badge variant="warning">{conta.situacao}</Badge>;
  return <Badge variant="secondary">{conta.situacao ?? "-"}</Badge>;
}

/**
 * A listagem das contas: busca, ordenação por oito colunas, exportação para
 * Excel e paginação de 15 em 15.
 *
 * Não guarda estado — a tela é dona da busca, da ordenação e da página, e
 * manda para cá o recorte já pronto. Assim o que aparece na tela e o que vai
 * para a planilha saem da mesma lista, sem uma segunda cópia da regra.
 *
 * O cabeçalho de coluna é um `<button>` dentro do `<th>`, e não o `sortable`
 * do `TableHeaderCell` do design system: o `sortable` desenha a seta como
 * caractere de texto (`↑ ↓ ↕`), e aqui a seta é ícone de verdade
 * (`lucide-react`), desenhada só na coluna que está ordenando — como as duas
 * telas sempre fizeram.
 */
export function TabelaDeContas<C extends ContaBase>({
  titulo,
  colunas,
  dialeto,
  contas,
  total,
  pagina,
  onPagina,
  pesquisa,
  onPesquisar,
  ordenacao,
  onOrdenar,
  onExportar,
  mensagemDeVazio,
  rotuloDeQuitada,
  mostrarDocumento = false,
}: TabelaDeContasProps<C>) {
  const celula = (conta: C, chave: ChaveDeColuna): ReactNode => {
    switch (chave) {
      case "id":
        return (
          <TableCell key={chave} muted className="font-mono text-xs">
            {conta.id_tiny}
          </TableCell>
        );
      case "contraparte":
        return (
          <TableCell key={chave} className="min-w-[200px]">
            {mostrarDocumento ? (
              <>
                <p className="font-medium">{conta.cliente_nome}</p>
                {conta.cliente_cpf_cnpj ? (
                  <p className="font-mono text-xs text-conteudo-muted">
                    {conta.cliente_cpf_cnpj}
                  </p>
                ) : null}
              </>
            ) : (
              <span className="block max-w-[200px] truncate font-medium" title={conta.cliente_nome}>
                {conta.cliente_nome}
              </span>
            )}
          </TableCell>
        );
      case "categoria":
        return (
          <TableCell key={chave} muted>
            {conta.categoria ?? "-"}
          </TableCell>
        );
      case "emissao":
        return (
          <TableCell key={chave} muted className="whitespace-nowrap font-mono text-xs">
            {formatarData(dialeto.emissao(conta))}
          </TableCell>
        );
      case "vencimento":
        return (
          <TableCell key={chave} muted className="whitespace-nowrap font-mono text-xs">
            {formatarData(conta.vencimento)}
          </TableCell>
        );
      case "valor":
        return (
          <TableCell key={chave} className="whitespace-nowrap font-mono font-semibold text-action">
            {formatarMoeda(conta.valor_numero)}
          </TableCell>
        );
      case "saldo":
        return (
          <TableCell key={chave} className="whitespace-nowrap font-mono font-semibold">
            {formatarMoeda(conta.saldo_numero)}
          </TableCell>
        );
      case "situacao":
        return (
          <TableCell key={chave}>
            <SeloDeSituacao conta={conta} dialeto={dialeto} rotuloDeQuitada={rotuloDeQuitada} />
          </TableCell>
        );
    }
  };

  return (
    <Card padding="none">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-borda p-4">
        <CardTitle>{titulo}</CardTitle>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Pesquisar..."
              aria-label="Pesquisar nas contas"
              value={pesquisa}
              onChange={(evento) => onPesquisar(evento.target.value)}
              icon={<Search className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
            />
          </div>
          <Button
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
            {colunas.map(({ chave, rotulo, campo }) => (
              <TableHeaderCell key={chave}>
                <button
                  type="button"
                  onClick={() => onOrdenar(campo)}
                  aria-label={`Ordenar por ${rotulo}`}
                  className={[
                    "inline-flex select-none items-center gap-1 uppercase tracking-wider",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  ].join(" ")}
                >
                  <span>{rotulo}</span>
                  {ordenacao.campo === campo ? (
                    ordenacao.direcao === "desc" ? (
                      <ChevronDown className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <ChevronUp className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    )
                  ) : null}
                </button>
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {contas.map((conta) => (
            <TableRow key={conta.id}>
              {colunas.map(({ chave }) => celula(conta, chave))}
            </TableRow>
          ))}
          {contas.length === 0 && mensagemDeVazio ? (
            <TableEmpty colSpan={colunas.length} message={mensagemDeVazio} />
          ) : null}
        </TableBody>
      </Table>

      <PaginacaoDeContas pagina={pagina} total={total} onPagina={onPagina} />
    </Card>
  );
}
