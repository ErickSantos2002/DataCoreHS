import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useEstoque } from "../context/EstoqueContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Filter,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
  Activity,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import SolicitacaoComprasModal from "../components/SolicitacaoComprasModal";

// Tipagem do Produto do Estoque
interface ProdutoEstoque {
  id: number;
  nome: string;
  codigo: string;
  unidade: string;
  preco: number;
  saldo: number;
  situacao: "A" | "I";
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
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640); // 🔹 abaixo de 640px = mobile
    };

    handleResize(); // roda uma vez ao carregar
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};

const Estoque: React.FC = () => {
  const { user } = useAuth();
  const { produtos, carregando } = useEstoque();

  // Modal de solicitação de compra
  const [modalAberto, setModalAberto] = useState(false);
  const [solicitacao, setSolicitacao] = useState<{ id: number; quantidade: number }[]>([]);
  const abrirModal = () => setModalAberto(true);
  const fecharModal = () => setModalAberto(false);

  const isMobile = useIsMobile(); 
  // depois dos outros useState/useMemo...
  const chartRef = React.useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = React.useState<{ x: number; y: number } | undefined>(undefined);

  // ▼ controle dos tooltips dos dois PieCharts
  const [showPizzaDistribuicao, setShowPizzaDistribuicao] = useState(false);
  const [showPizzaSituacao, setShowPizzaSituacao] = useState(false);
  const pizzaDistribRef = useRef<HTMLDivElement>(null);
  const pizzaSituacaoRef = useRef<HTMLDivElement>(null);

  // fecha tooltip ao clicar fora
  useEffect(() => {
  // Aceita mouse OU touch
  const onDocClick: EventListener = (ev: Event) => {
    const target = ev.target as Node | null;
    if (!target) return;

    if (pizzaDistribRef.current && !pizzaDistribRef.current.contains(target)) {
      setShowPizzaDistribuicao(false);
    }
    if (pizzaSituacaoRef.current && !pizzaSituacaoRef.current.contains(target)) {
      setShowPizzaSituacao(false);
    }
  };

  // Registra com a MESMA referência usada no cleanup
  document.addEventListener("mousedown", onDocClick);
  document.addEventListener("touchstart", onDocClick, { passive: true });

  return () => {
    document.removeEventListener("mousedown", onDocClick);
    document.removeEventListener("touchstart", onDocClick);
  };
}, []);

  const atualizarQuantidade = (id: number, quantidade: number) => {
    setSolicitacao((prev) => {
      const existe = prev.find((item) => item.id === id);
      if (existe) {
        return prev.map((item) =>
          item.id === id ? { ...item, quantidade } : item
        );
      } else {
        return [...prev, { id, quantidade }];
      }
    });
  };

  // Estados dos filtros
  const [filtroProduto, setFiltroProduto] = useState<string[]>([]);
  const [filtroSituacao, setFiltroSituacao] = useState<string>("todos");
  const [filtroSaldo, setFiltroSaldo] = useState<string>("todos");
  const [filtroPersonalizado, setFiltroPersonalizado] = useState<string>("nenhum");
  const codigosRapidos = ["1", "3", "163", "4", "121", "210", "63", "119", "186", "156", "99", "320", "317", "318", "7", "80", "189", "128", "297", "15", "13", "21", "8", "22", "118", "117", "89", "173", "18"];

  // Estados da tabela
  const [ordenacao, setOrdenacao] = useState<{campo: string; direcao: 'asc' | 'desc'}>({
    campo: 'nome',
    direcao: 'asc'
  });
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(15);
  const [pesquisaTabela, setPesquisaTabela] = useState("");

  // Listas únicas para filtros
  const produtosUnicos = useMemo(
    () =>
      Array.from(
        new Map(
          produtos.map((p) => [p.codigo, { 
            value: p.codigo, 
            label: `${p.nome} (${p.codigo})` 
          }])
        ).values()
      ),
    [produtos]
  );

  // Aplicação dos filtros
  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      // Filtro de produto
      const produtoOk =
      filtroProduto.length === 0 || filtroProduto.includes(p.codigo);

      // Filtro de situação
      const situacaoOk = filtroSituacao === "todos" ||
        (filtroSituacao === "A" && p.situacao === "A") ||
        (filtroSituacao === "I" && p.situacao === "I");

      // Filtro de saldo
      const saldoOk = filtroSaldo === "todos" ||
        (filtroSaldo === "comSaldo" && p.saldo > 0) ||
        (filtroSaldo === "semSaldo" && p.saldo === 0) ||
        (filtroSaldo === "Negativo" && p.saldo < 0);

      // Filtro personalizado
      const personalizadoOk =
        filtroPersonalizado === "nenhum" ||
        (filtroPersonalizado === "rapido" &&
          codigosRapidos.includes(String(p.codigo)));

      return produtoOk && situacaoOk && saldoOk && personalizadoOk;
    });
  }, [produtos, filtroProduto, filtroSituacao, filtroSaldo, filtroPersonalizado]);

  // KPIs Calculados
  const kpis = useMemo(() => {
    const produtosAtivos = produtosFiltrados.filter(p => p.situacao === "A").length;
    const produtosSemSaldo = produtosFiltrados.filter(p => p.saldo === 0).length;
    const valorTotalEstoque = produtosFiltrados.reduce(
      (acc, p) => acc + (p.saldo * p.preco),
      0
    );

    // Produto com maior valor em estoque
    const produtoMaiorValor = produtosFiltrados
      .map(p => ({ ...p, valor: p.saldo * p.preco }))
      .sort((a, b) => b.valor - a.valor)[0];

    return {
      produtosAtivos,
      produtosSemSaldo,
      valorTotalEstoque,
      produtoTop: produtoMaiorValor ? {
        nome: produtoMaiorValor.nome,
        valor: produtoMaiorValor.valor,
        unidade: produtoMaiorValor.unidade,
        saldo: produtoMaiorValor.saldo
      } : null
    };
  }, [produtosFiltrados]);

  // Dados para ranking de produtos (Top 10)
  const rankingProdutos = useMemo(() => {
    return produtosFiltrados
      .filter(p => p.saldo > 0 && p.preco > 0)
      .map(p => ({
        nome: p.nome.length > 20 ? p.nome.substring(0, 20) + "..." : p.nome, // só para o eixo Y
        fullName: p.nome, // ✅ nome completo
        valor: p.saldo * p.preco,
        unidade: p.unidade
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [produtosFiltrados]);

  // Dados para distribuição de valor
  const distribuicaoValor = useMemo(() => {
    return produtosFiltrados
      .filter(p => p.saldo > 0 && p.preco > 0)
      .map(p => ({
        name: p.nome.length > 15 ? p.nome.substring(0, 15) + "..." : p.nome,
        fullName: p.nome, // ✅ adiciona o nome completo
        value: p.saldo * p.preco
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [produtosFiltrados]);


  // Dados para situação dos produtos
  const situacaoProdutos = useMemo(() => {
    const ativos = produtosFiltrados.filter(p => p.situacao === "A").length;
    const inativos = produtosFiltrados.filter(p => p.situacao === "I").length;
    
    return [
      { name: "Ativos", value: ativos },
      { name: "Inativos", value: inativos }
    ].filter(item => item.value > 0);
  }, [produtosFiltrados]);

  // Tabela com pesquisa e ordenação
  const produtosTabela = useMemo(() => {
    let filtrados = [...produtosFiltrados];

    // Aplicar pesquisa
    if (pesquisaTabela) {
      const termo = pesquisaTabela.toLowerCase();
      filtrados = filtrados.filter(p =>
        p.nome.toLowerCase().includes(termo) ||
        String(p.codigo).toLowerCase().includes(termo) ||  // corrigido
        p.unidade.toLowerCase().includes(termo)
      );
    }

    // Aplicar ordenação
    filtrados.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch(ordenacao.campo) {
        case 'nome':
          aVal = a.nome.toLowerCase();
          bVal = b.nome.toLowerCase();
          break;
        case 'codigo':
          aVal = a.codigo;
          bVal = b.codigo;
          break;
        case 'preco':
          aVal = a.preco;
          bVal = b.preco;
          break;
        case 'saldo':
          aVal = a.saldo;
          bVal = b.saldo;
          break;
        case 'situacao':
          aVal = a.situacao;
          bVal = b.situacao;
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
  }, [produtosFiltrados, pesquisaTabela, ordenacao]);

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
    return `R$ ${valor.toFixed(2)}`;
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
      'Nome': p.nome,
      'Código-SKU': p.codigo,
      'Unidade': p.unidade,
      'Preço': p.preco,
      'Saldo': p.saldo,
      'Situação': p.situacao === 'A' ? 'Ativo' : 'Inativo',
      'Valor Total': p.saldo * p.preco
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque");
    XLSX.writeFile(wb, `estoque_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [produtosTabela]);

  // Geração de PDF da solicitação de compra
  const gerarPDF = () => {
    const doc = new jsPDF();

    // Cabeçalho
    doc.setFontSize(16);
    doc.text("Solicitação de Compras", 14, 20);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);

    // Montar tabela
    const dadosTabela = solicitacao.map((item) => {
      const produto = produtos.find((p) => p.id === item.id);
      return [
        produto?.nome || "",
        produto?.saldo ?? 0,
        item.quantidade,
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [["Produto", "Saldo Atual", "Quantidade Solicitada"]],
      body: dadosTabela,
    });

    // Rodapé
    doc.setFontSize(12);
    doc.text(
      `Solicitante: ${user?.username || "Usuário"}`,
      14,
      doc.internal.pageSize.height - 10
    );

    // Salvar
    doc.save(`solicitacao_compras_${new Date().toISOString().split("T")[0]}.pdf`);
    fecharModal();
  };

  // Componente de MultiSelect customizado
  const MultiSelect = ({ 
    options, 
    selected, 
    onChange, 
    placeholder 
  }: {
    options: { value: string; label: string }[];
    selected: string[]; // só os códigos (values)
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
      const optionLower = option.label.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      return optionLower.includes(searchLower);
    });

    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 text-left border rounded-lg 
                    bg-white dark:bg-[#0f172a] 
                    hover:bg-gray-50 dark:hover:bg-[#1e293b] 
                    text-gray-700 dark:text-gray-200
                    border-gray-300 dark:border-gray-600
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className="text-sm">
            {selected.length > 0
              ? `${selected.length} selecionado(s)`
              : placeholder}
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 
                          bg-white dark:bg-[#0f172a] 
                          border dark:border-gray-600 
                          rounded-lg shadow-lg 
                          max-h-60 overflow-auto">
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 border rounded 
                          bg-white dark:bg-[#1e293b] 
                          text-gray-800 dark:text-gray-200
                          border-gray-300 dark:border-gray-600"
              />
            </div>
            <div className="p-2">
              <button
                onClick={() => onChange([])}
                className="w-full text-left px-2 py-1 text-sm 
                          text-gray-600 dark:text-gray-300
                          hover:bg-gray-100 dark:hover:bg-blue-700 
                          rounded"
              >
                Limpar seleção
              </button>
            </div>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <label key={option.value} className="flex items-center px-4 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={() => toggleOption(option.value)}
                    className="mr-2"
                  />
                  {option.label}
                </label>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-500">Nenhum resultado encontrado</div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-darkBlue">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Carregando dados do estoque...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkBlue transition-colors">
      <div className="p-6"> {/* 🔹 adiciona limite e centraliza */}
        {/* Cabeçalho */}
        <div className="bg-white dark:bg-[#0f172a] shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl transition-colors">
          <div className="px-6 py-4">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-yellow-400">
              Estoque - Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Bem-vindo, <span className="font-semibold">{user?.username}</span> ({user?.role})
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              Confira a posição atual do estoque e visualize os produtos disponíveis.
            </p>
          </div>
        </div>

        <div className="mt-6">
          {/* Filtros */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-4 mb-6 transition-colors">
            <div className="flex items-center mb-4">
              <Filter className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-300" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-yellow-400">
                Filtros
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

              {/* Situação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Situação
                </label>
                <select
                  value={filtroSituacao}
                  onChange={(e) => setFiltroSituacao(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg 
                            bg-white dark:bg-[#0f172a] 
                            text-gray-800 dark:text-gray-200 
                            border-gray-300 dark:border-gray-600
                            focus:outline-none focus:ring-2 focus:ring-blue-500 
                            transition-colors"
                >
                  <option value="todos">Todos</option>
                  <option value="A">Ativo</option>
                  <option value="I">Inativo</option>
                </select>
              </div>

              {/* Saldo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Saldo
                </label>
                <select
                  value={filtroSaldo}
                  onChange={(e) => setFiltroSaldo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg 
                            bg-white dark:bg-[#0f172a] 
                            text-gray-800 dark:text-gray-200 
                            border-gray-300 dark:border-gray-600
                            focus:outline-none focus:ring-2 focus:ring-blue-500 
                            transition-colors"
                >
                  <option value="todos">Todos</option>
                  <option value="comSaldo">Somente com saldo</option>
                  <option value="semSaldo">Somente sem saldo</option>
                  <option value="Negativo">Somente saldo negativo</option>
                </select>
              </div>

              {/* Filtros Personalizados */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Filtros Personalizados
                </label>
                <select
                  value={filtroPersonalizado}
                  onChange={(e) => setFiltroPersonalizado(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg 
                            bg-white dark:bg-[#0f172a] 
                            text-gray-800 dark:text-gray-200 
                            border-gray-300 dark:border-gray-600
                            focus:outline-none focus:ring-2 focus:ring-blue-500 
                            transition-colors"
                >
                  <option value="nenhum">Nenhum</option>
                  <option value="rapido">Principais</option>
                </select>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Produtos Ativos */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Produtos Ativos</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                    {kpis.produtosAtivos}
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/40 p-3 rounded-full">
                  <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            {/* Produtos sem Saldo */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Produtos sem Saldo</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                    {kpis.produtosSemSaldo}
                  </p>
                </div>
                <div className="bg-red-100 dark:bg-red-900/40 p-3 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>

            {/* Valor Total em Estoque */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Valor Total em Estoque</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                    R$ {kpis.valorTotalEstoque.toLocaleString("pt-BR", {
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

            {/* Produto com Maior Saldo */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Produto Top</p>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-2 truncate 
                                max-w-[180px] overflow-hidden whitespace-nowrap">
                    {kpis.produtoTop?.nome || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    R$ {kpis.produtoTop?.valor.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} ({kpis.produtoTop?.unidade})
                  </p>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900/40 p-3 rounded-full">
                  <Package className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top 10 Produtos */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Top 10 Produtos em Estoque
              </h3>

              <div ref={chartRef} className="relative">
                <ResponsiveContainer width="100%" height={isMobile ? 420 : 300}>
                  <BarChart
                    data={rankingProdutos}
                    layout="vertical"
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                    barCategoryGap={2}
                    onMouseMove={(state: any) => {
                      if (!state?.isTooltipActive) {
                        setTooltipPos(undefined);
                        return;
                      }
                      const tooltipW = isMobile ? 220 : 280; // mesma largura do conteúdo
                      const pad = 16;
                      const chartX = state.chartX ?? 0;
                      const chartY = state.chartY ?? 0;
                      const containerW = chartRef.current?.getBoundingClientRect().width ?? 0;

                      // Se estourar à direita, posiciona à esquerda do cursor
                      const x =
                        chartX + tooltipW + pad > containerW
                          ? Math.max(8, chartX - tooltipW - pad)
                          : chartX + pad;

                      const y = Math.max(8, chartY - 40); // levemente acima da barra
                      setTooltipPos({ x, y });
                    }}
                    onMouseLeave={() => setTooltipPos(undefined)}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />

                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatarValorAbreviado(v)}
                      stroke="#9ca3af"
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      type="category"
                      dataKey="nome"
                      width={isMobile ? 130 : 160}
                      tick={{ fontSize: isMobile ? 10 : 11 }}
                      tickFormatter={(name: string) =>
                        isMobile
                          ? (name.length > 12 ? `${name.substring(0, 12)}...` : name)
                          : (name.length > 18 ? `${name.substring(0, 18)}...` : name)
                      }
                      axisLine={false}
                      tickLine={false}
                      stroke="#9ca3af"
                    />

                    <Tooltip
                      position={tooltipPos}
                      offset={0}
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={{ overflow: "visible", pointerEvents: "none" }}
                      content={({ active, payload }) => {
                        if (!(active && payload && payload.length)) return null;
                        const { fullName, valor } = payload[0].payload; // usa nome completo
                        return (
                          <div
                            style={{
                              backgroundColor: "#ffffff",               // mantém cor clara tb no dark
                              border: "1px solid #d1d5db",
                              borderRadius: 8,
                              padding: "8px 12px",
                              maxWidth: isMobile ? 220 : 280,
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              color: "#111827",
                              fontSize: isMobile ? "12px" : "13px",
                              lineHeight: 1.35,
                              boxShadow: "0 10px 20px rgba(0,0,0,.15)",
                            }}
                          >
                            <p style={{ fontWeight: 600, marginBottom: 6 }}>{fullName}</p>
                            <p style={{ color: "#0284c7" }}>
                              valor:<br />
                              {typeof valor === "number"
                                ? `R$ ${valor.toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`
                                : "N/A"}
                            </p>
                          </div>
                        );
                      }}
                    />

                    <Bar dataKey="valor" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribuição de Valor */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Distribuição de Valor em Estoque
              </h3>

              <div
                ref={pizzaDistribRef}
                onMouseLeave={() => setShowPizzaDistribuicao(false)}
                className="relative"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart
                    onClick={() => setShowPizzaDistribuicao(true)} // mobile: abre no tap
                    onMouseEnter={() => !isMobile && setShowPizzaDistribuicao(true)} // desktop: abre no hover
                  >
                    <Pie
                      data={distribuicaoValor}
                      cx="50%"
                      cy="50%"
                      label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      onMouseLeave={() => setShowPizzaDistribuicao(false)}
                      isAnimationActive={false}
                    >
                      {distribuicaoValor.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CORES_GRAFICO[index % CORES_GRAFICO.length]}
                          onClick={() => setShowPizzaDistribuicao(true)} // garante no tap
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      trigger={isMobile ? "click" : "hover"}
                      wrapperStyle={{
                        maxWidth: 260,
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                      }}
                      content={({ active, payload }) => {
                        if (!showPizzaDistribuicao) return null;     // ✨ controlado
                        if (active && payload && payload.length) {
                          const { fullName, value } = payload[0].payload;
                          return (
                            <div
                              style={{
                                background: "#fff",
                                border: "1px solid #d1d5db",
                                borderRadius: 8,
                                color: "#111827",
                                padding: "8px 12px",
                                maxWidth: 240,
                                whiteSpace: "normal",
                              }}
                            >
                              <p style={{ fontWeight: 600, marginBottom: 4 }}>{fullName}</p>
                              <p style={{ color: "#0284c7" }}>
                                valor: R$ {value.toLocaleString("pt-BR", {
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
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div> 
            
            {/* Situação dos Produtos */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Situação dos Produtos
              </h3>

              <div
                ref={pizzaSituacaoRef}
                onMouseLeave={() => setShowPizzaSituacao(false)}
                className="relative"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart
                    onClick={() => setShowPizzaSituacao(true)}
                    onMouseEnter={() => !isMobile && setShowPizzaSituacao(true)}
                  >
                    <Pie
                      data={situacaoProdutos}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      onMouseLeave={() => setShowPizzaSituacao(false)}
                      isAnimationActive={false}
                    >
                      {situacaoProdutos.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.name === "Ativos" ? CORES.verde : CORES.vermelho}
                          onClick={() => setShowPizzaSituacao(true)}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      trigger={isMobile ? "click" : "hover"}
                      wrapperStyle={{ maxWidth: 260, whiteSpace: "normal", wordWrap: "break-word" }}
                      content={({ active, payload }) => {
                        if (!showPizzaSituacao) return null;       // ✨ controlado
                        if (active && payload && payload.length) {
                          const { name, value, percent } = payload[0].payload;
                          return (
                            <div
                              style={{
                                background: "#fff",
                                border: "1px solid #d1d5db",
                                borderRadius: 8,
                                color: "#111827",
                                padding: "8px 12px",
                                maxWidth: 240,
                              }}
                            >
                              <p style={{ fontWeight: 600, marginBottom: 4 }}>{name}</p>
                              <p style={{ color: "#0284c7" }}>Quantidade: {value}</p>
                              <p style={{ color: "#16a34a" }}>{(percent * 100).toFixed(0)}%</p>
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

            {/* Estatísticas Adicionais */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Estatísticas do Estoque
              </h3>

              <div className="space-y-1">
                {[
                  {
                    label: "Total de Produtos",
                    value: produtosFiltrados.length,
                    className: "text-gray-900 dark:text-gray-100",
                  },
                  {
                    label: "Preço Médio",
                    value: `R$ ${
                      produtosFiltrados.length > 0
                        ? (
                            produtosFiltrados.reduce((acc, p) => acc + p.preco, 0) /
                            produtosFiltrados.length
                          ).toFixed(2)
                        : "0,00"
                    }`,
                    className: "text-gray-900 dark:text-gray-100",
                  },
                  {
                    label: "Saldo Médio",
                    value: produtosFiltrados.length > 0
                      ? (
                          produtosFiltrados.reduce((acc, p) => acc + p.saldo, 0) /
                          produtosFiltrados.length
                        ).toFixed(1)
                      : "0",
                    className: "text-gray-900 dark:text-gray-100",
                  },
                  {
                    label: "Maior Preço",
                    value: `R$ ${
                      produtosFiltrados.length > 0
                        ? Math.max(...produtosFiltrados.map((p) => p.preco)).toFixed(2)
                        : "0,00"
                    }`,
                    className: "text-blue-600 dark:text-blue-400",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`flex justify-between px-3 py-2 rounded transition-colors ${
                      i % 2 === 0 ? "bg-gray-50 dark:bg-[#1e293b]" : ""
                    }`}
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.label}
                    </span>
                    <span className={`text-sm font-semibold ${item.className}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabela de Produtos */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 md:mb-0">
                Detalhamento do Estoque
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
                              bg-white dark:bg-[#0f172a]
                              text-gray-800 dark:text-gray-200
                              border-gray-300 dark:border-gray-600
                              placeholder-gray-400 dark:placeholder-gray-500
                              transition-colors"
                  />
                </div>

                {/* Botão Exportar */}
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

                {/* Botão Solicitação */}
                <button
                  onClick={abrirModal}
                  className="flex items-center justify-center px-4 py-2 
                            bg-blue-600 text-white rounded-lg 
                            hover:bg-blue-700 dark:hover:bg-blue-500 
                            transition-colors"
                >
                  Solicitação de Compras
                </button>

                {/* Modal */}
                <SolicitacaoComprasModal
                  aberto={modalAberto}
                  fechar={() => setModalAberto(false)}
                  produtos={produtos}
                  solicitante={user?.username || "Usuário"}
                />
              </div>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e293b]"
                      onClick={() => alternarOrdenacao("nome")}
                    >
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Nome
                        </span>
                        {ordenacao.campo === "nome" &&
                          (ordenacao.direcao === "desc" ? (
                            <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e293b]"
                      onClick={() => alternarOrdenacao("codigo")}
                    >
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Código-SKU
                        </span>
                        {ordenacao.campo === "codigo" &&
                          (ordenacao.direcao === "desc" ? (
                            <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ))}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Unidade
                      </span>
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e293b]"
                      onClick={() => alternarOrdenacao("preco")}
                    >
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Preço
                        </span>
                        {ordenacao.campo === "preco" &&
                          (ordenacao.direcao === "desc" ? (
                            <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e293b]"
                      onClick={() => alternarOrdenacao("saldo")}
                    >
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Saldo
                        </span>
                        {ordenacao.campo === "saldo" &&
                          (ordenacao.direcao === "desc" ? (
                            <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e293b]"
                      onClick={() => alternarOrdenacao("situacao")}
                    >
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Situação
                        </span>
                        {ordenacao.campo === "situacao" &&
                          (ordenacao.direcao === "desc" ? (
                            <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ))}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Valor Total
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {produtosPaginados.map((produto, index) => (
                    <tr
                      key={produto.id}
                      className={`border-b border-gray-100 dark:border-gray-700 
                                  hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-colors ${
                                    index % 2 === 0
                                      ? "bg-white dark:bg-[#0f172a]"
                                      : "bg-gray-50/50 dark:bg-[#1e293b]/40"
                                  }`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {produto.nome}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {produto.codigo}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {produto.unidade}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          R${" "}
                          {produto.preco.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-semibold ${
                            produto.saldo > 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {produto.saldo.toLocaleString("pt-BR")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            produto.situacao === "A"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400"
                          }`}
                        >
                          {produto.situacao === "A" ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                          R${" "}
                          {(produto.saldo * produto.preco).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
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
                  {produtosTabela.length} registros
                </div>

                {/* Desktop */}
                <div className="hidden md:flex justify-between items-center">
                  <div></div> {/* placeholder só pra alinhar */}
                  <div className="flex gap-2">
                    {/* Botão Anterior */}
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

                    {/* Números de página */}
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

                    {/* Botão Próximo */}
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

                  <span className="px-3 py-1 border rounded-lg 
                    bg-white dark:bg-slate-800 
                    text-gray-700 dark:text-gray-300
                    border-gray-300 dark:border-gray-600">
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
    </div>
  );
};

export default Estoque;