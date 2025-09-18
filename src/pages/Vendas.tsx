import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { fetchVendas } from "../services/notasapi";
import { useAuth } from "../hooks/useAuth";
import { useVendas } from "../context/VendasContext";
import ModalObservacoes from "../components/ModalObservacoes";
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
  cliente: { 
    nome: string; 
    cpf_cnpj: string; 
  } | null;
  nome_vendedor: string;
  itens: { 
    descricao: string; 
    quantidade: string; 
    valor_total: string;
    valor_unitario?: string;
  }[];
  observacoes?: string | null;
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
  const { notas, carregando } = useVendas();

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
  const [notaSelecionada, setNotaSelecionada] = useState<Nota | null>(null);

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
  const empresasUnicas: string[] = useMemo(() => 
    Array.from(
      new Set(
        notas
          .map(n => n.cliente ? `${n.cliente.nome} (${n.cliente.cpf_cnpj})` : null)
          .filter((n): n is string => Boolean(n))
      )
    ),
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
      const empresaOk =
        filtroEmpresa.length === 0 ||
        filtroEmpresa.includes(`${n.cliente?.nome} (${n.cliente?.cpf_cnpj})`);
      
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

  const normalizarCNPJ = (cnpj: string) => cnpj.replace(/\D/g, "");

  // Tabela com pesquisa e ordenação
  const notasTabela = useMemo(() => {
    let filtradas = [...notasFiltradas];

    // Aplicar pesquisa
    if (pesquisaTabela) {
      const termo = pesquisaTabela.toLowerCase();
      const termoNormalizado = normalizarCNPJ(termo);

      filtradas = filtradas.filter(n =>
        n.cliente?.nome?.toLowerCase().includes(termo) ||
        n.cliente?.cpf_cnpj?.toLowerCase().includes(termo) ||
        normalizarCNPJ(n.cliente?.cpf_cnpj || "").includes(termoNormalizado) || // 🔥 pesquisa só números
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
    const [searchTerm, setSearchTerm] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    // Fecha ao clicar fora
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    const toggleOption = (option: string) => {
      if (selected.includes(option)) {
        onChange(selected.filter(s => s !== option));
      } else {
        onChange([...selected, option]);
      }
    };

    // Função para normalizar CNPJ (remove pontos, traços e barras)
    const normalizar = (valor: string) => valor.replace(/\D/g, "").toLowerCase();

    const filteredOptions = options.filter((option) => {
      const optionNormalizado = normalizar(option);
      const searchNormalizado = normalizar(searchTerm);

      return (
        option.toLowerCase().includes(searchTerm.toLowerCase()) || // pesquisa normal
        optionNormalizado.includes(searchNormalizado) // pesquisa só números
      );
    });

    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 text-left border rounded-lg 
                    bg-white dark:bg-[#0f172a] 
                    hover:bg-gray-50 dark:hover:bg-gray-700 
                    border-gray-300 dark:border-gray-600 
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {selected.length > 0 ? `${selected.length} selecionado(s)` : placeholder}
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 
                          bg-white dark:bg-[#0f172a] 
                          border border-gray-200 dark:border-gray-600 
                          rounded-lg shadow-lg 
                          max-h-60 overflow-auto">
            {/* Campo de pesquisa */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 border rounded 
                          border-gray-300 dark:border-gray-600 
                          bg-white dark:bg-gray-800 
                          text-gray-700 dark:text-gray-200 
                          placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div className="p-2">
              <button
                onClick={() => onChange([])}
                className="w-full text-left px-2 py-1 text-sm 
                          text-gray-600 dark:text-gray-300 
                          hover:bg-gray-100 dark:hover:bg-gray-700 
                          rounded"
              >
                Limpar seleção
              </button>
            </div>

            {/* Lista filtrada com checkboxes */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <label
                  key={option}
                  className="flex items-center px-4 py-2 cursor-pointer 
                            hover:bg-blue-100 dark:hover:bg-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggleOption(option)}
                    className="mr-2"
                  />
                  <span className="text-gray-700 dark:text-gray-200">{option}</span>
                </label>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-500 dark:text-gray-400">
                Nenhum resultado encontrado
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-darkBlue transition-colors">
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
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-darkBlue transition-colors">
  {/* Cabeçalho */}
  <div className="bg-white dark:bg-[#0f172a] shadow-sm rounded-xl">
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
        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-4 mb-6 border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Filtros
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Empresas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Período Rápido
              </label>
              <select
                value={presetPeriodo}
                onChange={(e) => setPresetPeriodo(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-darkBlue 
                          dark:text-gray-200 dark:border-gray-600 
                          focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          bg-white dark:bg-darkBlue dark:text-gray-200 dark:border-gray-600 
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
                          bg-white dark:bg-darkBlue dark:text-gray-200 dark:border-gray-600 
                          focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Faturamento Total */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
  <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
            backgroundColor: "#1e293b",
            border: "1px solid var(--chart-axis)",
            borderRadius: "8px",
            color: "var(--chart-text)",
          }}
          itemStyle={{ color: "#60a5fa" }}
          labelStyle={{ color: "var(--chart-text)" }}
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
  <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
  content={({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: "#1e293b",
            border: "1px solid var(--chart-axis)",
            borderRadius: "8px",
            color: "var(--chart-text)",
            padding: "8px 12px",
            maxWidth: "220px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={String(label)}
        >
          <p
            style={{
              fontWeight: 600,
              marginBottom: "4px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {label}
          </p>
          <p style={{ color: "#22c55e" }}>
            valor: {formatarValorAbreviado(payload[0].value as number)}
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
  <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
      Top 5 Vendedores
    </h3>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rankingVendedores} layout="vertical" barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-axis)" />

        <XAxis
          type="number"
          tickFormatter={(value) => formatarValorAbreviado(value)}
          axisLine={{ stroke: "var(--chart-axis)" }}
          tick={{ fill: "var(--chart-text)" }}
        />

        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div
                  style={{
                    backgroundColor: "#1e293b",
                    border: "1px solid var(--chart-axis)",
                    borderRadius: "8px",
                    color: "var(--chart-text)",
                    padding: "8px 12px",
                    maxWidth: "220px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={String(label)}
                >
                  <p
                    style={{
                      fontWeight: 600,
                      marginBottom: "4px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {label}
                  </p>
                  <p style={{ color: "#22c55e" }}>
                    valor : {formatarValorAbreviado(payload[0].value as number)}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />

        <YAxis
          type="category"
          dataKey="vendedor"
          width={150}
          tick={({ x, y, payload }) => (
            <text
              x={x}
              y={y}
              dy={4}
              fontSize={12}
              fill="var(--chart-text)"
              textAnchor="end"
            >
              {payload.value.length > 15
                ? payload.value.substring(0, 15) + "..."
                : payload.value}
            </text>
          )}
        />

        <Bar dataKey="valor" fill={CORES.verde} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>

  {/* Distribuição por Empresa */}
  <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
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
            `${(name || "").substring(0, 15)}${
              name && name.length > 15 ? "..." : ""
            } ${(percent * 100).toFixed(0)}%`
          }
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
                    backgroundColor: "#1e293b",
                    border: "1px solid var(--chart-axis)",
                    borderRadius: "8px",
                    color: "var(--chart-text)",
                    padding: "8px 12px",
                    maxWidth: "220px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={name}
                >
                  <p
                    style={{
                      fontWeight: 600,
                      marginBottom: "4px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {name}
                  </p>
                  <p style={{ color: "#38bdf8" }}>
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
        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
                </tr>
              </thead>

              <tbody>
                {notasPaginadas.map((nota, index) => (
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
                      {new Date(nota.data_emissao).toLocaleDateString("pt-BR")}
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
                      {nota.observacoes ? (
                        <button
                          onClick={() => setNotaSelecionada(nota)}
                          className="text-blue-600 hover:underline"
                        >
                          Observações
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {notaSelecionada && (
                  <ModalObservacoes
                    observacoes={notaSelecionada.observacoes ?? null} // ✅ garante string | null
                    onClose={() => setNotaSelecionada(null)}
                  />
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a{" "}
              {Math.min(paginaAtual * itensPorPagina, notasTabela.length)} de{" "}
              {notasTabela.length} registros
            </div>

            {/* Desktop: paginação completa */}
            <div className="hidden md:flex gap-2">
              <button
                onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
                disabled={paginaAtual === 1}
                className="px-3 py-1 border rounded-lg 
                  bg-white dark:bg-slate-800 
                  border-gray-300 dark:border-gray-600 
                  text-gray-700 dark:text-gray-300
                  hover:bg-gray-50 dark:hover:bg-slate-700 
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>

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
                      className={`px-3 py-1 border rounded-lg transition-colors ${
                        paginaAtual === pageNum
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
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
                className="px-3 py-1 border rounded-lg 
                  bg-white dark:bg-slate-800 
                  border-gray-300 dark:border-gray-600 
                  text-gray-700 dark:text-gray-300
                  hover:bg-gray-50 dark:hover:bg-slate-700 
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>

            {/* Mobile: somente < páginaAtual > */}
            <div className="flex md:hidden gap-2 items-center">
              <button
                onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
                disabled={paginaAtual === 1}
                className="px-3 py-1 border rounded-lg 
                  bg-white dark:bg-slate-800 
                  border-gray-300 dark:border-gray-600 
                  text-gray-700 dark:text-gray-300
                  hover:bg-gray-50 dark:hover:bg-slate-700 
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {"<"}
              </button>

              <span className="px-3 py-1 border rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300">
                {paginaAtual}
              </span>

              <button
                onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
                disabled={paginaAtual === totalPaginas}
                className="px-3 py-1 border rounded-lg 
                  bg-white dark:bg-slate-800 
                  border-gray-300 dark:border-gray-600 
                  text-gray-700 dark:text-gray-300
                  hover:bg-gray-50 dark:hover:bg-slate-700 
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {">"}
              </button>
            </div>
          </div>
        )}
        </div>

        {/* Estatísticas Adicionais */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Resumo do Período */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Resumo do Período
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total de Clientes</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {new Set(notasFiltradas.map(n => n.cliente?.nome)).size}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total de Vendedores</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {new Set(notasFiltradas.map(n => n.nome_vendedor)).size - 1}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total de Produtos</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {new Set(notasFiltradas.flatMap(n => n.itens?.map(i => i.descricao) || [])).size}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Média de Itens/Venda</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {notasFiltradas.length > 0 
                    ? (notasFiltradas.reduce((acc, n) => acc + (n.itens?.length || 0), 0) / notasFiltradas.length).toFixed(1)
                    : '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Comparativo Mensal */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Performance de Vendas
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Maior venda</p>
                <p className="text-sm font-semibold text-green-600">
                  R$ {Math.max(...notasFiltradas.map(n => Number(n.valor_nota)), 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Menor venda</p>
                <p className="text-sm font-semibold text-red-600">
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Desvio padrão</p>
                <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
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