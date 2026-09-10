import {
  Building,
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Download,
  FileText,
  MapPin,
  Search,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import ModalObservacoes from "../../components/ModalObservacoes";
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
import { converterParaNumero } from "../../lib/dinheiro";
import type { OrdenacaoDeServicos, Servico } from "./servicos";

export interface TabelaDeServicosProps {
  /** A página já cortada — quem pagina é a tela, esta tabela só desenha. */
  servicos: Servico[];
  /** O recorte inteiro (filtro + busca), não a página — é o que o rodapé conta. */
  total: number;
  pagina: number;
  onPagina: (pagina: number) => void;
  pesquisa: string;
  onPesquisar: (termo: string) => void;
  ordenacao: OrdenacaoDeServicos;
  onOrdenar: (campo: OrdenacaoDeServicos["campo"]) => void;
  onExportarExcel: () => void;
  onExportarPDF: () => void;
}

/** As seis colunas, na ordem em que aparecem. `campo` fica de fora só na
 *  "Descrição" — a única sem ordenação; `Icone` fica de fora pelo mesmo
 *  motivo de sempre: a coluna de descrição nunca teve ícone no cabeçalho. */
interface ColunaDeServicos {
  chave: string;
  rotulo: string;
  campo?: OrdenacaoDeServicos["campo"];
  Icone?: LucideIcon;
}

const COLUNAS: ColunaDeServicos[] = [
  { chave: "numero", rotulo: "Número NFS-e", campo: "numero", Icone: FileText },
  { chave: "cliente", rotulo: "Cliente (Tomador)", campo: "cliente", Icone: Building },
  { chave: "emissao", rotulo: "Data Emissão", campo: "data_emissao", Icone: Calendar },
  { chave: "cidade", rotulo: "Cidade/UF", campo: "cidade", Icone: MapPin },
  { chave: "valor", rotulo: "Valor", campo: "valor", Icone: DollarSign },
  { chave: "descricao", rotulo: "Descrição" },
];

/**
 * A tabela de Serviços: busca, as duas exportações (Excel e PDF), a tabela
 * com seis colunas — cinco ordenáveis — e paginação de 15 em 15.
 *
 * `observacoesSelecionadas` nasceu na tela (`Servicos.tsx`), mas é estado que
 * só esta tabela lê e só ela escreve — nenhum outro componente da tela
 * precisa saber qual observação está aberta. Mover para cá é colocation: o
 * modal sai de dentro do `<tbody>` (onde vivia antes, HTML inválido — um
 * `<div>` não é filho válido de `<tbody>`) para irmão da tabela, sem mudar
 * nada visível, porque o modal é `position: fixed`.
 *
 * **Dois defeitos conhecidos, preservados de propósito** (quem corrige é a
 * task dos consertos, cada um com plantação própria):
 * - o `onClick` de ordenação mora direto no `<th>` (via `TableHeaderCell`,
 *   sem `sortable`), e não num `<button>` filho como `TabelaDeContas.tsx` e
 *   `TabelaDeProdutos.tsx` já fazem — um `<th>` não recebe foco de teclado.
 * - os botões de exportar não desabilitam com `total === 0` — falta o mesmo
 *   `disabled={total === 0}` que `TabelaDeContas.tsx` já tem no símbolo
 *   `TabelaDeContas`.
 *
 * O ícone de cada cabeçalho ordenável (`Icone` em `COLUNAS`) veio junto do
 * movimento: a tela em `Servicos.tsx` desenhava um `FileText`, `Building`,
 * `Calendar`, `MapPin` e `DollarSign` antes do rótulo, e mover é mover. Só a
 * cor mudou — era `text-gray-500 dark:text-gray-400`, agora o ícone herda o
 * `currentColor` do `<th>` (`text-conteudo-muted`), porque paleta crua neste
 * arquivo derrubaria `guarda-cores.test.ts`.
 */
export function TabelaDeServicos({
  servicos,
  total,
  pagina,
  onPagina,
  pesquisa,
  onPesquisar,
  ordenacao,
  onOrdenar,
  onExportarExcel,
  onExportarPDF,
}: TabelaDeServicosProps) {
  const [observacoesSelecionadas, setObservacoesSelecionadas] = useState<string | null>(null);

  const celula = (servico: Servico, chave: string): ReactNode => {
    switch (chave) {
      case "numero":
        return (
          <TableCell key={chave}>
            <p className="font-medium">{servico.numero_nfse}</p>
          </TableCell>
        );
      case "cliente":
        return (
          <TableCell key={chave} className="min-w-[200px]">
            <p className="font-medium">{servico.razao_social_tomador}</p>
            <p className="text-xs text-conteudo-muted">{servico.cpf_cnpj_tomador}</p>
          </TableCell>
        );
      case "emissao":
        // `split("-").reverse().join("/")` não passa por `new Date` — não
        // tem o defeito de fuso que `linhasDaPlanilha`/`linhasDoPdf`
        // documentam em servicos.ts, porque nunca converteu a string em
        // `Date`.
        return (
          <TableCell key={chave} muted className="whitespace-nowrap">
            {servico.data_emissao.split("-").reverse().join("/")}
          </TableCell>
        );
      case "cidade":
        return (
          <TableCell key={chave} muted>
            {servico.cidade_tomador}/{servico.uf_tomador}
          </TableCell>
        );
      case "valor":
        return (
          <TableCell key={chave} className="whitespace-nowrap font-semibold text-action">
            R${" "}
            {converterParaNumero(servico.valor_servico).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </TableCell>
        );
      case "descricao":
        return (
          <TableCell key={chave} className="text-center">
            {servico.discriminacao_servico ? (
              <button
                type="button"
                onClick={() => setObservacoesSelecionadas(servico.discriminacao_servico)}
                className="whitespace-nowrap rounded-full bg-action-tint px-3 py-1 text-sm font-medium text-action transition-colors hover:text-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                Ver Observações
              </button>
            ) : (
              <span className="text-conteudo-faint">-</span>
            )}
          </TableCell>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Card padding="none">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-borda p-4">
          <CardTitle>Detalhamento de Serviços</CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Pesquisar..."
                aria-label="Pesquisar serviços"
                value={pesquisa}
                onChange={(evento) => onPesquisar(evento.target.value)}
                icon={<Search className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
              />
            </div>
            <Button
              variant="success"
              onClick={onExportarExcel}
              icon={<Download className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
            >
              Excel
            </Button>
            <Button
              variant="primary"
              onClick={onExportarPDF}
              icon={<Download className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
            >
              PDF
            </Button>
          </div>
        </div>

        <Table>
          <TableHead>
            <TableRow>
              {COLUNAS.map(({ chave, rotulo, campo, Icone }) =>
                campo ? (
                  // Sem `sortable`: o clique fica no `<th>` mesmo, não num
                  // `<button>` filho — defeito conhecido, preservado.
                  <TableHeaderCell
                    key={chave}
                    onClick={() => onOrdenar(campo)}
                    className="cursor-pointer select-none hover:bg-surface-elevated"
                  >
                    <span className="inline-flex items-center gap-1">
                      {Icone ? (
                        <Icone className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                      ) : null}
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
            {servicos.length === 0 ? (
              // Pagination some com total zero; sem isso a tabela ficava
              // muda no filtro sem resultado (defeito 2 do spec).
              <TableEmpty colSpan={COLUNAS.length} />
            ) : (
              servicos.map((servico) => (
                <TableRow key={servico.id}>
                  {COLUNAS.map(({ chave }) => celula(servico, chave))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="px-4 pb-4">
          <Pagination
            page={pagina}
            pageSize={15}
            total={total}
            itemLabel="serviços"
            onPageChange={onPagina}
          />
        </div>
      </Card>

      {observacoesSelecionadas && (
        <ModalObservacoes
          observacoes={observacoesSelecionadas}
          onClose={() => setObservacoesSelecionadas(null)}
        />
      )}
    </>
  );
}
