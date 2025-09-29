import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useData } from "../context/DataContext";
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
import * as XLSX from "xlsx";
import ModalObservacoes from "../components/ModalObservacoes";

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
  const { notas, notasVendedor, carregando, atualizarTipoNota, vendedorLogado } = useData();

  // Estados dos filtros
  const [filtroProduto, setFiltroProduto] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [presetPeriodo, setPresetPeriodo] = useState("todos");
  const [filtroCliente, setFiltroCliente] = useState<string[]>([]);
  
  // Função para normalizar CNPJ (remove pontuação)
  const normalizarCNPJ = (valor: string) => valor.replace(/\D/g, "");

  // Estados da tabela
  const [ordenacao, setOrdenacao] = useState<{campo: string; direcao: 'asc' | 'desc'}>({
    campo: 'data_emissao',
    direcao: 'desc'
  });
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(10);
  const [pesquisaTabela, setPesquisaTabela] = useState("");
  const [editandoTipo, setEditandoTipo] = useState<number | null>(null);
  const [tipoTemp, setTipoTemp] = useState<string>("");
  const [salvandoTipo, setSalvandoTipo] = useState<number | null>(null);
  const [observacoesAtivas, setObservacoesAtivas] = useState<string | null>(null);

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

  // Lista única de clientes (com nome e CNPJ juntos)
  const clientesUnicos = useMemo(() =>
    Array.from(
      new Set(
        notasVendedor.map(
          (n) => `${n.cliente?.nome || "Não informado"} (${n.cliente?.cpf_cnpj || ""})`
        ).filter(Boolean)
      )
    ),
    [notasVendedor]
  );

  const produtosUnicos = useMemo(() =>
    Array.from(
      new Map(
        notasVendedor.flatMap(n =>
          n.itens?.map(i => [
            i.codigo, 
            { value: i.codigo, label: `${i.descricao} (${i.codigo})` }
          ]) || []
        )
      ).values()
    ),
    [notasVendedor]
  );

  // Aplicação dos filtros
  const notasFiltradas = useMemo(() => {
    let baseNotas = user?.role === "vendas" ? notasVendedor : notas;

    return baseNotas.filter(n => {
      const produtoOk =
        filtroProduto.length === 0 ||
        n.itens?.some(item =>
          filtroProduto.includes(`${item.descricao} (${item.codigo})`)
        );

      const clienteFormatado = `${n.cliente?.nome || "Não informado"} (${n.cliente?.cpf_cnpj || ""})`;
      const clienteOk =
        filtroCliente.length === 0 || filtroCliente.includes(clienteFormatado);

      const dataOk =
        (!dataInicio || new Date(n.data_emissao) >= new Date(dataInicio)) &&
        (!dataFim || new Date(n.data_emissao) <= new Date(dataFim));

      return produtoOk && clienteOk && dataOk;
    });
  }, [user?.role, notas, notasVendedor, filtroProduto, filtroCliente, dataInicio, dataFim]);


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
  const dadosEvolucao = useMemo(() => {
    const agrupado = notasFiltradas.reduce((acc: Record<string, number>, n) => {
      const data = new Date(n.data_emissao);
      const ano = data.getFullYear();
      const mes = data.getMonth();
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
          ordem: data.getTime(),
        };
      })
      .sort((a, b) => a.ordem - b.ordem);
  }, [notasFiltradas]);

  // Top produtos vendidos
  const topProdutos = useMemo(() => {
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

  // Distribuição por cliente
  const distribuicaoClientes = useMemo(() => {
    const agrupado = notasFiltradas.reduce((acc: any, n) => {
      const cliente = n.cliente?.nome || "Não informado";
      if (!acc[cliente]) acc[cliente] = 0;
      acc[cliente] += Number(n.valor_nota || 0);
      return acc;
    }, {});

    return Object.entries(agrupado)
      .map(([name, value]) => ({ name, value }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 8);
  }, [notasFiltradas]);

  // Tabela com pesquisa e ordenação
  const notasTabela = useMemo(() => {
    let filtradas = [...notasFiltradas];

    // Aplicar pesquisa
    if (pesquisaTabela) {
      const termoLower = pesquisaTabela.toLowerCase();
      const termoNormalizado = /^\d+$/.test(pesquisaTabela) ? normalizarCNPJ(pesquisaTabela) : "";

      filtradas = filtradas.filter(n => {
        const nome = n.cliente?.nome?.toLowerCase() || "";
        const cnpj = n.cliente?.cpf_cnpj?.toLowerCase() || "";
        const cnpjNormalizado = normalizarCNPJ(n.cliente?.cpf_cnpj || "");
        const email = n.cliente?.email?.toLowerCase() || "";
        const fone = n.cliente?.fone?.replace(/\D/g, "") || "";

        const termoFone = pesquisaTabela.replace(/\D/g, ""); // só dígitos

        return (
          nome.includes(termoLower) ||
          cnpj.includes(termoLower) ||
          (termoNormalizado && cnpjNormalizado.includes(termoNormalizado)) ||
          email.includes(termoLower) ||
          (termoFone && fone.includes(termoFone)) ||
          n.itens?.some(i => i.descricao?.toLowerCase().includes(termoLower)) ||
          n.valor_nota?.toString().includes(termoLower) ||
          n.tipo?.toLowerCase().includes(termoLower)
        );
      });
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
        case 'tipo':
          aVal = a.tipo || '';
          bVal = b.tipo || '';
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
      return `${(valor / 1_000_000).toFixed(1)}M`;
    } else if (valor >= 1_000) {
      return `${(valor / 1_000).toFixed(1)}K`;
    }
    return valor.toFixed(0);
  };

  // Função para alternar ordenação
  const alternarOrdenacao = (campo: string) => {
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
      await atualizarTipoNota(notaId, tipoTemp as "Outbound" | "Inbound" | "ReCompra");
      setEditandoTipo(null);
      setTipoTemp("");
    } catch (error) {
      console.error("Erro ao salvar tipo:", error);
      alert("Erro ao salvar o tipo da nota");
    } finally {
      setSalvandoTipo(null);
    }
  };

  // Exportação para Excel
  const exportarExcel = useCallback(() => {
    const dadosExport = notasTabela.map(n => ({
      'Data': new Date(n.data_emissao.split("-").reverse().join("/")),
      'Cliente': n.cliente?.nome || '',
      'CNPJ': n.cliente?.cpf_cnpj || '',
      'Valor': n.valor_nota,
      'Tipo': n.tipo || 'Não definido',
      'Produtos': n.itens?.map(i => i.descricao).join(', ') || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Minhas Vendas");
    XLSX.writeFile(wb, `vendas_${vendedorLogado}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [notasTabela, vendedorLogado]);

  // MultiSelect customizado
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

    const filteredOptions = options.filter((option) => {
      const optionLower = option.toLowerCase();
      const searchLower = searchTerm.toLowerCase();

      // Extrair CNPJ do texto
      const cnpjMatch = option.match(/\((.*?)\)/);
      const cnpj = cnpjMatch ? cnpjMatch[1] : "";
      const cnpjNormalizado = normalizarCNPJ(cnpj);

      // Se usuário digitou apenas números → normaliza
      const searchNormalizado = /^\d+$/.test(searchTerm) ? normalizarCNPJ(searchTerm) : "";

      return (
        optionLower.includes(searchLower) || // busca pelo nome
        cnpj.toLowerCase().includes(searchLower) || // busca CNPJ formatado
        (searchNormalizado && cnpjNormalizado.includes(searchNormalizado)) // busca CNPJ sem pontuação
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
            Carregando suas vendas...
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
        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-4 mb-6 border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Filtros
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Empresas (Clientes) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Empresas
              </label>
              <MultiSelect
                options={clientesUnicos}
                selected={filtroCliente}
                onChange={setFiltroCliente}
                placeholder="Todas as empresas"
              />
            </div>

            {/* Produtos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Produtos
              </label>
              <MultiSelect
                options={produtosUnicos.map(p => p.label)} // exibição
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
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
                        {Number(nota.valor_nota).toLocaleString("pt-BR", {
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
                      {nota.observacoes ? (
                        <button
                          onClick={() => setObservacoesAtivas(nota.observacoes!)}
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
                          onClick={() => iniciarEdicaoTipo(nota.id, nota.tipo)}
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
                ))}
                <ModalObservacoes
                  observacoes={observacoesAtivas}
                  onClose={() => setObservacoesAtivas(null)}
                />
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="mt-4">
              {/* Texto de registros */}
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 md:mb-0">
                Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a{" "}
                {Math.min(paginaAtual * itensPorPagina, notasTabela.length)} de{" "}
                {notasTabela.length} registros
              </div>

              {/* Desktop */}
              <div className="hidden md:flex justify-between items-center">
                <div></div> {/* placeholder só pra alinhar */}
                <div className="flex gap-2">
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
                      if (totalPaginas <= 5) pageNum = i + 1;
                      else if (paginaAtual <= 3) pageNum = i + 1;
                      else if (paginaAtual >= totalPaginas - 2) pageNum = totalPaginas - 4 + i;
                      else pageNum = paginaAtual - 2 + i;

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
              </div>

              {/* Mobile */}
              <div className="flex md:hidden justify-center gap-2 items-center mt-2">
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
      </div>
    </div>
  );
};

export default Vendedores;