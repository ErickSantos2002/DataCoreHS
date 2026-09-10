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
import { Phone, Mail } from "lucide-react";
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
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  Calendar,
  Filter,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
  Save,
  Check,
  X,
} from "lucide-react";
import { diaLocal } from "../lib/datas";
import { baixarPlanilha } from "../lib/planilha";
import { PRESETS_DE_PERIODO, periodoDoPreset } from "../lib/periodo";
import ModalObservacoesDaNota from "../components/ModalObservacoesDaNota";
import { useToast } from "../components/ToastProvider";
import {
  MultiSelect,
  Pagination,
  TableEmpty,
  deTextos,
  buscaPorCnpjEntreParenteses,
} from "../design-system/ui";

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
  const [editandoTipo, setEditandoTipo] = useState<number | null>(null);
  const [tipoTemp, setTipoTemp] = useState<string>("");
  const [salvandoTipo, setSalvandoTipo] = useState<number | null>(null);
  // Guarda o ID, e não o texto: o texto é buscado pelo modal ao abrir.
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

  const { opcoes } = useFiltrosComerciais();

  // Quem é do papel "vendas" vê só as próprias notas. Isso era o `notasVendedor`
  // do contexto, um `includes` do username dentro do nome do vendedor; aqui a
  // mesma continência escolhe QUAIS nomes entram no filtro, e o recorte em si
  // passa a ser do banco. O efeito é idêntico e o navegador deixa de receber as
  // notas dos outros para depois descartá-las — que era, além de trabalho à
  // toa, mandar para a máquina de um vendedor a carteira inteira da empresa.
  const vendedoresDoPapel = useMemo(() => {
    if (user?.role !== "vendas") return [];
    const alvo = vendedorLogado.toLowerCase();
    return opcoes.vendedores.filter((v) => v.toLowerCase().includes(alvo));
  }, [user?.role, vendedorLogado, opcoes.vendedores]);

  const rotuloDoCliente = (c: { nome: string | null; cpf_cnpj: string | null }) =>
    `${c.nome || "Não informado"} (${c.cpf_cnpj || ""})`;

  const clientesUnicos = useMemo(
    () => opcoes.clientes.map(rotuloDoCliente),
    [opcoes.clientes],
  );

  const produtosUnicos = useMemo(
    () =>
      opcoes.produtos.map((p) => ({
        value: p.chave,
        label: `${p.descricao} (${p.codigo ?? "sem código"})`,
      })),
    [opcoes.produtos],
  );

  const idPorRotulo = useMemo(() => {
    const mapa = new Map<string, number>();
    opcoes.clientes.forEach((c) => mapa.set(rotuloDoCliente(c), c.id));
    return mapa;
  }, [opcoes.clientes]);

  const recorte: RecorteComercial = useMemo(
    () => ({
      clientes: filtroCliente
        .map((r) => idPorRotulo.get(r))
        .filter((id): id is number => id !== undefined),
      vendedores: vendedoresDoPapel,
      // O multiselect de produto já guarda a CHAVE (o `value` das opções), e
      // não o rótulo: aqui ele sempre foi de `{value,label}`, ao contrário do
      // de Vendas.
      produtos: filtroProduto,
      dataInicio,
      dataFim,
    }),
    [filtroCliente, vendedoresDoPapel, filtroProduto, dataInicio, dataFim, idPorRotulo],
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

  // KPIs — Vendedores mede a MERCADORIA (`valor_produtos`), e não o total da
  // nota. É a diferença que sempre existiu entre esta tela e a de Vendas.
  const kpis = useMemo(() => {
    const topo = resumo.por_produto[0];
    const notas = resumo.kpis.notas;
    return {
      totalFaturado: resumo.kpis.faturamento_produtos,
      totalVendas: notas,
      ticketMedio: notas > 0 ? resumo.kpis.faturamento_produtos / notas : 0,
      produtoMaisVendido: topo
        ? { nome: topo.descricao ?? "N/A", valor: topo.valor }
        : null,
    };
  }, [resumo]);

  const dadosEvolucao = useMemo(() => {
    const dadosMensais = resumo.evolucao_mensal.map((m) => {
      const data = new Date(m.ano, m.mes - 1);
      return {
        mes: data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
        total: m.total_produtos,
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

  // ⚠️ Agrupado por CÓDIGO, e não pela grafia da descrição — ver a nota em
  // `comercial/useComercial.ts`.
  const topProdutos = useMemo(
    () =>
      resumo.por_produto.slice(0, 5).map((p) => ({
        produto: p.descricao ?? "Sem descrição",
        valor: p.valor,
      })),
    [resumo.por_produto],
  );

  const distribuicaoClientes = useMemo(
    () =>
      resumo.por_cliente.slice(0, 8).map((c) => ({
        name: c.nome ?? "Não informado",
        value: c.valor_produtos,
      })),
    [resumo.por_cliente],
  );


  // Formatação de valores
  const formatarValorAbreviado = (valor: number) => {
    if (valor >= 1_000_000) {
      return `${(valor / 1_000_000).toFixed(1)}M`;
    } else if (valor >= 1_000) {
      return `${(valor / 1_000).toFixed(1)}K`;
    }
    return valor.toFixed(0);
  };

  // Função para alternar ordenação
  const alternarOrdenacao = (campo: CampoDeOrdenacao) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Funções de edição do tipo
  const iniciarEdicaoTipo = (notaId: number, tipoAtual: string | null) => {
    setEditandoTipo(notaId);
    setTipoTemp(tipoAtual || "Outbound");
  };

  const cancelarEdicaoTipo = () => {
    setEditandoTipo(null);
    setTipoTemp("");
  };

  const salvarTipo = async (notaId: number) => {
    try {
      setSalvandoTipo(notaId);
      await updateNotaTipo(notaId, tipoTemp as "Outbound" | "Inbound" | "ReCompra");
      setTiposEditados((antes) => ({ ...antes, [notaId]: tipoTemp }));
      setEditandoTipo(null);
      setTipoTemp("");
    } catch (error) {
      console.error("Erro ao salvar tipo:", error);
      erro("Não foi possível salvar o tipo da nota.");
    } finally {
      setSalvandoTipo(null);
    }
  };

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

    const dadosExport = todas.map(n => {
      const dataFormatada = n.data_emissao
        ? n.data_emissao.split("-").reverse().join("/")
        : "";

      const numeroFormatado = n.numero ? Number(n.numero.toString().substring(2)) : "";

      return {
        'Numero': numeroFormatado,
        'Data': dataFormatada,
        'Cliente': n.cliente?.nome || '',
        'CNPJ': n.cliente?.cpf_cnpj || '',
        'Valor Produtos': Number(n.valor_produtos),
        'Valor Nota': Number(n.valor_nota),
        'Tipo': n.tipo || 'Não definido',
        'Vendedor': n.nome_vendedor || '',
        'Produtos': n.itens?.map(i => i.descricao).join(', ') || ''
      };
    });

    baixarPlanilha(
      [
        {
          nome: "Minhas Vendas",
          linhas: dadosExport,
          // Largura de coluna e formato contabil nas colunas de valor. So esta
          // tela faz isso entre as nove; sem o `t`/`z` o valor sai como texto
          // e o Excel nao soma a coluna.
          ajustar: (folha) => {
            folha["!cols"] = [
              { wch: 10 },
              { wch: 12 },
              { wch: 40 },
              { wch: 18 },
              { wch: 15 },
              { wch: 15 },
              { wch: 15 },
              { wch: 20 },
              { wch: 50 },
            ];
            for (const celula in folha) {
              if (celula[0] === "E" || celula[0] === "F") {
                const alvo = folha[celula];
                if (alvo && typeof alvo.v === "number") {
                  alvo.t = "n";
                  alvo.z = "#,##0.00";
                }
              }
            }
          },
        },
      ],
      `vendas_${vendedorLogado}_${diaLocal(new Date())}.xlsx`,
    );
    } catch (falha) {
      console.error("Erro ao exportar as vendas:", falha);
      erro("Não foi possível exportar as vendas.");
    } finally {
      setExportando(false);
    }
  }, [recorte, pesquisaTabela, ordenacao, vendedorLogado, erro]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-surface-base transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Carregando suas vendas...
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
            Vendedores - Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-200 mt-1">
            Bem-vindo, <span className="font-semibold">{vendedorLogado}</span> ({user?.role})
          </p>
          <p className="text-gray-500 dark:text-gray-300 text-sm mt-2">
            Acompanhe suas métricas de vendas, evolução e gerencie suas notas.
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Empresas (Clientes) */}
            <div>
              <MultiSelect
                rotulo="Empresas"
                opcoes={deTextos(clientesUnicos)}
                selecionados={filtroCliente}
                onChange={setFiltroCliente}
                placeholder="Todas as empresas"
                buscarPor={buscaPorCnpjEntreParenteses}
              />
            </div>

            {/* Produtos */}
            <div>
              <MultiSelect
                rotulo="Produtos"
                opcoes={deTextos(produtosUnicos.map(p => p.label))} // exibição
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
              <div className="min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-400">Produto Top</p>
                <p
                  className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-2 truncate max-w-[180px]" 
                  title={kpis.produtoMaisVendido?.nome || "N/A"}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Evolução das Vendas */}
          <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Evolução das Vendas
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosEvolucao}>
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
                    backgroundColor: "#ffffff", // 🔹 Sempre branco
                    border: "1px solid #d1d5db", // 🔹 Borda clara
                    borderRadius: "8px",
                    color: "#111827", // 🔹 Texto escuro
                  }}
                  labelStyle={{ color: "#111827" }} // 🔹 Label sempre escura
                  itemStyle={{ color: "#0284c7" }}  // 🔹 Valor em azul
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

          {/* Top Produtos Vendidos */}
          <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Top Produtos Vendidos
            </h3>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProdutos} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                
                <XAxis
                  dataKey="produto"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickFormatter={(value: string) =>
                    value.length > 12 ? `${value.substring(0, 12)}...` : value
                  }
                />

                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickFormatter={(value: number) => formatarValorAbreviado(value)} // 🔹 só número abreviado
                />

                {/* Tooltip customizada */}
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const { produto, valor } = payload[0].payload;
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
                            overflow: "hidden",
                            color: isDark ? "#f9fafb" : "#111827",
                          }}
                        >
                          <p style={{ fontWeight: 600, marginBottom: "4px" }}>
                            {produto}
                          </p>
                          <p style={{ color: isDark ? "#38bdf8" : "#0284c7" }}>
                            Valor:{" "}
                            {typeof valor === "number"
                              ? `R$ ${valor.toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : "N/A"}
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


          {/* Distribuição de Clientes */}
          <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Distribuição de Clientes
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribuicaoClientes}
                  cx="50%"
                  cy="50%"
                  label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distribuicaoClientes.map((entry, index) => (
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

        {/* Tabela de Vendas */}
        <div className="bg-white dark:bg-surface rounded-xl shadow-sm p-6 transition-colors">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 md:mb-0">
              Minhas Vendas
            </h3>

            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
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

                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => alternarOrdenacao("valor_produtos")}
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Valor
                      </span>
                      {ordenacao.campo === "valor_produtos" &&
                        (ordenacao.direcao === "desc" ? (
                          <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ) : (
                          <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ))}
                    </div>
                  </th>

                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Produtos
                      </span>
                    </div>
                  </th>

                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Vendedor
                      </span>
                    </div>
                  </th>

                  <th className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Observações
                      </span>
                    </div>
                  </th>

                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => alternarOrdenacao("tipo")}
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Tipo da Nota
                      </span>
                      {ordenacao.campo === "tipo" &&
                        (ordenacao.direcao === "desc" ? (
                          <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ) : (
                          <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ))}
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {notasPaginadas.length === 0 ? (
                  // Pagination some com total zero; sem isso a tabela ficava
                  // muda no filtro sem resultado (defeito 2 do spec).
                  <TableEmpty colSpan={7} />
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
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {nota.data_emissao.split("-").reverse().join("/")}
                    </td>

                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {nota.cliente?.nome || "Cliente não informado"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {nota.cliente?.cpf_cnpj}
                        </p>

                        {/* E-mail e Telefone do cliente */}
                        <div className="flex gap-3 mt-1 flex-wrap">
                          {nota.cliente?.email && (
                            <span className="flex items-center text-xs text-gray-400">
                              <Mail className="w-3 h-3 mr-1" />
                              {nota.cliente.email}
                            </span>
                          )}
                          {nota.cliente?.fone && (
                            <span className="flex items-center text-xs text-gray-400">
                              <Phone className="w-3 h-3 mr-1" />
                              {nota.cliente.fone}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        R${" "}
                        {Number(nota.valor_produtos).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </td>

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

                    {/* Vendedor */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {nota.nome_vendedor || "Não informado"}
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

                    <td className="px-4 py-3">
                      {editandoTipo === nota.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={tipoTemp}
                            onChange={(e) => setTipoTemp(e.target.value)}
                            className="px-2 py-1 border rounded text-sm
                                      bg-white dark:bg-slate-700 
                                      border-gray-300 dark:border-gray-600
                                      text-gray-700 dark:text-gray-200"
                            disabled={salvandoTipo === nota.id}
                          >
                            <option value="Outbound">Outbound</option>
                            <option value="Inbound">Inbound</option>
                            <option value="ReCompra">ReCompra</option>
                          </select>
                          <button
                            onClick={() => salvarTipo(nota.id)}
                            disabled={salvandoTipo === nota.id}
                            className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                          >
                            {salvandoTipo === nota.id ? (
                              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={cancelarEdicaoTipo}
                            disabled={salvandoTipo === nota.id}
                            className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => iniciarEdicaoTipo(nota.id, nota.tipo ?? null)}
                          className="cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 px-2 py-1 rounded"
                        >
                          <span
                            className={`text-sm font-medium px-2 py-1 rounded-full whitespace-nowrap
                              ${
                                nota.tipo === "Outbound"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                  : nota.tipo === "Inbound"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                  : nota.tipo === "ReCompra"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                              }`}
                          >
                            {nota.tipo || "Não definido"}
                          </span>
                        </div>
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
            O `Pagination` do design system, e não as 99 linhas que estavam
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
      </div>
    </div>
  );
};

export default Vendedores;