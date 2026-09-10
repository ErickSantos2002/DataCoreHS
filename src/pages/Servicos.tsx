import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  usePaginaDeServicos,
  useResumoDeServicos,
  todosOsServicos,
  type PedidoDaTabelaDeServicos,
  type RecorteDeServicos,
} from "./servicos/useServicos";
import { PRESETS_DE_PERIODO, periodoDoPreset } from "../lib/periodo";
import ModalObservacoes from "../components/ModalObservacoes";
import {
  MultiSelect,
  Pagination,
  TableEmpty,
  deTextos,
  buscaPorTextoOuNumero,
} from "../design-system/ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  DollarSign,
  FileText,
  TrendingUp,
  Star,
  Filter,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
  Calendar,
  MapPin,
  Building,
} from "lucide-react";
import { diaLocal } from "../lib/datas";
import { baixarPlanilha } from "../lib/planilha";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Cores para gráficos
const CORES = {
  azul: "#2563eb",
  verde: "#10b981",
  roxo: "#8b5cf6",
  laranja: "#f97316",
  vermelho: "#ef4444",
  amarelo: "#eab308",
  rosa: "#ec4899",
  cyan: "#06b6d4",
};

const CORES_GRAFICO = [
  CORES.azul,
  CORES.verde,
  CORES.roxo,
  CORES.laranja,
  CORES.vermelho,
  CORES.amarelo,
  CORES.rosa,
  CORES.cyan,
];

