import React, { useEffect, useState, useMemo, useCallback } from "react";
import { fetchVendas } from "../services/notasapi";
import { useAuth } from "../hooks/useAuth";
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
import * as XLSX from "xlsx";

// Tipagem da Nota
interface Nota {
  id: number;
  data_emissao: string;
  valor_nota: number;
  cliente: { nome: string };
  nome_vendedor: string;
  itens: { 
    descricao: string; 
    quantidade: string; 
    valor_total: string;
    valor_unitario?: string;
  }[];
}

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

const Vendas: React.FC = () => {
  const { user } = useAuth();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Estados dos filtros
  const [filtroEmpresa, setFiltroEmpresa] = useState<string[]>([]);
  const [filtroVendedor, setFiltroVendedor] = useState<string[]>([]);
  const [filtroProduto, setFiltroProduto] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [presetPeriodo, setPresetPeriodo] = useState("todos");

  // Estados da tabela
  const [ordenacao, setOrdenacao] = useState<{campo: string; direcao: 'asc' | 'desc'}>({
    campo: 'data_emissao',
    direcao: 'desc'
  });
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(10);
  const [pesquisaTabela, setPesquisaTabela] = useState("");

  // Busca as notas na API
  useEffect(() => {
    const carregarNotas = async () => {
      try {
        const data = await fetchVendas();
        setNotas(data);
      } catch (error) {
        console.error("Erro ao buscar notas:", error);
      } finally {
        setCarregando(false);
      }
    };
    carregarNotas();
  }, []);

  // Gerenciador de presets de período
  useEffect(() => {
    const hoje = new Date();
    let inicio = "";
    let fim = hoje.toISOString().split("T")[0];

    switch (presetPeriodo) {
      case "7dias":
        const semanaPassada = new Date(hoje);
        semanaPassada.setDate(hoje.getDate() - 7);
        inicio = semanaPassada.toISOString().split("T")[0];
        break;
      case "30dias":
        const mesPassado = new Date(hoje);
        mesPassado.setDate(hoje.getDate() - 30);
        inicio = mesPassado.toISOString().split("T")[0];
        break;
      case "anoAtual":
        inicio = `${hoje.getFullYear()}-01-01`;
        break;
      case "todos":
      default:
        inicio = "";
        fim = "";
        break;
    }

    if (presetPeriodo !== "custom") {
      setDataInicio(inicio);
      setDataFim(fim);
    }
  }, [presetPeriodo]);

  // Listas únicas para filtros
  const empresasUnicas = useMemo(() => 
    Array.from(new Set(notas.map(n => n.cliente?.nome).filter(Boolean))),
    [notas]
  );

  const vendedoresUnicos = useMemo(() => 
    Array.from(new Set(notas.map(n => n.nome_vendedor).filter(Boolean))),
    [notas]
  );

  const produtosUnicos = useMemo(() => 
    Array.from(new Set(
      notas.flatMap(n => n.itens?.map(i => i.descricao) || []).filter(Boolean)
    )),
    [notas]
  );

  // Aplicação dos filtros
  const notasFiltradas = useMemo(() => {
    return notas.filter(n => {
      // Filtro de empresa
      const empresaOk = filtroEmpresa.length === 0 || 
        filtroEmpresa.includes(n.cliente?.nome);
      
      // Filtro de vendedor
      const vendedorOk = filtroVendedor.length === 0 || 
        filtroVendedor.includes(n.nome_vendedor);
      
      // Filtro de produto
      const produtoOk = filtroProduto.length === 0 ||
        n.itens?.some(item => filtroProduto.includes(item.descricao));
      
      // Filtro de data
      const dataOk =
        (!dataInicio || new Date(n.data_emissao) >= new Date(dataInicio)) &&
        (!dataFim || new Date(n.data_emissao) <= new Date(dataFim));
      
      return empresaOk && vendedorOk && produtoOk && dataOk;
    });
  }, [notas, filtroEmpresa, filtroVendedor, filtroProduto, dataInicio, dataFim]);

  // KPIs Calculados
  const kpis = useMemo(() => {
    const totalFaturado = notasFiltradas.reduce(
      (acc, n) => acc + Number(n.valor_nota || 0),
      0
    );
    const totalVendas = notasFiltradas.length;
    const ticketMedio = totalVendas > 0 ? totalFaturado / totalVendas : 0;

    // Produto mais vendido
    const produtosAgrupados = notasFiltradas
      .flatMap(n => n.itens || [])
      .reduce((acc: any, item) => {
        const key = item.descricao;
        if (!acc[key]) acc[key] = 0;
        acc[key] += Number(item.valor_total || 0);
        return acc;
      }, {});

    const produtoMaisVendido = Object.entries(produtosAgrupados)
      .sort(([,a]: any, [,b]: any) => b - a)[0];

    return {
      totalFaturado,
      totalVendas,
      ticketMedio,
      produtoMaisVendido: produtoMaisVendido ? {
        nome: produtoMaisVendido[0],
        valor: produtoMaisVendido[1] as number
      } : null
    };
  }, [notasFiltradas]);

  // Dados para gráfico de evolução
  const dadosEvolucao: { mes: string; total: number; ordem: number }[] = useMemo(() => {
    const agrupado = notasFiltradas.reduce((acc: Record<string, number>, n) => {
      const data = new Date(n.data_emissao);
      const ano = data.getFullYear();
      const mes = data.getMonth(); // 0 = janeiro
      const chave = `${ano}-${mes}`;
      if (!acc[chave]) acc[chave] = 0;
      acc[chave] += Number(n.valor_nota || 0);
      return acc;
    }, {});

    return Object.entries(agrupado)
      .map(([chave, total]) => {
        const [ano, mes] = chave.split("-");
        const data = new Date(Number(ano), Number(mes));
        return {
          mes: data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
          total,
          ordem: data.getTime(), // usado para ordenar
        };
      })
      .sort((a, b) => a.ordem - b.ordem);
  }, [notasFiltradas]);


  // Dados para ranking de produtos
  const rankingProdutos = useMemo(() => {
    const agrupado = notasFiltradas
      .flatMap(n => n.itens || [])
      .reduce((acc: any, item) => {
        const key = item.descricao;
        if (!acc[key]) acc[key] = 0;
        acc[key] += Number(item.valor_total || 0);
        return acc;
      }, {});

    return Object.entries(agrupado)
      .map(([produto, valor]) => ({ produto, valor }))
      .sort((a: any, b: any) => b.valor - a.valor)
      .slice(0, 5);
  }, [notasFiltradas]);

  // Dados para ranking de vendedores
  const rankingVendedores = useMemo(() => {
    const agrupado = notasFiltradas.reduce((acc: any, n) => {
      const vendedor = n.nome_vendedor || "Não informado";
      if (!acc[vendedor]) acc[vendedor] = 0;
      acc[vendedor] += Number(n.valor_nota || 0);
      return acc;
    }, {});

    return Object.entries(agrupado)
      .map(([vendedor, valor]) => ({ vendedor, valor }))
      .sort((a: any, b: any) => b.valor - a.valor)
      .slice(0, 5);
  }, [notasFiltradas]);

  // Dados para distribuição por empresa
  const distribuicaoEmpresas = useMemo(() => {
    const agrupado = notasFiltradas.reduce((acc: any, n) => {
      const empresa = n.cliente?.nome || "Não informado";
      if (!acc[empresa]) acc[empresa] = 0;
      acc[empresa] += Number(n.valor_nota || 0);
      return acc;
    }, {});

    return Object.entries(agrupado)
      .map(([name, value]) => ({ name, value }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 8); // Top 8 empresas
  }, [notasFiltradas]);

  // Tabela com pesquisa e ordenação
  const notasTabela = useMemo(() => {
    let filtradas = [...notasFiltradas];

    // Aplicar pesquisa
    if (pesquisaTabela) {
      const termo = pesquisaTabela.toLowerCase();
      filtradas = filtradas.filter(n =>
        n.cliente?.nome?.toLowerCase().includes(termo) ||
        n.nome_vendedor?.toLowerCase().includes(termo) ||
        n.itens?.some(i => i.descricao?.toLowerCase().includes(termo)) ||
        n.valor_nota?.toString().includes(termo)
      );
    }

    // Aplicar ordenação
    filtradas.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch(ordenacao.campo) {
        case 'data_emissao':
          aVal = new Date(a.data_emissao);
          bVal = new Date(b.data_emissao);
          break;
        case 'cliente':
          aVal = a.cliente?.nome || '';
          bVal = b.cliente?.nome || '';
          break;
        case 'valor':
          aVal = Number(a.valor_nota);
          bVal = Number(b.valor_nota);
          break;
        case 'vendedor':
          aVal = a.nome_vendedor || '';
          bVal = b.nome_vendedor || '';
          break;
        default:
          return 0;
      }

      if (ordenacao.direcao === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtradas;
  }, [notasFiltradas, pesquisaTabela, ordenacao]);

  // Paginação
  const notasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return notasTabela.slice(inicio, fim);
  }, [notasTabela, paginaAtual, itensPorPagina]);

  const totalPaginas = Math.ceil(notasTabela.length / itensPorPagina);

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
  const alternarOrdenacao = (campo: string) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Exportação para Excel
  const exportarExcel = useCallback(() => {
    const dadosExport = notasFiltradas.map(n => ({
      'Data': new Date(n.data_emissao).toLocaleDateString('pt-BR'),
      'Cliente': n.cliente?.nome || '',
      'Valor': n.valor_nota,
      'Vendedor': n.nome_vendedor || '',
      'Produtos': n.itens?.map(i => i.descricao).join(', ') || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    XLSX.writeFile(wb, `vendas_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [notasFiltradas]);

  // Componente de MultiSelect customizado
  const MultiSelect = ({ 
    options, 
    selected, 
    onChange, 
    placeholder 
  }: {
    options: string[];
    selected: string[];
    onChange: (val: string[]) => void;
    placeholder: string;
  }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOption = (option: string) => {
      if (selected.includes(option)) {
        onChange(selected.filter(s => s !== option));
      } else {
        onChange([...selected, option]);
      }
    };

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 text-left border rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className="text-sm">
            {selected.length > 0 
              ? `${selected.length} selecionado(s)` 
              : placeholder}
          </span>
        </button>
        
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
            <div className="p-2">
              <button
                onClick={() => onChange([])}
                className="w-full text-left px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                Limpar seleção
              </button>
            </div>
            {options.map(option => (
              <label
                key={option}
                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="mr-2"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados de vendas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-800">
            Vendas - Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Bem-vindo, <span className="font-semibold">{user?.username}</span> ({user?.role})
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Acompanhe as principais métricas, evolução e detalhes das vendas em tempo real.
          </p>
        </div>
      </div>

      <div className="p-6">
        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 mr-2 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Filtros</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Empresas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empresas
              </label>
              <MultiSelect
                options={empresasUnicas}
                selected={filtroEmpresa}
                onChange={setFiltroEmpresa}
                placeholder="Todas as empresas"
              />
            </div>

            {/* Vendedores */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendedores
              </label>
              <MultiSelect
                options={vendedoresUnicos}
                selected={filtroVendedor}
                onChange={setFiltroVendedor}
                placeholder="Todos os vendedores"
              />
            </div>

            {/* Produtos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Produtos
              </label>
              <MultiSelect
                options={produtosUnicos}
                selected={filtroProduto}
                onChange={setFiltroProduto}
                placeholder="Todos os produtos"
              />
            </div>

            {/* Preset de Período */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período Rápido
              </label>
              <select
                value={presetPeriodo}
                onChange={(e) => setPresetPeriodo(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos</option>
                <option value="7dias">Últimos 7 dias</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="anoAtual">Ano atual</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {/* Data Início */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  setPresetPeriodo("custom");
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Data Fim */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => {
                  setDataFim(e.target.value);
                  setPresetPeriodo("custom");
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Faturamento Total */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Faturamento Total</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  R$ {kpis.totalFaturado.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Número de Vendas */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Número de Vendas</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {kpis.totalVendas}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <ShoppingCart className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Ticket Médio */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ticket Médio</p>
                <p className="text-2xl font-bold text-purple-600 mt-2">
                  R$ {kpis.ticketMedio.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Produto Mais Vendido */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Produto Top</p>
                <p className="text-lg font-bold text-orange-600 mt-2 truncate">
                  {kpis.produtoMaisVendido?.nome || "N/A"}
                </p>
                <p className="text-sm text-gray-500">
                  R$ {kpis.produtoMaisVendido?.valor?.toLocaleString("pt-BR") || "0"}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Evolução das Vendas */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Evolução das Vendas
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosEvolucao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis
                    tickFormatter={(value) => formatarValorAbreviado(value)}
                  />
                  <Tooltip
                    formatter={(value: number) => formatarValorAbreviado(value)}
                  />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={CORES.azul}
                  strokeWidth={3}
                  dot={{ fill: CORES.azul }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Ranking de Produtos */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Top 5 Produtos
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rankingProdutos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="produto" angle={-45} textAnchor="end" height={80} />
                <YAxis
                    tickFormatter={(value) => formatarValorAbreviado(value)}
                  />
                  <Tooltip
                    formatter={(value: number) => formatarValorAbreviado(value)}
                  />
                <Bar dataKey="valor" fill={CORES.laranja} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Ranking de Vendedores */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Top 5 Vendedores
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rankingVendedores} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickFormatter={(value) => formatarValorAbreviado(value)}
                />
                <Tooltip
                  formatter={(value: number) => formatarValorAbreviado(value)}
                />
                <YAxis type="category" dataKey="vendedor" width={150} />
                <Bar dataKey="valor" fill={CORES.verde} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuição por Empresa */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Distribuição por Empresa
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribuicaoEmpresas}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent = 0 }) =>
                    `${(name || "").substring(0, 15)}${name && name.length > 15 ? "..." : ""} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distribuicaoEmpresas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CORES_GRAFICO[index % CORES_GRAFICO.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatarValorAbreviado(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela de Últimas Vendas */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2 md:mb-0">
              Detalhamento de Vendas
            </h3>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={pesquisaTabela}
                  onChange={(e) => setPesquisaTabela(e.target.value)}
                  className="pl-10 pr-3 py-2 border rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={exportarExcel}
                className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
                <tr className="border-b border-gray-200">
                  <th 
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50"
                    onClick={() => alternarOrdenacao('data_emissao')}
                  >
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="font-medium text-gray-700">Data</span>
                      {ordenacao.campo === 'data_emissao' && (
                        ordenacao.direcao === 'desc' ? 
                          <ChevronDown className="w-4 h-4 ml-1" /> : 
                          <ChevronUp className="w-4 h-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50"
                    onClick={() => alternarOrdenacao('cliente')}
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700">Cliente</span>
                      {ordenacao.campo === 'cliente' && (
                        ordenacao.direcao === 'desc' ? 
                          <ChevronDown className="w-4 h-4 ml-1" /> : 
                          <ChevronUp className="w-4 h-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50"
                    onClick={() => alternarOrdenacao('valor')}
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700">Valor</span>
                      {ordenacao.campo === 'valor' && (
                        ordenacao.direcao === 'desc' ? 
                          <ChevronDown className="w-4 h-4 ml-1" /> : 
                          <ChevronUp className="w-4 h-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50"
                    onClick={() => alternarOrdenacao('vendedor')}
                  >
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="font-medium text-gray-700">Vendedor</span>
                      {ordenacao.campo === 'vendedor' && (
                        ordenacao.direcao === 'desc' ? 
                          <ChevronDown className="w-4 h-4 ml-1" /> : 
                          <ChevronUp className="w-4 h-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="font-medium text-gray-700">Produtos</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {notasPaginadas.map((nota, index) => (
                  <tr 
                    key={nota.id} 
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(nota.data_emissao).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {nota.cliente?.nome || "Não informado"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-blue-600">
                        R$ {Number(nota.valor_nota).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {nota.nome_vendedor || "Não informado"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">
                        {nota.itens?.length > 0 ? (
                          <div>
                            <p className="truncate max-w-xs" title={nota.itens.map(i => i.descricao).join(", ")}>
                              {nota.itens.map(i => i.descricao).join(", ")}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {nota.itens.length} {nota.itens.length === 1 ? 'item' : 'itens'}
                            </p>
                          </div>
                        ) : (
                          "Sem itens"
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a{" "}
                {Math.min(paginaAtual * itensPorPagina, notasTabela.length)} de{" "}
                {notasTabela.length} registros
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
                  disabled={paginaAtual === 1}
                  className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                
                {/* Números de página */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    let pageNum;
                    if (totalPaginas <= 5) {
                      pageNum = i + 1;
                    } else if (paginaAtual <= 3) {
                      pageNum = i + 1;
                    } else if (paginaAtual >= totalPaginas - 2) {
                      pageNum = totalPaginas - 4 + i;
                    } else {
                      pageNum = paginaAtual - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPaginaAtual(pageNum)}
                        className={`px-3 py-1 border rounded-lg ${
                          paginaAtual === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Estatísticas Adicionais */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Resumo do Período */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Resumo do Período
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total de Clientes</span>
                <span className="text-sm font-semibold text-gray-900">
                  {new Set(notasFiltradas.map(n => n.cliente?.nome)).size}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total de Vendedores</span>
                <span className="text-sm font-semibold text-gray-900">
                  {new Set(notasFiltradas.map(n => n.nome_vendedor)).size}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total de Produtos</span>
                <span className="text-sm font-semibold text-gray-900">
                  {new Set(notasFiltradas.flatMap(n => n.itens?.map(i => i.descricao) || [])).size}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Média de Itens/Venda</span>
                <span className="text-sm font-semibold text-gray-900">
                  {notasFiltradas.length > 0 
                    ? (notasFiltradas.reduce((acc, n) => acc + (n.itens?.length || 0), 0) / notasFiltradas.length).toFixed(1)
                    : '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Comparativo Mensal */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Comparativo Mensal
            </h3>
            {dadosEvolucao.length >= 2 && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Variação último mês</p>
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
                  <p className="text-sm text-gray-600">Melhor mês</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {dadosEvolucao.reduce((max, item) => 
                      item.total > (max?.total || 0) ? item : max, dadosEvolucao[0]
                    )?.mes || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Média mensal</p>
                  <p className="text-sm font-semibold text-gray-900">
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
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Performance de Vendas
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Maior venda</p>
                <p className="text-sm font-semibold text-blue-600">
                  R$ {Math.max(...notasFiltradas.map(n => Number(n.valor_nota)), 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Menor venda</p>
                <p className="text-sm font-semibold text-gray-900">
                  R$ {(notasFiltradas.length > 0 
                    ? Math.min(...notasFiltradas.map(n => Number(n.valor_nota)))
                    : 0
                  ).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Desvio padrão</p>
                <p className="text-sm font-semibold text-gray-900">
                  R$ {(() => {
                    if (notasFiltradas.length === 0) return '0,00';
                    const valores = notasFiltradas.map(n => Number(n.valor_nota));
                    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
                    const variance = valores.reduce((acc, val) => acc + Math.pow(val - media, 2), 0) / valores.length;
                    return Math.sqrt(variance).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    });
                  })()}
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