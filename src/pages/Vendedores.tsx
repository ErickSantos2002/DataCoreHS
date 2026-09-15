import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  paramsDoRecorte,
  useFiltrosComerciais,
  useResumoComercial,
  useVendasPaginadas,
  type CampoDeOrdenacao,
  type RecorteComercial,
} from "./comercial/useComercial";
import { fetchVendas, updateNotaTipo, type NotaVenda } from "../services/notasapi";
import { diaLocal } from "../lib/datas";
import { baixarPlanilha } from "../lib/planilha";
import { periodoDoPreset } from "../lib/periodo";
import { useToast } from "../components/ToastProvider";
import { Spinner } from "../design-system/ui";
import {
  ajustarFolhaDeVendas,
  distribuicaoDeClientes,
  evolucaoDoResumo,
  idsPorRotulo,
  kpisDoResumo,
  linhasDaPlanilha,
  opcoesDeProduto,
  proximaOrdenacao,
  rotuloDoCliente,
  topProdutosDoResumo,
  vendedoresDoPapel,
} from "./vendedores/vendedores";
import { CabecalhoDeVendedores } from "./vendedores/CabecalhoDeVendedores";
import { FiltrosDeVendedores } from "./vendedores/FiltrosDeVendedores";
import { KpisDeVendedores } from "./vendedores/KpisDeVendedores";
import { GraficosDeVendedores } from "./vendedores/GraficosDeVendedores";
import { TabelaDeVendedores } from "./vendedores/TabelaDeVendedores";

