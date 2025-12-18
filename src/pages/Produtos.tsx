import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useData } from "../context/DataContext";
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
  Hash,
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
    codigo: string;
    descricao: string;
    quantidade: string;
    valor_total: string;
    valor_unitario?: string;
  }[];
  observacoes?: string | null;
}

// Interface para dados agregados de produtos
interface ProdutoAgregado {
  codigo: string;
  descricao: string;
  quantidadeVendida: number;
  valorTotal: number;
  valorMedio: number;
  numeroVendas: number;
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

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};

const Produtos: React.FC = () => {
  const { user } = useAuth();
  const { notas, carregando } = useData();

  const isMobile = useIsMobile();

  // Estados dos filtros
  const [filtroEmpresa, setFiltroEmpresa] = useState<string[]>([]);
  const [filtroVendedor, setFiltroVendedor] = useState<string[]>([]);
  const [filtroProduto, setFiltroProduto] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [presetPeriodo, setPresetPeriodo] = useState("todos");

  // Estados da tabela
  const [ordenacao, setOrdenacao] = useState<{campo: string; direcao: 'asc' | 'desc'}>({
    campo: 'quantidadeVendida',
    direcao: 'desc'
  });
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(10);
  const [pesquisaTabela, setPesquisaTabela] = useState("");

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
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        inicio = primeiroDiaMes.toISOString().split("T")[0];
        fim = hoje.toISOString().split("T")[0];
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
    Array.from(
      new Map(
        notas.flatMap(n =>
          n.itens?.map(i => [
            i.codigo,
            `${i.descricao} (${i.codigo})`
          ]) || []
        )
      ).values()
    ),
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
      n.itens?.some(item =>
        filtroProduto.includes(`${item.descricao} (${item.codigo})`)
      );

      // Filtro de data
      const dataOk =
        (!dataInicio || new Date(n.data_emissao) >= new Date(dataInicio)) &&
        (!dataFim || new Date(n.data_emissao) <= new Date(dataFim));

      return empresaOk && vendedorOk && produtoOk && dataOk;
    });
  }, [notas, filtroEmpresa, filtroVendedor, filtroProduto, dataInicio, dataFim]);

  // Dados agregados de produtos
  const produtosAgregados = useMemo(() => {
    const agregado: Record<string, ProdutoAgregado & { notasIds: Set<number> }> = {};

    notasFiltradas.forEach(nota => {
      nota.itens?.forEach(item => {
        // Pula itens sem código
        if (!item.codigo) return;

        // Se tem filtro de produto ativo, só inclui itens que estão no filtro
        if (filtroProduto.length > 0) {
          const itemFiltrado = filtroProduto.includes(`${item.descricao} (${item.codigo})`);
          if (!itemFiltrado) return; // Pula itens que não estão no filtro
        }

        const key = item.codigo;
        if (!agregado[key]) {
          agregado[key] = {
            codigo: item.codigo,
            descricao: item.descricao,
            quantidadeVendida: 0,
            valorTotal: 0,
            valorMedio: 0,
            numeroVendas: 0,
            notasIds: new Set<number>(), // Armazena IDs únicos das notas
          };
        }

        agregado[key].quantidadeVendida += Number(item.quantidade || 0);
        agregado[key].valorTotal += Number(item.valor_total || 0);
        agregado[key].notasIds.add(nota.id); // Adiciona o ID da nota (Set garante unicidade)
      });
    });

    // Calcula valor médio e número de vendas (notas únicas)
    const resultado = Object.values(agregado).map(produto => {
      const { notasIds, ...produtoSemSet } = produto;
      return {
        ...produtoSemSet,
        valorMedio: produto.quantidadeVendida > 0
          ? produto.valorTotal / produto.quantidadeVendida
          : 0,
        numeroVendas: produto.notasIds.size, // Conta notas únicas
      };
    });

    return resultado;
  }, [notasFiltradas, filtroProduto]);

  // KPIs Calculados
  const kpis = useMemo(() => {
    const totalProdutosVendidos = produtosAgregados.reduce(
      (acc, p) => acc + p.quantidadeVendida,
      0
    );
    const totalFaturado = produtosAgregados.reduce(
      (acc, p) => acc + p.valorTotal,
      0
    );
    const ticketMedio = totalProdutosVendidos > 0
      ? totalFaturado / totalProdutosVendidos
      : 0;

    // Produto mais vendido (por quantidade)
    const produtoMaisVendido = produtosAgregados.reduce(
      (max, p) => (p.quantidadeVendida > (max?.quantidadeVendida || 0) ? p : max),
      produtosAgregados[0]
    );

    return {
      totalProdutosVendidos,
      totalFaturado,
      ticketMedio,
      produtoMaisVendido: produtoMaisVendido || null,
      totalProdutosUnicos: produtosAgregados.length,
    };
  }, [produtosAgregados]);

  // Dados para gráfico de evolução (quantidade de produtos vendidos por mês)
  const dadosEvolucao = useMemo(() => {
    const agrupadoMensal: Record<string, number> = {};

    notasFiltradas.forEach(nota => {
      const data = new Date(nota.data_emissao);
      const ano = data.getFullYear();
      const mes = data.getMonth();
      const chave = `${ano}-${mes}`;

      if (!agrupadoMensal[chave]) agrupadoMensal[chave] = 0;

      nota.itens?.forEach(item => {
        // Se tem filtro de produto ativo, só soma itens que estão no filtro
        if (filtroProduto.length > 0) {
          const itemFiltrado = filtroProduto.includes(`${item.descricao} (${item.codigo})`);
          if (!itemFiltrado) return; // Pula itens que não estão no filtro
        }

        agrupadoMensal[chave] += Number(item.quantidade || 0);
      });
    });

    const dadosMensais = Object.entries(agrupadoMensal)
      .map(([chave, total]) => {
        const [ano, mes] = chave.split("-");
        const data = new Date(Number(ano), Number(mes));
        return {
          mes: data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
          total,
          ordem: data.getTime(),
          ano: Number(ano),
        };
      })
      .sort((a, b) => a.ordem - b.ordem);

    // Se tiver mais de 24 meses, agrupa por ano
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
  }, [notasFiltradas, filtroProduto]);

  // Ranking de produtos por valor
  const rankingProdutosValor = useMemo(() => {
    return [...produtosAgregados]
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 10)
      .map(p => ({
        produto: p.descricao,
        valor: p.valorTotal,
      }));
  }, [produtosAgregados]);

  // Tabela com pesquisa e ordenação
  const produtosTabela = useMemo(() => {
    let filtrados = [...produtosAgregados];

    // Aplicar pesquisa
    if (pesquisaTabela) {
      const termoLower = pesquisaTabela.toLowerCase();
      filtrados = filtrados.filter(p => {
        return (
          p.descricao?.toLowerCase().includes(termoLower) ||
          p.codigo?.toLowerCase().includes(termoLower)
        );
      });
    }

    // Aplicar ordenação
    filtrados.sort((a, b) => {
      let aVal: any, bVal: any;

      switch(ordenacao.campo) {
        case 'descricao':
          aVal = a.descricao || '';
          bVal = b.descricao || '';
          break;
        case 'quantidadeVendida':
          aVal = a.quantidadeVendida;
          bVal = b.quantidadeVendida;
          break;
        case 'valorTotal':
          aVal = a.valorTotal;
          bVal = b.valorTotal;
          break;
        case 'valorMedio':
          aVal = a.valorMedio;
          bVal = b.valorMedio;
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

    return filtrados;
  }, [produtosAgregados, pesquisaTabela, ordenacao]);

  // Paginação
  const produtosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return produtosTabela.slice(inicio, fim);
  }, [produtosTabela, paginaAtual, itensPorPagina]);

  const totalPaginas = Math.ceil(produtosTabela.length / itensPorPagina);

  // Formatação de valores
  const formatarValorAbreviado = (valor: number) => {
    if (valor >= 1_000_000) {
      return `R$ ${(valor / 1_000_000).toFixed(1)}M`;
    } else if (valor >= 1_000) {
      return `R$ ${(valor / 1_000).toFixed(1)}K`;
    }
    return `R$ ${valor.toFixed(0)}`;
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
    const dadosExport = produtosTabela.map(p => ({
      'Código': p.codigo,
      'Produto': p.descricao,
      'Quantidade Vendida': p.quantidadeVendida,
      'Valor Total': p.valorTotal,
      'Valor Médio': p.valorMedio,
      'Número de Vendas': p.numeroVendas,
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, `produtos_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [produtosTabela]);

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

    const normalizar = (valor: string) => valor.replace(/\D/g, "").toLowerCase();

    const filteredOptions = options.filter((option) => {
      const optionLower = option.toLowerCase();
      const searchLower = searchTerm.toLowerCase();

      return optionLower.includes(searchLower);
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
            Carregando dados de produtos...
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
            Produtos - Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-200 mt-1">
            Bem-vindo, <span className="font-semibold">{user?.username}</span> ({user?.role})
          </p>
          <p className="text-gray-500 dark:text-gray-300 text-sm mt-2">
            Análise detalhada de produtos vendidos, quantidades, valores e performance.
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
                <option value="30dias">Mês atual</option>
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
          {/* Total de Produtos Vendidos */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Quantidade Total Vendida</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-yellow-300 mt-2">
                  {kpis.totalProdutosVendidos.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-yellow-300" />
              </div>
            </div>
          </div>

          {/* Faturamento Total */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Faturamento Total</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  R$ {kpis.totalFaturado.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Ticket Médio por Produto */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ticket Médio por Produto</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Produto Mais Vendido</p>
                <p
                  className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-2 truncate max-w-[180px]"
                  title={kpis.produtoMaisVendido?.descricao || "N/A"}
                >
                  {kpis.produtoMaisVendido?.descricao || "N/A"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  Qtd: {kpis.produtoMaisVendido?.quantidadeVendida?.toLocaleString("pt-BR") || "0"}
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
          {/* Evolução da Quantidade de Produtos Vendidos */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Evolução da Quantidade de Produtos Vendidos
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosEvolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-axis)" />
                <XAxis
                  dataKey="mes"
                  tick={{ fill: "var(--chart-text)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--chart-axis)" }}
                />
                <YAxis
                  tick={{ fill: "var(--chart-text)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--chart-axis)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: document.documentElement.classList.contains("dark")
                      ? "#1e293b"
                      : "#ffffff",
                    border: "1px solid var(--chart-axis)",
                    borderRadius: "8px",
                    color: "var(--chart-text)",
                  }}
                  itemStyle={{
                    color: document.documentElement.classList.contains("dark")
                      ? "#60a5fa"
                      : "#2563eb",
                  }}
                  labelStyle={{
                    color: document.documentElement.classList.contains("dark")
                      ? "#f9fafb"
                      : "#111827",
                  }}
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

          {/* Top 10 Produtos por Valor */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Top 10 Produtos (Valor)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rankingProdutosValor} barCategoryGap="20%">
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
                            maxWidth: "200px",
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                          }}
                        >
                          <p style={{ fontWeight: 600, marginBottom: "4px" }}>
                            {produto}
                          </p>
                          <p style={{ color: "#16a34a", fontSize: "14px" }}>
                            Valor: <br />
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
        </div>

        {/* Tabela de Produtos */}
        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 md:mb-0">
              Detalhamento de Produtos
            </h3>

            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              {/* Campo de pesquisa */}
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-300" />
                <input
                  type="text"
                  placeholder="Pesquisar produto..."
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
                  {/* Código */}
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => alternarOrdenacao("codigo")}
                  >
                    <div className="flex items-center">
                      <Hash className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Código
                      </span>
                    </div>
                  </th>

                  {/* Produto */}
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => alternarOrdenacao("descricao")}
                  >
                    <div className="flex items-center">
                      <Package className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Produto
                      </span>
                      {ordenacao.campo === "descricao" &&
                        (ordenacao.direcao === "desc" ? (
                          <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ) : (
                          <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ))}
                    </div>
                  </th>

                  {/* Quantidade */}
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => alternarOrdenacao("quantidadeVendida")}
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Quantidade
                      </span>
                      {ordenacao.campo === "quantidadeVendida" &&
                        (ordenacao.direcao === "desc" ? (
                          <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ) : (
                          <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ))}
                    </div>
                  </th>

                  {/* Valor Total */}
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => alternarOrdenacao("valorTotal")}
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Valor Total
                      </span>
                      {ordenacao.campo === "valorTotal" &&
                        (ordenacao.direcao === "desc" ? (
                          <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ) : (
                          <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ))}
                    </div>
                  </th>

                  {/* Valor Médio */}
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => alternarOrdenacao("valorMedio")}
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Valor Médio
                      </span>
                      {ordenacao.campo === "valorMedio" &&
                        (ordenacao.direcao === "desc" ? (
                          <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ) : (
                          <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ))}
                    </div>
                  </th>

                  {/* Número de Vendas */}
                  <th className="px-4 py-3 text-left">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Nº Vendas
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {produtosPaginados.map((produto, index) => (
                  <tr
                    key={produto.codigo}
                    className={`border-b border-gray-100 dark:border-gray-700 transition-colors
                      ${
                        index % 2 === 0
                          ? "bg-white dark:bg-slate-800"
                          : "bg-gray-50/50 dark:bg-slate-900"
                      } hover:bg-gray-50 dark:hover:bg-slate-700`}
                  >
                    {/* Código */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {produto.codigo}
                    </td>

                    {/* Produto */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                        {produto.descricao}
                      </p>
                    </td>

                    {/* Quantidade */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {produto.quantidadeVendida.toLocaleString("pt-BR")}
                    </td>

                    {/* Valor Total */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        R$ {produto.valorTotal.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </td>

                    {/* Valor Médio */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      R$ {produto.valorMedio.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    {/* Número de Vendas */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {produto.numeroVendas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="mt-4">
              {/* Texto de registros */}
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 md:mb-0">
                Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a{" "}
                {Math.min(paginaAtual * itensPorPagina, produtosTabela.length)} de{" "}
                {produtosTabela.length} produtos
              </div>

              {/* Desktop: paginação completa */}
              <div className="hidden md:flex justify-between items-center">
                <div></div>
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
              </div>

              {/* Mobile: somente < páginaAtual > */}
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

export default Produtos;
