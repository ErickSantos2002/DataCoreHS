import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  paramsDoRecorte,
  useFiltrosComerciais,
  useResumoComercial,
  useVendasPaginadas,
  type CampoDeOrdenacao,
  type RecorteComercial,
} from "./comercial/useComercial";
import { fetchVendas, type NotaVenda } from "../services/notasapi";
import ModalObservacoesDaNota from "../components/ModalObservacoesDaNota";
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
  Legend,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Package,
  Calendar,
  Filter,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
  Users,
} from "lucide-react";
import { diaLocal } from "../lib/datas";
import { PRESETS_DE_PERIODO, periodoDoPreset } from "../lib/periodo";
import { baixarPlanilha } from "../lib/planilha";
import {
  MultiSelect,
  Pagination,
  TableEmpty,
  deTextos,
  buscaPorCnpjEntreParenteses,
} from "../design-system/ui";

// Cores padrão para gráficos
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

// 🎨 Novas cores para o gráfico de pizza (tons de azul/cinza)
  const CORES_PIZZA = [
    "#3b82f6", // azul médio
    "#60a5fa", // azul claro
    "#1e40af", // azul escuro
    "#1d4ed8", // azul forte
    "#0ea5e9", // azul/ciano
    "#475569", // cinza-ardósia
    "#64748b", // cinza claro
    "#94a3b8", // cinza mais suave
];