const Vendedores: React.FC = () => {
  const { user } = useAuth();
  const { erro } = useToast();
  const vendedorLogado = user?.username || "";

  // Estados dos filtros
  const [filtroProduto, setFiltroProduto] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [presetPeriodo, setPresetPeriodo] = useState("todos");
  const [filtroCliente, setFiltroCliente] = useState<string[]>([]);

  // Estados da tabela
  const [ordenacao, setOrdenacao] = useState<{
    campo: CampoDeOrdenacao;
    direcao: "asc" | "desc";
  }>({ campo: "data_emissao", direcao: "desc" });
  const [pesquisaTabela, setPesquisaTabela] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  // O preset impõe as duas datas. A conta mora em `lib/periodo.ts`, a mesma
  // que Contas usa: eram cinco cópias byte a byte idênticas deste bloco, e as
  // cinco montavam a data com `toISOString` (UTC) — a partir das 21h de
  // Brasília o "ano atual" virava o ano seguinte.
  useEffect(() => {
    const periodo = periodoDoPreset(presetPeriodo, new Date());
    if (!periodo) return;
    setDataInicio(periodo.inicio);
    setDataFim(periodo.fim);
  }, [presetPeriodo]);

  const { opcoes } = useFiltrosComerciais();

  // Quem é do papel "vendas" vê só as próprias notas. Isso era o `notasVendedor`
  // do contexto, um `includes` do username dentro do nome do vendedor; aqui a
  // mesma continência escolhe QUAIS nomes entram no filtro, e o recorte em si
  // passa a ser do banco. O efeito é idêntico e o navegador deixa de receber as
  // notas dos outros para depois descartá-las — que era, além de trabalho à
  // toa, mandar para a máquina de um vendedor a carteira inteira da empresa.
  const vendedoresDoRecorte = useMemo(
    () => vendedoresDoPapel(user?.role, vendedorLogado, opcoes.vendedores),
    [user?.role, vendedorLogado, opcoes.vendedores],
  );

  const clientesUnicos = useMemo(() => opcoes.clientes.map(rotuloDoCliente), [opcoes.clientes]);

  const produtosUnicos = useMemo(() => opcoesDeProduto(opcoes.produtos), [opcoes.produtos]);

  const idPorRotulo = useMemo(() => idsPorRotulo(opcoes.clientes), [opcoes.clientes]);

  const recorte: RecorteComercial = useMemo(
    () => ({
      clientes: filtroCliente
        .map((r) => idPorRotulo.get(r))
        .filter((id): id is number => id !== undefined),
      vendedores: vendedoresDoRecorte,
      // O multiselect de produto devolve a CHAVE (o `valor` de
      // `opcoesDeProduto`), que é o que o servidor filtra.
      produtos: filtroProduto,
      dataInicio,
      dataFim,
    }),
    [filtroCliente, vendedoresDoRecorte, filtroProduto, dataInicio, dataFim, idPorRotulo],
  );

  const { resumo, carregando } = useResumoComercial(recorte);

  const chaveDoRecorte =
    JSON.stringify(recorte) + pesquisaTabela + JSON.stringify(ordenacao);
  useEffect(() => {
    setPaginaAtual(1);
  }, [chaveDoRecorte]);

  const { pagina } = useVendasPaginadas(recorte, {
    busca: pesquisaTabela,
    ordenarPor: ordenacao.campo,
    direcao: ordenacao.direcao,
    pagina: paginaAtual,
    porPagina: 15,
  });

  // A edição do tipo é otimista sobre a página em memória: recarregar a
  // listagem inteira para mudar uma célula faria a tabela piscar e devolveria
  // a pessoa para o topo.
  const [tiposEditados, setTiposEditados] = useState<Record<number, string>>({});
  const notasPaginadas = useMemo(
    () =>
      pagina.itens.map((n) =>
        tiposEditados[n.id] ? { ...n, tipo: tiposEditados[n.id] as typeof n.tipo } : n,
      ),
    [pagina.itens, tiposEditados],
  );
  const totalDeNotas = pagina.total;

  // KPIs, evolução, top produtos e pizza — a conta pura mora em vendedores.ts.
  const kpis = useMemo(() => kpisDoResumo(resumo), [resumo]);
  const dadosEvolucao = useMemo(
    () => evolucaoDoResumo(resumo.evolucao_mensal),
    [resumo.evolucao_mensal],
  );
  const topProdutos = useMemo(() => topProdutosDoResumo(resumo.por_produto), [resumo.por_produto]);
  const distribuicaoClientes = useMemo(
    () => distribuicaoDeClientes(resumo.por_cliente),
    [resumo.por_cliente],
  );

  const alternarOrdenacao = (campo: CampoDeOrdenacao) => {
    setOrdenacao((prev) => proximaOrdenacao(prev, campo));
  };

  // A gravação do tipo mora na casca, que é quem fala com a rede e com o
  // toast; a tabela cuida do estado da edição. Rejeitar mantém a edição
  // aberta com a escolha, como a tela fazia.
  const salvarTipo = useCallback(
    async (notaId: number, tipo: string) => {
      try {
        await updateNotaTipo(notaId, tipo as "Outbound" | "Inbound" | "ReCompra");
        setTiposEditados((antes) => ({ ...antes, [notaId]: tipo }));
      } catch (error) {
        console.error("Erro ao salvar tipo:", error);
        erro("Não foi possível salvar o tipo da nota.");
        throw error;
      }
    },
    [erro],
  );

  const [exportando, setExportando] = useState(false);

  // Exportação: percorre as páginas até o fim. Exportar só a página visível
  // seria o mesmo erro de ler a primeira página como se fosse o total — só
  // que num arquivo que alguém manda por e-mail.
  const exportarExcel = useCallback(async () => {
    setExportando(true);
    try {
    const porPagina = 500;
    const todas: NotaVenda[] = [];
    let offset = 0;
    for (;;) {
      const resposta = await fetchVendas({
        ...paramsDoRecorte(recorte),
        busca: pesquisaTabela.trim() || undefined,
        ordenar_por: ordenacao.campo,
        direcao: ordenacao.direcao,
        limite: porPagina,
        offset,
      });
      todas.push(...resposta.itens);
      offset += porPagina;
      if (offset >= resposta.total) break;
    }

    baixarPlanilha(
      [{ nome: "Minhas Vendas", linhas: linhasDaPlanilha(todas), ajustar: ajustarFolhaDeVendas }],
      `vendas_${vendedorLogado}_${diaLocal(new Date())}.xlsx`,
    );
    } catch (falha) {
      console.error("Erro ao exportar as vendas:", falha);
      erro("Não foi possível exportar as vendas.");
    } finally {
      setExportando(false);
    }
  }, [recorte, pesquisaTabela, ordenacao, vendedorLogado, erro]);

  // Carregando e o invólucro eram o último `dark:` da casca: `bg-gray-50` com
  // `dark:` por cima e um spinner cru de `<div>` com `border-blue-600`. O
  // `Spinner` do design system é o mesmo anel de Produtos e Serviços.
  if (carregando) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-base px-6 py-16 text-conteudo-muted">
        <Spinner size="lg" />
        <p>Carregando suas vendas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base p-6 transition-colors">
      <CabecalhoDeVendedores usuario={vendedorLogado} papel={user?.role} />

      <div className="mt-6 overflow-x-hidden">
        <FiltrosDeVendedores
          opcoes={{ clientes: clientesUnicos, produtos: produtosUnicos }}
          valores={{
            cliente: filtroCliente,
            produto: filtroProduto,
            presetPeriodo,
            dataInicio,
            dataFim,
          }}
          onCliente={setFiltroCliente}
          onProduto={setFiltroProduto}
          onPreset={setPresetPeriodo}
          onDataInicio={(data) => {
            setDataInicio(data);
            setPresetPeriodo("custom");
          }}
          onDataFim={(data) => {
            setDataFim(data);
            setPresetPeriodo("custom");
          }}
        />

        <KpisDeVendedores kpis={kpis} />

        <GraficosDeVendedores
          evolucao={dadosEvolucao}
          topProdutos={topProdutos}
          distribuicaoClientes={distribuicaoClientes}
        />

        <TabelaDeVendedores
          notas={notasPaginadas}
          total={totalDeNotas}
          pagina={paginaAtual}
          onPagina={setPaginaAtual}
          pesquisa={pesquisaTabela}
          onPesquisar={setPesquisaTabela}
          ordenacao={ordenacao}
          onOrdenar={alternarOrdenacao}
          onExportar={exportarExcel}
          onSalvarTipo={salvarTipo}
        />
      </div>
    </div>
  );
};

export default Vendedores;