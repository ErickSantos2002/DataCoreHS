import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import { Spinner } from "../../design-system/ui";
import { useAuth } from "../../hooks/useAuth";
import { CabecalhoContas } from "./CabecalhoContas";
import { FiltrosDeContas } from "./FiltrosDeContas";
import { GraficosDeContas } from "./GraficosDeContas";
import { KpisDeContas } from "./KpisDeContas";
import { TabelaDeContas } from "./TabelaDeContas";
import {
  ORDENACAO_INICIAL,
  buscarNasContas,
  calcularKpis,
  fatiaDaPagina,
  filtrarContas,
  linhasDaPlanilha,
  montarCategorias,
  montarContrapartes,
  montarEvolucao,
  nomeDoArquivo,
  opcoesDistintas,
  ordenarContas,
  periodoDaBarra,
  periodoDoPreset,
  proximaOrdenacao,
  type ContaBase,
  type DialetoDeContas,
  type FormatoDaPlanilha,
} from "./contas";

/**
 * Tudo o que difere entre Contas a Receber e Contas a Pagar, num objeto só.
 *
 * A régua para uma entrada existir aqui é uma só: ela tem de ser divergência
 * de DOMÍNIO — o que conta como quitado, qual campo de data é a emissão, e o
 * vocabulário do negócio (cliente ou fornecedor, receber ou pagar). Não há
 * segunda categoria. O que divergia por descuido — a ordem das colunas, as
 * colunas da planilha, a mensagem de lista vazia, o texto do selo, o CPF/CNPJ
 * na célula, além de cor de KPI, cor de barra, moldura de card e paginação —
 * não tem entrada nenhuma: virou código igual para as duas.
 */
export interface ConfiguracaoDeContas<C extends ContaBase> {
  titulo: string;
  descricao: string;
  mensagemDeCarregamento: string;
  /** "Cliente" ou "Fornecedor" — o rótulo do filtro. */
  rotuloDaContraparte: string;
  rotuloDoAberto: string;
  rotuloDoQuitado: string;
  tituloDaTabela: string;
  tituloDasContrapartes: string;
  legendaQuitado: string;
  legendaAberto: string;
  tomDoAberto: "acao" | "perigo";
  dialeto: DialetoDeContas<C>;
  planilha: FormatoDaPlanilha<C>;
}

export interface TelaDeContasProps<C extends ContaBase> {
  configuracao: ConfiguracaoDeContas<C>;
  contas: C[];
  carregando: boolean;
}

/**
 * O esqueleto das duas telas de Contas.
 *
 * Guarda o que a pessoa escolheu — os cinco filtros, o preset de período, a
 * busca, a página e a ordenação — e entrega o recorte pronto para o
 * cabeçalho, a faixa de KPIs, os três gráficos e a tabela. As contas moram em
 * `contas.ts`; o desenho, nos componentes ao lado.
 *
 * A ordem das camadas importa e é a de hoje:
 *
 *  1. os filtros do topo recortam a base — e é desse recorte que saem os KPIs
 *     e os três gráficos;
 *  2. a busca da tabela recorta de novo, só para a tabela e para a planilha.
 *
 * Por isso digitar na busca muda a tabela e não mexe nos números do topo.
 */