const Vendas: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Estados dos filtros. Continuam guardando o RÓTULO que o multiselect
  // mostra; o id do cliente e o código do produto saem do mapa montado a
  // partir das opções — é o que permite trocar a chave que vai para a API sem
  // mexer em nada do que a pessoa vê.
  const [filtroEmpresa, setFiltroEmpresa] = useState<string[]>([]);
  const [filtroVendedor, setFiltroVendedor] = useState<string[]>([]);
  const [filtroProduto, setFiltroProduto] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [presetPeriodo, setPresetPeriodo] = useState("todos");

  // Estados da tabela
  const [ordenacao, setOrdenacao] = useState<{
    campo: CampoDeOrdenacao;
    direcao: "asc" | "desc";
  }>({ campo: "data_emissao", direcao: "desc" });
  const [pesquisaTabela, setPesquisaTabela] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  // O ID basta: o texto das observações é buscado pelo modal ao abrir.
  const [notaDasObservacoes, setNotaDasObservacoes] = useState<number | null>(
    null,
  );

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

  // As opções dos multiselects vêm do banco, e não de percorrer as notas: era
  // por causa delas (e das agregações) que a tela baixava o histórico inteiro.
  const { opcoes } = useFiltrosComerciais();

  const rotuloDoCliente = (c: { nome: string | null; cpf_cnpj: string | null }) =>
    `${c.nome} (${c.cpf_cnpj})`;

  const empresasUnicas = useMemo(
    () => opcoes.clientes.map(rotuloDoCliente),
    [opcoes.clientes],
  );
  const vendedoresUnicos = useMemo(() => opcoes.vendedores, [opcoes.vendedores]);
  const produtosUnicos = useMemo(
    () => opcoes.produtos.map((p) => `${p.descricao} (${p.codigo ?? "sem código"})`),
    [opcoes.produtos],
  );

  // Rótulo -> chave que a API entende. O rótulo continua sendo o que a pessoa
  // lê e o que fica no estado; a chave é o que recorta no banco.
  const idPorRotulo = useMemo(() => {
    const mapa = new Map<string, number>();
    opcoes.clientes.forEach((c) => mapa.set(rotuloDoCliente(c), c.id));
    return mapa;
  }, [opcoes.clientes]);

  const chavePorRotulo = useMemo(() => {
    const mapa = new Map<string, string>();
    opcoes.produtos.forEach((p) =>
      mapa.set(`${p.descricao} (${p.codigo ?? "sem código"})`, p.chave),
    );
    return mapa;
  }, [opcoes.produtos]);

  const recorte: RecorteComercial = useMemo(
    () => ({
      clientes: filtroEmpresa
        .map((r) => idPorRotulo.get(r))
        .filter((id): id is number => id !== undefined),
      vendedores: filtroVendedor,
      produtos: filtroProduto
        .map((r) => chavePorRotulo.get(r))
        .filter((c): c is string => c !== undefined),
      dataInicio,
      dataFim,
    }),
    [filtroEmpresa, filtroVendedor, filtroProduto, dataInicio, dataFim, idPorRotulo, chavePorRotulo],
  );

  const { resumo, carregando } = useResumoComercial(recorte);

  // Voltar para a página 1 quando o recorte muda: quem estava na página 12 de
  // um filtro amplo ficaria olhando uma página vazia depois de estreitá-lo.
  const chaveDoRecorte = JSON.stringify(recorte) + pesquisaTabela + JSON.stringify(ordenacao);
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

  const notasPaginadas = pagina.itens;
  const totalDeNotas = pagina.total;

  // KPIs — os mesmos quatro números, agora somados pelo banco sobre o recorte
  // inteiro. `produtoMaisVendido` é o topo do ranking de produto, que já vem
  // ordenado por valor.
  const kpis = useMemo(() => {
    const topo = resumo.por_produto[0];
    return {
      totalFaturado: resumo.kpis.faturamento,
      totalVendas: resumo.kpis.notas,
      ticketMedio: resumo.kpis.ticket_medio,
      produtoMaisVendido: topo
        ? { nome: topo.descricao ?? "N/A", valor: topo.valor }
        : null,
    };
  }, [resumo]);

  // Evolução: o banco devolve uma linha por mês com venda; o rótulo e a troca
  // para escala anual acima de 24 meses continuam sendo decisão da tela.
  const dadosEvolucao: { mes: string; total: number; ordem: number }[] = useMemo(() => {
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

  // ⚠️ O ranking de produto passou a agrupar por CÓDIGO, e não pela grafia da
  // descrição. Medido em 2026-09-09: o mesmo produto aparecia repartido em até
  // oito grafias, e o Top 5 mostrava produto errado por causa disso — o quinto
  // lugar era um item que fatura menos que o MARK X PLUS, que estava dividido.
  const rankingProdutos = useMemo(
    () =>
      resumo.por_produto.slice(0, 5).map((p) => ({
        produto: p.descricao ?? "Sem descrição",
        valor: p.valor,
      })),
    [resumo.por_produto],
  );

  const rankingVendedores = useMemo(
    () =>
      resumo.por_vendedor.slice(0, 5).map((v) => ({
        vendedor: v.nome,
        valor: v.valor,
      })),
    [resumo.por_vendedor],
  );

  // Top 8 por cliente. Agrupado pelo documento, e não pelo nome: dois cadastros
  // do mesmo CNPJ apareciam como duas fatias da pizza.
  const distribuicaoEmpresas = useMemo(
    () =>
      resumo.por_cliente.slice(0, 8).map((c) => ({
        name: c.nome ?? "Não informado",
        value: c.valor,
      })),
    [resumo.por_cliente],
  );

  // Formatação de valores
  const formatarValorAbreviado = (valor: number) => {
    if (valor >= 1_000_000) {
      return `R$ ${(valor / 1_000_000).toFixed(1)}M`;
    } else if (valor >= 1_000) {
      return `R$ ${(valor / 1_000).toFixed(1)}K`;
    }
    return `R$ ${valor}`;
  };

  // Função para alternar ordenação
  const alternarOrdenacao = (campo: CampoDeOrdenacao) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'desc' ? 'asc' : 'desc'
    }));
  };

  const [exportando, setExportando] = useState(false);

  // Exportação: percorre as páginas até o fim, em vez de exportar o que está na
  // tela. Com a lista inteira em memória isso era um `map`; agora a planilha
  // precisa pedir o resto — e exportar só a página visível seria o mesmo erro
  // de ler a primeira página como se fosse o total, só que num arquivo que
  // alguém manda por e-mail.
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

      const dadosExport = todas.map(n => ({
        'Data': new Date(n.data_emissao).toLocaleDateString('pt-BR'),
        'Cliente': n.cliente?.nome || '',
        'CNPJ': n.cliente?.cpf_cnpj || '',
        'Valor': n.valor_nota,
        'Vendedor': n.nome_vendedor || '',
        'Produtos': n.itens?.map(i => i.descricao).join(', ') || ''
      }));

      baixarPlanilha(
        [{ nome: "Vendas", linhas: dadosExport }],
        `vendas_${diaLocal(new Date())}.xlsx`,
      );
    } catch (falha) {
      console.error("Erro ao exportar as vendas:", falha);
    } finally {
      setExportando(false);
    }
  }, [recorte, pesquisaTabela, ordenacao]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-surface-base transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Carregando dados de vendas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-surface-base transition-colors">
    {/* Cabeçalho */}
    <div className="bg-white dark:bg-surface shadow-sm rounded-xl">
      <div className="px-6 py-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-yellow-400">
          Vendas - Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-200 mt-1">
          Bem-vindo, <span className="font-semibold">{user?.username}</span> ({user?.role})
        </p>
        <p className="text-gray-500 dark:text-gray-300 text-sm mt-2">
          Acompanhe as principais métricas, evolução e detalhes das vendas em tempo real.
        </p>
      </div>
    </div>

      <div className="mt-6 overflow-x-hidden">
        {/* Filtros */}
        <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-4 mb-6 border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Filtros
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Empresas */}
            <div>
              <MultiSelect
                rotulo="Empresas"
                opcoes={deTextos(empresasUnicas)}
                selecionados={filtroEmpresa}
                onChange={setFiltroEmpresa}
                placeholder="Todas as empresas"
                buscarPor={buscaPorCnpjEntreParenteses}
              />
            </div>

            {/* Vendedores */}
            <div>
              <MultiSelect
                rotulo="Vendedores"
                opcoes={deTextos(vendedoresUnicos)}
                selecionados={filtroVendedor}
                onChange={setFiltroVendedor}
                placeholder="Todos os vendedores"
                buscarPor={buscaPorCnpjEntreParenteses}
              />
            </div>

            {/* Produtos */}
            <div>
              <MultiSelect
                rotulo="Produtos"
                opcoes={deTextos(produtosUnicos)}
                selecionados={filtroProduto}
                onChange={setFiltroProduto}
                placeholder="Todos os produtos"
                buscarPor={buscaPorCnpjEntreParenteses}
              />
            </div>

            {/* Preset de Período */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Período Rápido
              </label>
              <select
                value={presetPeriodo}
                onChange={(e) => setPresetPeriodo(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-surface-base 
                          dark:text-gray-200 dark:border-gray-600 
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
                Data Início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  setPresetPeriodo("custom");
                }}
                className="w-full px-3 py-2 border rounded-lg 
                          bg-white dark:bg-surface-base dark:text-gray-200 dark:border-gray-600 
                          focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Data Fim */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => {
                  setDataFim(e.target.value);
                  setPresetPeriodo("custom");
                }}
                className="w-full px-3 py-2 border rounded-lg 
                          bg-white dark:bg-surface-base dark:text-gray-200 dark:border-gray-600 
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Faturamento Total</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-yellow-300 mt-2">
                  R$ {kpis.totalFaturado.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-yellow-300" />
              </div>
            </div>
          </div>

          {/* Número de Vendas */}
          <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Número de Vendas</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {kpis.totalVendas}
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                <ShoppingCart className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Ticket Médio */}
          <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ticket Médio</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  R$ {kpis.ticketMedio.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Produto Mais Vendido */}
          <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div className="min-w-0"> {/* 🔥 garante que o truncate funcione */}
                <p className="text-sm text-gray-600 dark:text-gray-400">Produto Top</p>
                <p
                  className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-2 truncate max-w-[180px]" 
                  title={kpis.produtoMaisVendido?.nome || "N/A"} // Tooltip com o nome completo
                >
                  {kpis.produtoMaisVendido?.nome || "N/A"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  R$ {kpis.produtoMaisVendido?.valor?.toLocaleString("pt-BR") || "0"}
                </p>
              </div>
              <div className="flex-shrink-0 bg-orange-100 dark:bg-orange-900 p-3 rounded-full">
                <Package className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Evolução das Vendas */}
          <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Evolução das Vendas
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosEvolucao}>
                {/* Grid */}
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-axis)" />

                {/* Eixo X */}
                <XAxis
                  dataKey="mes"
                  tick={{ fill: "var(--chart-text)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--chart-axis)" }}
                />

                {/* Eixo Y */}
                <YAxis
                  tickFormatter={(value) => formatarValorAbreviado(value)}
                  tick={{ fill: "var(--chart-text)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--chart-axis)" }}
                />

                {/* Tooltip */}
                <Tooltip
                  contentStyle={{
                    backgroundColor: document.documentElement.classList.contains("dark")
                      ? "#1e293b" // fundo escuro no dark
                      : "#ffffff", // fundo claro no light
                    border: "1px solid var(--chart-axis)",
                    borderRadius: "8px",
                    color: "var(--chart-text)",
                  }}
                  itemStyle={{
                    color: document.documentElement.classList.contains("dark")
                      ? "#60a5fa"
                      : "#2563eb", // azul diferente no claro
                  }}
                  labelStyle={{
                    color: document.documentElement.classList.contains("dark")
                      ? "#f9fafb"
                      : "#111827",
                  }}
                  formatter={(value: number) => formatarValorAbreviado(value)}
                />

                {/* Linha */}
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

          {/* Ranking de Produtos */}
          <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Top 5 Produtos
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rankingProdutos} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-axis)" />

                <XAxis
                  dataKey="produto"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fill: "var(--chart-text)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--chart-axis)" }}
                  tickFormatter={(value) =>
                    value.length > 15 ? value.substring(0, 15) + "..." : value
                  }
                />

                <YAxis
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}
                      textAnchor="end"
                      fontSize={11}
                      fill="var(--chart-text)"
                    >
                      {formatarValorAbreviado(payload.value)}
                    </text>
                  )}
                  axisLine={{ stroke: "var(--chart-axis)" }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const { produto, valor } = payload[0].payload;
                      return (
                        <div
                          style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                            color: "#111827",
                            padding: "8px 12px",
                            maxWidth: "200px",   // 🔥 reduz largura
                            whiteSpace: "normal", // 🔥 permite quebra automática
                            wordBreak: "break-word", // 🔥 força quebrar se passar limite
                          }}
                        >
                          <p style={{ fontWeight: 600, marginBottom: "4px" }}>
                            {produto}
                          </p>
                          <p style={{ color: "#16a34a", fontSize: "14px" }}>
                            valor: <br /> {/* 🔥 quebra de linha garantida */}
                            <span style={{ fontWeight: 600 }}>
                              R$ {valor.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="valor" fill={CORES.laranja} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Ranking de Vendedores */}
          <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Top 5 Vendedores
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={rankingVendedores}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 10, bottom: 10 }} // reduzi left
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  type="number"
                  tickFormatter={(value) => formatarValorAbreviado(value)}
                  stroke="#9ca3af"
                />
                <YAxis
                  type="category"
                  dataKey="vendedor"
                  width={isMobile ? 80 : 140} // 🔥 mais compacto no mobile
                  tick={{ fontSize: isMobile ? 9 : 12 }}
                  tickFormatter={(name: string) =>
                    isMobile
                      ? name.length > 8 ? `${name.substring(0, 8)}...` : name
                      : name.length > 15 ? `${name.substring(0, 15)}...` : name
                  }
                  stroke="#9ca3af"
                />
                <Tooltip
                  content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const { vendedor, valor } = payload[0].payload;
                    return (
                      <div
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #d1d5db",
                          borderRadius: "8px",
                          color: "#111827",
                          padding: "8px 12px",
                          maxWidth: "240px",
                          wordWrap: "break-word",
                          whiteSpace: "normal",
                        }}
                      >
                        <p style={{ fontWeight: 600, marginBottom: "6px" }}>
                          {vendedor}
                        </p>
                        <p style={{ color: "#10b981", fontSize: "14px", lineHeight: "1.4" }}>
                          valor: <br /> {/* 🔥 quebra de linha */}
                          <span style={{ fontWeight: 600 }}>
                            R$ {valor.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
                <Bar dataKey="valor" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuição por Empresa */}
          <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Distribuição por Empresa
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribuicaoEmpresas}
                  cx="50%"
                  cy="50%"
                  label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distribuicaoEmpresas.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CORES_GRAFICO[index % CORES_GRAFICO.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const { name, value } = payload[0].payload;
                      return (
                        <div
                          style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                            color: "#111827",
                            padding: "8px 12px",
                            maxWidth: "260px",
                            whiteSpace: "normal",
                            wordWrap: "break-word",
                          }}
                        >
                          <p style={{ fontWeight: 600, marginBottom: "4px" }}>{name}</p>
                          <p style={{ color: "#0284c7" }}>
                            valor: {formatarValorAbreviado(value)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela de Últimas Vendas */}
        <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 md:mb-0">
              Detalhamento de Vendas
            </h3>

            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              {/* Campo de pesquisa */}
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-300" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={pesquisaTabela}
                  onChange={(e) => setPesquisaTabela(e.target.value)}
                  className="pl-10 pr-3 py-2 border rounded-lg w-full md:w-64 
                            bg-white dark:bg-slate-800 
                            text-gray-800 dark:text-gray-200 
                            border-gray-300 dark:border-gray-600
                            focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Botão de exportação */}
              <button
                onClick={exportarExcel}
                className="flex items-center justify-center px-4 py-2 
                          bg-green-600 text-white rounded-lg 
                          hover:bg-green-700 dark:hover:bg-green-500
                          transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </button>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {/* Data */}
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => alternarOrdenacao("data_emissao")}
                  >
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Data
                      </span>
                      {ordenacao.campo === "data_emissao" &&
                        (ordenacao.direcao === "desc" ? (
                          <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ) : (
                          <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ))}
                    </div>
                  </th>

                  {/* Cliente */}
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => alternarOrdenacao("cliente")}
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Cliente
                      </span>
                      {ordenacao.campo === "cliente" &&
                        (ordenacao.direcao === "desc" ? (
                          <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ) : (
                          <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ))}
                    </div>
                  </th>

                  {/* Valor */}
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => alternarOrdenacao("valor")}
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Valor
                      </span>
                      {ordenacao.campo === "valor" &&
                        (ordenacao.direcao === "desc" ? (
                          <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ) : (
                          <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ))}
                    </div>
                  </th>

                  {/* Vendedor */}
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => alternarOrdenacao("vendedor")}
                  >
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Vendedor
                      </span>
                      {ordenacao.campo === "vendedor" &&
                        (ordenacao.direcao === "desc" ? (
                          <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ) : (
                          <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ))}
                    </div>
                  </th>

                  {/* Produtos */}
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Produtos
                      </span>
                    </div>
                  </th>

                  {/* Observações */}
                  <th className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Observações
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {notasPaginadas.length === 0 ? (
                  // Pagination some com total zero; sem isso a tabela ficava
                  // muda no filtro sem resultado (defeito 2 do spec).
                  <TableEmpty colSpan={6} />
                ) : (
                  notasPaginadas.map((nota, index) => (
                  <tr
                    key={nota.id}
                    className={`border-b border-gray-100 dark:border-gray-700 transition-colors 
                      ${
                        index % 2 === 0
                          ? "bg-white dark:bg-slate-800"
                          : "bg-gray-50/50 dark:bg-slate-900"
                      } hover:bg-gray-50 dark:hover:bg-slate-700`}
                  >
                    {/* Data */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {nota.data_emissao.split("-").reverse().join("/")}
                    </td>

                    {/* Cliente */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                        {nota.cliente?.nome || "Não informado"}
                      </p>
                      {nota.cliente?.cpf_cnpj && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          CNPJ: {nota.cliente.cpf_cnpj}
                        </p>
                      )}
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        R${" "}
                        {Number(nota.valor_nota).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </td>

                    {/* Vendedor */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {nota.nome_vendedor || "Não informado"}
                    </td>

                    {/* Produtos */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {nota.itens?.length > 0 ? (
                          <div>
                            <p
                              className="truncate max-w-xs"
                              title={nota.itens.map((i) => i.descricao).join(", ")}
                            >
                              {nota.itens.map((i) => i.descricao).join(", ")}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {nota.itens.length}{" "}
                              {nota.itens.length === 1 ? "item" : "itens"}
                            </p>
                          </div>
                        ) : (
                          "Sem itens"
                        )}
                      </div>
                    </td>

                    {/* Observações */}
                    <td className="px-4 py-3 text-center">
                      {nota.tem_observacoes ? (
                        <button
                          onClick={() => setNotaDasObservacoes(nota.id)}
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
                {notaDasObservacoes !== null && (
                  <ModalObservacoesDaNota
                    idNota={notaDasObservacoes}
                    onClose={() => setNotaDasObservacoes(null)}
                  />
                )}
              </tbody>
            </table>
          </div>

          {/*
            O `Pagination` do design system, e não as 104 linhas que estavam
            aqui. As que saíram escondiam a frase de contagem dentro do
            `{totalPaginas > 1 && ...}`: quem tinha 10 notas ou menos não
            lia contagem nenhuma. É o mesmo defeito 1.7 que a Fase 1 corrigiu
            em Contas, e ele morre junto com o bloco.
          */}
          <div className="mt-4">
            <Pagination
              page={paginaAtual}
              pageSize={15}
              total={totalDeNotas}
              itemLabel="notas"
              onPageChange={setPaginaAtual}
            />
          </div>

        </div>

        {/* Estatísticas Adicionais */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Resumo do Período */}
          <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Resumo do Período
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total de Clientes</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {resumo.por_cliente.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total de Vendedores</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {resumo.por_vendedor.filter(v => v.nome !== "Não informado").length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total de Produtos</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {resumo.por_produto.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Média de Itens/Venda</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {resumo.kpis.notas > 0
                    ? (resumo.kpis.itens / resumo.kpis.notas).toFixed(1)
                    : '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Comparativo Mensal */}
          <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Comparativo Mensal
            </h3>
            {dadosEvolucao.length >= 2 && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Variação último mês</p>
                  <p className="text-lg font-semibold mt-1">
                    {(() => {
                      const ultimo = dadosEvolucao[dadosEvolucao.length - 1]?.total || 0;
                      const penultimo = dadosEvolucao[dadosEvolucao.length - 2]?.total || 0;
                      const variacao = penultimo > 0 ? ((ultimo - penultimo) / penultimo * 100) : 0;
                      return (
                        <span className={variacao >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {variacao >= 0 ? '+' : ''}{variacao.toFixed(1)}%
                        </span>
                      );
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Melhor mês</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {dadosEvolucao.reduce((max, item) => 
                      item.total > (max?.total || 0) ? item : max, dadosEvolucao[0]
                    )?.mes || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Média mensal</p>
                  <p className="text-sm font-semibold text-blue-600">
                    R$ {(dadosEvolucao.reduce((acc, item) => acc + item.total, 0) / dadosEvolucao.length).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Performance de Vendas */}
          <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Performance de Vendas
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Maior venda</p>
                <p className="text-sm font-semibold text-green-600">
                  R$ {resumo.kpis.maior_venda.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Menor venda</p>
                <p className="text-sm font-semibold text-red-600">
                  R$ {resumo.kpis.menor_venda.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Desvio padrão</p>
                <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                  R$ {resumo.kpis.desvio_padrao_venda.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Vendas;