const Servicos: React.FC = () => {
  const { user } = useAuth();

  // Estados dos filtros
  const [filtroCliente, setFiltroCliente] = useState<string[]>([]);
  const [filtroCidade, setFiltroCidade] = useState<string[]>([]);
  const [filtroTipoServico, setFiltroTipoServico] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [presetPeriodo, setPresetPeriodo] = useState("todos");
  const [observacoesSelecionadas, setObservacoesSelecionadas] = useState<string | null>(null);

  // Estados da tabela
  const [ordenacao, setOrdenacao] = useState<{
    campo: PedidoDaTabelaDeServicos["ordenarPor"];
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

  const recorte: RecorteDeServicos = useMemo(
    () => ({
      clientes: filtroCliente,
      cidades: filtroCidade,
      tipos: filtroTipoServico,
      dataInicio,
      dataFim,
    }),
    [filtroCliente, filtroCidade, filtroTipoServico, dataInicio, dataFim],
  );

  const { resumo, carregando } = useResumoDeServicos(recorte);

  // Voltar para a página 1 quando o recorte, a busca ou a ordem mudam: quem
  // estava na página 12 de um filtro amplo ficaria olhando página vazia.
  const chaveDoRecorte =
    JSON.stringify(recorte) + pesquisaTabela + JSON.stringify(ordenacao);
  useEffect(() => {
    setPaginaAtual(1);
  }, [chaveDoRecorte]);

  const { pagina } = usePaginaDeServicos(recorte, {
    busca: pesquisaTabela,
    ordenarPor: ordenacao.campo,
    direcao: ordenacao.direcao,
    pagina: paginaAtual,
    porPagina: 15,
  });

  const servicosPaginados = pagina.itens;
  const totalDeServicos = pagina.total;

  // As opções dos multiselects vêm do banco, e não de percorrer as notas.
  const clientesUnicos = useMemo(() => resumo.opcoes.clientes, [resumo.opcoes.clientes]);
  const cidadesUnicas = useMemo(() => resumo.opcoes.cidades, [resumo.opcoes.cidades]);
  const tiposServicoUnicos = useMemo(() => resumo.opcoes.tipos, [resumo.opcoes.tipos]);

  // KPIs — somados pelo banco sobre o recorte inteiro.
  const kpis = useMemo(() => {
    const topo = resumo.por_cliente[0];
    return {
      totalFaturado: resumo.kpis.faturamento,
      totalServicos: resumo.kpis.notas,
      ticketMedio: resumo.kpis.ticket_medio,
      topCliente: topo ? { nome: topo.nome, valor: topo.valor } : null,
    };
  }, [resumo]);

  // Evolução: o banco devolve uma linha por mês com nota; o rótulo e a troca
  // para escala anual acima de 24 meses continuam sendo decisão da tela.
  const evolucaoMensal = useMemo(() => {
    const dadosMensais = resumo.evolucao_mensal.map((m) => {
      const data = new Date(m.ano, m.mes - 1);
      return {
        mes: data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
        total: m.total,
        ordem: data.getTime(),
        ano: m.ano,
      };
    });

    if (dadosMensais.length > 24) {
      const agrupadoAnual = dadosMensais.reduce((acc: Record<number, number>, item) => {
        if (!acc[item.ano]) acc[item.ano] = 0;
        acc[item.ano] += item.total;
        return acc;
      }, {});

      return Object.entries(agrupadoAnual)
        .map(([ano, total]) => ({
          mes: ano.toString(),
          total,
          ordem: new Date(Number(ano), 0).getTime(),
        }))
        .sort((a, b) => a.ordem - b.ordem);
    }

    return dadosMensais;
  }, [resumo.evolucao_mensal]);

  // Ranking de clientes (Top 10) — já vem ordenado por valor do banco.
  const rankingClientes = useMemo(
    () =>
      resumo.por_cliente.slice(0, 10).map((c) => ({
        cliente: c.nome.length > 20 ? c.nome.substring(0, 20) + "..." : c.nome,
        clienteCompleto: c.nome,
        valor: c.valor,
      })),
    [resumo.por_cliente],
  );

  // Distribuição por cidade — as dez maiores.
  const distribuicaoCidades = useMemo(
    () => resumo.por_cidade.slice(0, 10).map((c) => ({ name: c.nome, value: c.valor })),
    [resumo.por_cidade],
  );




  // Formatação de valores
  const formatarValorAbreviado = (valor: number) => {
    if (valor >= 1_000_000) {
      return `R$ ${(valor / 1_000_000).toFixed(1)}M`;
    } else if (valor >= 1_000) {
      return `R$ ${(valor / 1_000).toFixed(1)}K`;
    }
    return `R$ ${valor.toFixed(2)}`;
  };

  // Função para alternar ordenação
  const alternarOrdenacao = (campo: PedidoDaTabelaDeServicos["ordenarPor"]) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'desc' ? 'asc' : 'desc'
    }));
  };

  const [exportando, setExportando] = useState(false);

  /** O recorte inteiro, e não a página visível — a planilha e o PDF sempre
   *  levaram a lista filtrada toda. */
  const buscarTudo = useCallback(
    () =>
      todosOsServicos(recorte, {
        busca: pesquisaTabela,
        ordenarPor: ordenacao.campo,
        direcao: ordenacao.direcao,
      }),
    [recorte, pesquisaTabela, ordenacao],
  );

  // Exportação para Excel
  const exportarExcel = useCallback(async () => {
    setExportando(true);
    try {
    const dadosExport = (await buscarTudo()).map(s => ({
      'Número NFS-e': s.numero_nfse,
      'Cliente': s.razao_social_tomador,
      'CNPJ/CPF': s.cpf_cnpj_tomador,
      'Data Emissão': new Date(s.data_emissao).toLocaleDateString('pt-BR'),
      'Cidade': `${s.cidade_tomador}/${s.uf_tomador}`,
      'Valor': s.valor_servico,
      'Descrição': s.discriminacao_servico
    }));

    baixarPlanilha(
      [{ nome: "Serviços", linhas: dadosExport }],
      `servicos_${diaLocal(new Date())}.xlsx`,
    );
    } catch (falha) {
      console.error("Erro ao exportar os serviços:", falha);
    } finally {
      setExportando(false);
    }
  }, [buscarTudo]);

  // Exportação para PDF
  const exportarPDF = useCallback(async () => {
    setExportando(true);
    try {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(16);
    doc.text("Relatório de Serviços", 14, 20);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
    doc.text(`Usuário: ${user?.username}`, 14, 34);

    // Dados para tabela
    const dadosTabela = (await buscarTudo()).slice(0, 30).map(s => [
      s.numero_nfse,
      s.razao_social_tomador.substring(0, 25),
      new Date(s.data_emissao).toLocaleDateString('pt-BR'),
      `R$ ${s.valor_servico.toFixed(2)}`,
      `${s.cidade_tomador}/${s.uf_tomador}`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["NFS-e", "Cliente", "Data", "Valor", "Cidade"]],
      body: dadosTabela,
    });

    doc.save(`servicos_${diaLocal(new Date())}.pdf`);
    } catch (falha) {
      console.error("Erro ao exportar o PDF dos serviços:", falha);
    } finally {
      setExportando(false);
    }
  }, [buscarTudo, user]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-surface-base">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Carregando dados de serviços...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-surface-base transition-colors">
      <div className="p-6">
        {/* Cabeçalho */}
        <div className="bg-white dark:bg-surface shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl transition-colors">
          <div className="px-6 py-4">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-yellow-400">
              Serviços - Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Bem-vindo, <span className="font-semibold">{user?.username}</span> ({user?.role})
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              Acompanhe o faturamento de serviços, principais clientes e evolução das NFS-e.
            </p>
          </div>
        </div>

        <div className="mt-6">
          {/* Filtros */}
          <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-4 mb-6 transition-colors">
            <div className="flex items-center mb-4">
              <Filter className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-300" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Filtros
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Cliente (Tomador) */}
              <div>
                <MultiSelect
                  rotulo="Cliente (Tomador)"
                  opcoes={deTextos(clientesUnicos)}
                  selecionados={filtroCliente}
                  onChange={setFiltroCliente}
                  placeholder="Todos os clientes"
                  buscarPor={buscaPorTextoOuNumero}
                />
              </div>

              {/* Cidade do Serviço */}
              <div>
                <MultiSelect
                  rotulo="Cidade do Serviço"
                  opcoes={deTextos(cidadesUnicas)}
                  selecionados={filtroCidade}
                  onChange={setFiltroCidade}
                  placeholder="Todas as cidades"
                  buscarPor={buscaPorTextoOuNumero}
                />
              </div>

              {/* Tipo de Serviço */}
              <div>
                <MultiSelect
                  rotulo="Tipo de Serviço"
                  opcoes={deTextos(tiposServicoUnicos)}
                  selecionados={filtroTipoServico}
                  onChange={setFiltroTipoServico}
                  placeholder="Todos os tipos"
                  buscarPor={buscaPorTextoOuNumero}
                />
              </div>

              {/* Período */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Período
                </label>
                <select
                  value={presetPeriodo}
                  onChange={(e) => setPresetPeriodo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg 
                            bg-white text-gray-800
                            dark:bg-surface dark:text-white
                            border-gray-300 dark:border-gray-600
                            focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PRESETS_DE_PERIODO.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data Início */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Início
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => {
                    setDataInicio(e.target.value);
                    setPresetPeriodo("custom");
                  }}
                  className="w-full px-3 py-2 border rounded-lg 
                            bg-white text-gray-800
                            dark:bg-surface dark:text-white
                            border-gray-300 dark:border-gray-600
                            focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Data Fim */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fim
                </label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => {
                    setDataFim(e.target.value);
                    setPresetPeriodo("custom");
                  }}
                  className="w-full px-3 py-2 border rounded-lg 
                            bg-white text-gray-800
                            dark:bg-surface dark:text-white
                            border-gray-300 dark:border-gray-600
                            focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Faturamento Total */}
            <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Faturamento Total</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-yellow-300 mt-2">
                    R$ {kpis.totalFaturado.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-full">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {/* Número de NFS-e */}
            <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">NFS-e Emitidas</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                    {kpis.totalServicos}
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/40 p-3 rounded-full">
                  <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            {/* Ticket Médio */}
            <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Ticket Médio</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                    R$ {kpis.ticketMedio.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900/40 p-3 rounded-full">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            {/* Top Cliente */}
            <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Top Cliente</p>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-2 truncate 
                                max-w-[180px] overflow-hidden whitespace-nowrap"
                     title={kpis.topCliente?.nome || "N/A"}>
                    {kpis.topCliente?.nome || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {kpis.topCliente ? formatarValorAbreviado(kpis.topCliente.valor) : "R$ 0"}
                  </p>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900/40 p-3 rounded-full">
                  <Star className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Evolução dos Serviços */}
            <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Evolução dos Serviços Emitidos
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={evolucaoMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    axisLine={{ stroke: "#374151" }}
                  />
                  <YAxis
                    tickFormatter={(value) => formatarValorAbreviado(value)}
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    axisLine={{ stroke: "#374151" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: document.documentElement.classList.contains("dark")
                        ? "#1e293b"
                        : "#ffffff",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: document.documentElement.classList.contains("dark")
                        ? "#f9fafb"
                        : "#111827",
                    }}
                    formatter={(value: number) => formatarValorAbreviado(value)}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#60a5fa", r: 4 }}
                    activeDot={{ r: 6, fill: "#2563eb" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Ranking de Clientes */}
            <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Top 10 Clientes
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rankingClientes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatarValorAbreviado(value)}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    type="category"
                    dataKey="cliente"
                    width={140}
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const { clienteCompleto, valor } = payload[0].payload;
                        const isDark = document.documentElement.classList.contains("dark");

                        return (
                          <div
                            style={{
                              backgroundColor: isDark ? "#1e293b" : "#ffffff",
                              border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`,
                              borderRadius: "8px",
                              padding: "8px 12px",
                              maxWidth: "250px",
                              whiteSpace: "normal",
                              wordWrap: "break-word",
                              color: isDark ? "#f9fafb" : "#111827",
                            }}
                          >
                            <p style={{ fontWeight: 600, marginBottom: "4px" }}>
                              {clienteCompleto}
                            </p>
                            <p style={{ color: isDark ? "#38bdf8" : "#0284c7" }}>
                              Valor: R$ {Number(valor).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="valor" fill={CORES.azul} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Distribuição por Cidade */}
            <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Distribuição por Cidade do Serviço
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distribuicaoCidades}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent = 0 }) => {
                      const nomeCortado = name.length > 15 ? `${name.substring(0, 15)}...` : name;
                      return `${nomeCortado} ${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distribuicaoCidades.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CORES_GRAFICO[index % CORES_GRAFICO.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatarValorAbreviado(value)}
                    contentStyle={{
                      backgroundColor: document.documentElement.classList.contains("dark")
                        ? "#1f2937"
                        : "#ffffff",
                      color: document.documentElement.classList.contains("dark")
                        ? "#f9fafb"
                        : "#111827",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela de Serviços */}
          <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 md:mb-0">
                Detalhamento de Serviços
              </h3>

              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                {/* Campo de pesquisa */}
                <div className="relative flex-1 md:flex-initial">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 
                                    w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Pesquisar..."
                    value={pesquisaTabela}
                    onChange={(e) => setPesquisaTabela(e.target.value)}
                    className="pl-10 pr-3 py-2 w-full md:w-64 rounded-lg border 
                              focus:outline-none focus:ring-2 focus:ring-blue-500
                              bg-white dark:bg-surface
                              text-gray-800 dark:text-gray-200
                              border-gray-300 dark:border-gray-600
                              placeholder-gray-400 dark:placeholder-gray-500
                              transition-colors"
                  />
                </div>

                {/* Botões de exportação */}
                <button
                  onClick={exportarExcel}
                  className="flex items-center justify-center px-4 py-2 
                            bg-green-600 text-white rounded-lg 
                            hover:bg-green-700 dark:hover:bg-green-500 
                            transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </button>

                <button
                  onClick={exportarPDF}
                  className="flex items-center justify-center px-4 py-2 
                            bg-blue-600 text-white rounded-lg 
                            hover:bg-blue-700 dark:hover:bg-blue-500 
                            transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </button>
              </div>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-surface"
                      onClick={() => alternarOrdenacao("numero")}
                    >
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Número NFS-e
                        </span>
                        {ordenacao.campo === "numero" &&
                          (ordenacao.direcao === "desc" ? (
                            <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-surface"
                      onClick={() => alternarOrdenacao("cliente")}
                    >
                      <div className="flex items-center">
                        <Building className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Cliente (Tomador)
                        </span>
                        {ordenacao.campo === "cliente" &&
                          (ordenacao.direcao === "desc" ? (
                            <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-surface"
                      onClick={() => alternarOrdenacao("data_emissao")}
                    >
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Data Emissão
                        </span>
                        {ordenacao.campo === "data_emissao" &&
                          (ordenacao.direcao === "desc" ? (
                            <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-surface"
                      onClick={() => alternarOrdenacao("cidade")}
                    >
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Cidade/UF
                        </span>
                        {ordenacao.campo === "cidade" &&
                          (ordenacao.direcao === "desc" ? (
                            <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-surface"
                      onClick={() => alternarOrdenacao("valor")}
                    >
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Valor
                        </span>
                        {ordenacao.campo === "valor" &&
                          (ordenacao.direcao === "desc" ? (
                            <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ))}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Descrição
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {servicosPaginados.length === 0 ? (
                    // Pagination some com total zero; sem isso a tabela ficava
                    // muda no filtro sem resultado (defeito 2 do spec).
                    <TableEmpty colSpan={6} />
                  ) : (
                    servicosPaginados.map((servico, index) => (
                    <tr
                      key={servico.id}
                      className={`border-b border-gray-100 dark:border-gray-700 
                                  hover:bg-gray-50 dark:hover:bg-surface transition-colors ${
                                    index % 2 === 0
                                      ? "bg-white dark:bg-surface"
                                      : "bg-gray-50/50 dark:bg-surface"
                                  }`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {servico.numero_nfse}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {servico.razao_social_tomador}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {servico.cpf_cnpj_tomador}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {servico.data_emissao.split("-").reverse().join("/")}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {servico.cidade_tomador}/{servico.uf_tomador}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          R$ {servico.valor_servico.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {servico.discriminacao_servico ? (
                          <button
                            onClick={() => setObservacoesSelecionadas(servico.discriminacao_servico)}
                            className="px-3 py-1 text-sm font-medium rounded-full 
                                      bg-blue-100 text-blue-700 
                                      dark:bg-blue-900 dark:text-blue-300 
                                      hover:bg-blue-200 dark:hover:bg-blue-800 
                                      transition-colors whitespace-nowrap"
                          >
                            Ver Observações
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    ))
                  )}
                  {observacoesSelecionadas && (
                    <ModalObservacoes
                      observacoes={observacoesSelecionadas}
                      onClose={() => setObservacoesSelecionadas(null)}
                    />
                  )}
                </tbody>
              </table>
            </div>

            {/*
              O `Pagination` do design system, e não as 104 linhas que estavam
              aqui. As que saíram escondiam a frase de contagem dentro do
              `{totalPaginas > 1 && ...}`: quem tinha 15 serviços ou menos não
              lia contagem nenhuma. É o mesmo defeito 1.7 que a Fase 1 corrigiu
              em Contas, e ele morre junto com o bloco.
            */}
            <div className="mt-4">
              <Pagination
                page={paginaAtual}
                pageSize={15}
                total={totalDeServicos}
                itemLabel="serviços"
                onPageChange={setPaginaAtual}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Servicos;