export function TelaDeContas<C extends ContaBase>({
  configuracao,
  contas,
  carregando,
}: TelaDeContasProps<C>) {
  const { user } = useAuth();
  const { dialeto } = configuracao;

  const [filtroSituacao, setFiltroSituacao] = useState<string[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string[]>([]);
  const [filtroContraparte, setFiltroContraparte] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [preset, setPreset] = useState("todos");
  const [pesquisa, setPesquisa] = useState("");
  const [pagina, setPagina] = useState(1);
  const [ordenacao, setOrdenacao] = useState(ORDENACAO_INICIAL);

  // Trocar de preset reescreve as duas datas. "Personalizado" é o único que
  // não mexe em nada: é para onde a tela vai quando a pessoa digita uma data
  // ou clica numa barra do gráfico.
  useEffect(() => {
    const periodo = periodoDoPreset(preset, new Date());
    if (!periodo) return;
    setDataInicio(periodo.inicio);
    setDataFim(periodo.fim);
  }, [preset]);

  // As opções saem da base INTEIRA, e não do que sobrou dos outros filtros:
  // assim a lista não encolhe embaixo do dedo de quem está escolhendo.
  const opcoes = useMemo(
    () => ({
      situacao: opcoesDistintas(contas.map((conta) => conta.situacao)),
      categoria: opcoesDistintas(contas.map((conta) => conta.categoria)),
      contraparte: opcoesDistintas(contas.map((conta) => conta.cliente_nome)),
    }),
    [contas],
  );

  const filtros = useMemo(
    () => ({
      situacao: filtroSituacao,
      categoria: filtroCategoria,
      contraparte: filtroContraparte,
      dataInicio,
      dataFim,
    }),
    [filtroSituacao, filtroCategoria, filtroContraparte, dataInicio, dataFim],
  );

  const filtradas = useMemo(
    () => filtrarContas(contas, filtros, dialeto),
    [contas, filtros, dialeto],
  );

  const kpis = useMemo(
    () => calcularKpis(filtradas, dialeto, new Date()),
    [filtradas, dialeto],
  );
  const evolucao = useMemo(
    () => montarEvolucao(filtradas, dialeto, new Date()),
    [filtradas, dialeto],
  );
  const categorias = useMemo(() => montarCategorias(filtradas), [filtradas]);
  const contrapartes = useMemo(() => montarContrapartes(filtradas), [filtradas]);

  const daTabela = useMemo(
    () => ordenarContas(buscarNasContas(filtradas, pesquisa), ordenacao),
    [filtradas, pesquisa, ordenacao],
  );
  const daPagina = useMemo(() => fatiaDaPagina(daTabela, pagina), [daTabela, pagina]);

  const aoClicarNaEvolucao = useCallback(
    (estado: { activeLabel?: string }) => {
      const periodo = periodoDaBarra(estado?.activeLabel, evolucao.modo, evolucao.ano);
      if (!periodo) return;
      setDataInicio(periodo.inicio);
      setDataFim(periodo.fim);
      // Tem de vencer o preset que estava valendo: senão o efeito lá em cima
      // reescreve as datas por cima do período que acabou de ser clicado.
      setPreset("custom");
      setPagina(1);
    },
    [evolucao.modo, evolucao.ano],
  );

  const exportar = useCallback(() => {
    const linhas = linhasDaPlanilha(daTabela, dialeto, configuracao.planilha);
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, configuracao.planilha.aba);
    XLSX.writeFile(livro, nomeDoArquivo(configuracao.planilha.prefixoDoArquivo, new Date()));
  }, [daTabela, dialeto, configuracao.planilha]);

  if (carregando) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-base px-6 py-16 text-conteudo-muted md:h-full md:min-h-0">
        <Spinner size="lg" />
        <p>{configuracao.mensagemDeCarregamento}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base p-6 transition-colors md:h-full md:min-h-0">
      <div className="flex flex-col gap-6">
        <CabecalhoContas
          titulo={configuracao.titulo}
          descricao={configuracao.descricao}
          usuario={user}
        />

        <FiltrosDeContas
          rotuloDaContraparte={configuracao.rotuloDaContraparte}
          opcoes={opcoes}
          valores={filtros}
          preset={preset}
          onSituacao={(valores) => {
            setFiltroSituacao(valores);
            setPagina(1);
          }}
          onCategoria={(valores) => {
            setFiltroCategoria(valores);
            setPagina(1);
          }}
          onContraparte={(valores) => {
            setFiltroContraparte(valores);
            setPagina(1);
          }}
          onPreset={(valor) => {
            setPreset(valor);
            setPagina(1);
          }}
          onDataInicio={(valor) => {
            setDataInicio(valor);
            setPreset("custom");
            setPagina(1);
          }}
          onDataFim={(valor) => {
            setDataFim(valor);
            setPreset("custom");
            setPagina(1);
          }}
        />

        <KpisDeContas
          kpis={kpis}
          rotuloDoAberto={configuracao.rotuloDoAberto}
          rotuloDoQuitado={configuracao.rotuloDoQuitado}
        />

        <GraficosDeContas
          evolucao={evolucao}
          categorias={categorias}
          contrapartes={contrapartes}
          chaveQuitado={dialeto.chaveQuitado}
          legendaQuitado={configuracao.legendaQuitado}
          legendaAberto={configuracao.legendaAberto}
          tomDoAberto={configuracao.tomDoAberto}
          tituloDasContrapartes={configuracao.tituloDasContrapartes}
          onClicarNaEvolucao={aoClicarNaEvolucao}
        />

        <TabelaDeContas
          titulo={configuracao.tituloDaTabela}
          rotuloDaContraparte={configuracao.rotuloDaContraparte}
          dialeto={dialeto}
          contas={daPagina}
          total={daTabela.length}
          pagina={pagina}
          onPagina={setPagina}
          pesquisa={pesquisa}
          onPesquisar={(termo) => {
            setPesquisa(termo);
            setPagina(1);
          }}
          ordenacao={ordenacao}
          onOrdenar={(campo) => setOrdenacao((atual) => proximaOrdenacao(atual, campo))}
          onExportar={exportar}
        />
      </div>
    </div>
  );
}
