import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
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
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Users,
  UserX,
  Star,
  TrendingUp,
  Filter,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
  Calendar,
  DollarSign,
  ShoppingBag,
  Phone,
  Mail,
} from "lucide-react";
import * as XLSX from "xlsx";
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

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
};


const Clientes: React.FC = () => {
  const { user } = useAuth();
  const { clientes, clientesEnriquecidos, carregando, notas } = useData();

  // Estados dos filtros
  const [filtroCliente, setFiltroCliente] = useState<string[]>([]);
  const [filtroProduto, setFiltroProduto] = useState<string[]>([]);
  const [filtroVendedor, setFiltroVendedor] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [presetPeriodo, setPresetPeriodo] = useState("todos");

  const isMobile = useIsMobile();
  const chartRef = React.useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = React.useState<{ x: number; y: number } | undefined>(undefined);

  // Estados da tabela
  const [ordenacao, setOrdenacao] = useState<{campo: string; direcao: 'asc' | 'desc'}>({
    campo: 'ultimaCompra',
    direcao: 'desc'
  });
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(15);
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
  const clientesUnicos = useMemo(() =>
    Array.from(
      new Map(
        clientesEnriquecidos.map(c => [
          c.cpf_cnpj.replace(/\D/g, ""), // chave única normalizada
          {
            value: c.cpf_cnpj.replace(/\D/g, ""), // esse vira o value único
            label: `${c.nome} (${c.cpf_cnpj})`
          }
        ])
      ).values()
    ),
    [clientesEnriquecidos]
  );

  const produtosUnicos = useMemo(() =>
    Array.from(
      new Map(
        notas.flatMap(v =>
          v.itens?.map(i => [
            i.codigo,
            `${i.descricao} (${i.codigo})`
          ]) || []
        )
      ).values()
    ),
    [notas]
  );

  const vendedoresUnicos = useMemo(() =>
    Array.from(new Set(notas.map(v => v.nome_vendedor).filter(Boolean))),
    [notas]
  );

  // notas filtradas por período
  const notasFiltradas = useMemo(() => {
    return notas.filter(v => {
      const dataOk =
        (!dataInicio || new Date(v.data_emissao) >= new Date(dataInicio)) &&
        (!dataFim || new Date(v.data_emissao) <= new Date(dataFim));
      
      const vendedorOk = 
        filtroVendedor.length === 0 || filtroVendedor.includes(v.nome_vendedor);
      
      const produtoOk =
        filtroProduto.length === 0 ||
        v.itens?.some(item => filtroProduto.includes(`${item.descricao} (${item.codigo})`));

      return dataOk && vendedorOk && produtoOk;
    });
  }, [notas, dataInicio, dataFim, filtroVendedor, filtroProduto]);

  // Em Clientes.tsx
  const faturamentoTotalPeriodo = notasFiltradas.reduce(
    (acc, n) => acc + Number(n.valor_nota || 0),
    0
  );

  // Função para normalizar CNPJs/CPFs, igual a Vendas
  const normalizarCNPJ = (cnpj: string) => cnpj.replace(/\D/g, "");

  // Clientes filtrados e enriquecidos com dados do período
  const clientesFiltrados = useMemo(() => {
    const clientesComDadosPeriodo = clientesEnriquecidos.map(cliente => {
      const cpfCnpjNormalizado = cliente.cpf_cnpj.replace(/\D/g, '');

      const notasClientePeriodo = notasFiltradas.filter(v => {
        if (!v.cliente) return false;
        const vendaCpfCnpjNormalizado = v.cliente.cpf_cnpj.replace(/\D/g, '');
        return vendaCpfCnpjNormalizado === cpfCnpjNormalizado;
      });

      const totalCompradoPeriodo = notasClientePeriodo.reduce(
        (acc, v) => acc + Number(v.valor_nota || 0), 0
      );
      const numeroComprasPeriodo = notasClientePeriodo.length;
      const ticketMedioPeriodo = numeroComprasPeriodo > 0 
        ? totalCompradoPeriodo / numeroComprasPeriodo 
        : 0;

      const ultimaCompra = notasClientePeriodo.length > 0
        ? new Date(
            Math.max(...notasClientePeriodo.map(v => new Date(v.data_emissao).getTime()))
          )
        : null;

      return {
        ...cliente,
        cpfCnpjNormalizado,
        totalCompradoPeriodo,
        numeroComprasPeriodo,
        ticketMedioPeriodo,
        notasPeriodo: notasClientePeriodo,
        ultimaCompra
      };
    });

    // 🔑 Consolidar por CPF/CNPJ
    const clientesUnificados = Object.values(
      clientesComDadosPeriodo.reduce((acc, c) => {
        if (!acc[c.cpfCnpjNormalizado]) {
          acc[c.cpfCnpjNormalizado] = { ...c };
        } else {
          acc[c.cpfCnpjNormalizado].totalCompradoPeriodo += c.totalCompradoPeriodo;
          acc[c.cpfCnpjNormalizado].numeroComprasPeriodo += c.numeroComprasPeriodo;
          acc[c.cpfCnpjNormalizado].ticketMedioPeriodo = 
            acc[c.cpfCnpjNormalizado].numeroComprasPeriodo > 0
              ? acc[c.cpfCnpjNormalizado].totalCompradoPeriodo / acc[c.cpfCnpjNormalizado].numeroComprasPeriodo
              : 0;
        }
        return acc;
      }, {} as Record<string, any>)
    );

    // 🔥 Só mantém clientes que têm pelo menos 1 compra no período
    const clientesComCompras = clientesUnificados.filter(c => c.numeroComprasPeriodo > 0);

    return filtroCliente.length > 0
      ? clientesComCompras.filter(c => filtroCliente.includes(c.cpf_cnpj.replace(/\D/g, "")))
      : clientesComCompras;
  }, [clientesEnriquecidos, notasFiltradas, filtroCliente]);

  const { clientesAtivos, clientesInativos, totalClientes } = useMemo(() => {
    // Mapeia todos os clientes, não só os filtrados
    const clientesComDadosPeriodo = clientesEnriquecidos.map(cliente => {
      const cpfCnpjNormalizado = cliente.cpf_cnpj.replace(/\D/g, '');

      const notasClientePeriodo = notasFiltradas.filter(v => {
        if (!v.cliente) return false;
        const vendaCpfCnpjNormalizado = v.cliente.cpf_cnpj.replace(/\D/g, '');
        return vendaCpfCnpjNormalizado === cpfCnpjNormalizado;
      });

      return {
        ...cliente,
        numeroComprasPeriodo: notasClientePeriodo.length,
      };
    });

    // Ativos = pelo menos 1 compra
    const clientesAtivos = clientesComDadosPeriodo.filter(c => c.numeroComprasPeriodo > 0);
    const clientesInativos = clientesComDadosPeriodo.filter(c => c.numeroComprasPeriodo === 0);

    return {
      clientesAtivos,
      clientesInativos,
      totalClientes: clientesComDadosPeriodo.length
    };
  }, [clientesEnriquecidos, notasFiltradas]);

  // KPIs: Ativos/Inativos por janelas de 90 dias (independente do período selecionado)
  const kpis = useMemo(() => {
    // Limite de 90 dias a partir de hoje
    const hoje = new Date();
    const limite90 = new Date(hoje);
    limite90.setDate(hoje.getDate() - 90);
    const limiteTs = limite90.getTime();

    // Clientes ativos no período (compraram nos últimos 90 dias)
    const ativos90 = clientesFiltrados.filter(c => {
      if (!c.ultimaCompra) return false;
      return c.ultimaCompra.getTime() >= limiteTs;
    }).length;

    // Inativos = clientes que compraram no período, mas não nos últimos 90 dias
    const inativos90 = clientesFiltrados.length - ativos90;

    // Top cliente no período (já respeita filtros)
    const topCliente = clientesFiltrados
      .filter(c => c.totalCompradoPeriodo > 0)
      .sort((a, b) => b.totalCompradoPeriodo - a.totalCompradoPeriodo)[0];

    // Ticket médio por cliente no período
    const clientesComCompras = clientesFiltrados.filter(c => c.numeroComprasPeriodo > 0);
    const ticketMedioPorCliente = clientesComCompras.length > 0
      ? clientesComCompras.reduce((acc, c) => acc + c.ticketMedioPeriodo, 0) / clientesComCompras.length
      : 0;

    return {
      clientesAtivos: ativos90,
      clientesInativos: inativos90,
      topCliente,
      ticketMedioPorCliente
    };
  }, [clientesFiltrados]);

  // Dados para ranking de clientes (Top 10)
  const rankingClientes = useMemo(() => {
    return clientesFiltrados
      .filter((c) => c.totalCompradoPeriodo > 0)
      .sort((a, b) => b.totalCompradoPeriodo - a.totalCompradoPeriodo)
      .slice(0, 10)
      .map((c) => ({
        nome: c.nome.length > 20 ? c.nome.substring(0, 20) + "..." : c.nome, // exibido no gráfico
        nomeCompleto: c.nome, // 🔑 tooltip mostra inteiro
        valor: c.totalCompradoPeriodo,
      }));
  }, [clientesFiltrados]);

  // Dados para evolução por cliente
  const evolucaoPorCliente = useMemo(() => {
    // Pegar top 5 clientes
    const topClientes = clientesFiltrados
      .filter(c => c.totalCompradoPeriodo > 0)
      .sort((a, b) => b.totalCompradoPeriodo - a.totalCompradoPeriodo)
      .slice(0, 5);

    // Agrupar notas por mês para cada cliente
    const mesesUnicos = new Set<string>();
    const dadosPorCliente: any = {};

    topClientes.forEach(cliente => {
      const cpfCnpjNormalizado = cliente.cpf_cnpj.replace(/\D/g, '');
      dadosPorCliente[cliente.nome] = {};

      notasFiltradas.forEach(venda => {
        if (!venda.cliente) return;
        const vendaCpfCnpjNormalizado = venda.cliente.cpf_cnpj.replace(/\D/g, '');
        
        if (vendaCpfCnpjNormalizado === cpfCnpjNormalizado ||
            venda.cliente.nome.toLowerCase() === cliente.nome.toLowerCase()) {
          const data = new Date(venda.data_emissao);
          const mesAno = `${data.getMonth() + 1}/${data.getFullYear()}`;
          mesesUnicos.add(mesAno);
          
          if (!dadosPorCliente[cliente.nome][mesAno]) {
            dadosPorCliente[cliente.nome][mesAno] = 0;
          }
          dadosPorCliente[cliente.nome][mesAno] += Number(venda.valor_nota);
        }
      });
    });

    // Converter para formato do gráfico
    const mesesOrdenados = Array.from(mesesUnicos).sort((a, b) => {
      const [mesA, anoA] = a.split('/').map(Number);
      const [mesB, anoB] = b.split('/').map(Number);
      return anoA - anoB || mesA - mesB;
    });

    return mesesOrdenados.map(mes => {
      const dataPoint: any = { mes };
      Object.keys(dadosPorCliente).forEach(cliente => {
        dataPoint[cliente] = dadosPorCliente[cliente][mes] || 0;
      });
      return dataPoint;
    });
  }, [clientesFiltrados, notasFiltradas]);

  // Dados para distribuição de faturamento
  const distribuicaoFaturamento = useMemo(() => {
    const clientesComValor = clientesFiltrados
      .filter(c => c.totalCompradoPeriodo > 0)
      .sort((a, b) => b.totalCompradoPeriodo - a.totalCompradoPeriodo);

    const top8 = clientesComValor.slice(0, 8);
    const outros = clientesComValor.slice(8);

    const dadosGrafico = top8.map(c => ({
      name: c.nome.length > 15 ? c.nome.substring(0, 15) + "..." : c.nome,
      value: c.totalCompradoPeriodo
    }));

    if (outros.length > 0) {
      const valorOutros = outros.reduce((acc, c) => acc + c.totalCompradoPeriodo, 0);
      dadosGrafico.push({ name: "Outros", value: valorOutros });
    }

    return dadosGrafico;
  }, [clientesFiltrados]);

  // Tabela com pesquisa e ordenação
  const clientesTabela = useMemo(() => {
    let filtrados = [...clientesFiltrados];

    // Aplicar pesquisa
    if (pesquisaTabela) {
      const termoLower = pesquisaTabela.toLowerCase();
      const termoNumerico = pesquisaTabela.replace(/\D/g, ""); // só números

      filtrados = filtrados.filter(c => {
        const nomeLower = c.nome?.toLowerCase() || "";
        const cnpjLower = c.cpf_cnpj?.toLowerCase() || "";
        const cnpjNumerico = c.cpf_cnpj?.replace(/\D/g, "") || "";
        const emailLower = c.email?.toLowerCase() || "";
        const fone = c.fone || "";

        return (
          nomeLower.includes(termoLower) ||   // letras -> nome
          emailLower.includes(termoLower) ||  // letras -> email
          fone.includes(termoLower) ||        // números/letras -> telefone
          cnpjLower.includes(termoLower) ||   // letras/números -> CNPJ cru
          (termoNumerico && cnpjNumerico.includes(termoNumerico)) // números -> CNPJ normalizado
        );
      });
    }

    // Aplicar ordenação
    filtrados.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch(ordenacao.campo) {
        case 'nome':
          aVal = a.nome.toLowerCase();
          bVal = b.nome.toLowerCase();
          break;
        case 'ultimaCompra':
          aVal = a.ultimaCompra?.getTime() || 0;
          bVal = b.ultimaCompra?.getTime() || 0;
          break;
        case 'totalComprado':
          aVal = a.totalCompradoPeriodo;
          bVal = b.totalCompradoPeriodo;
          break;
        case 'numeroCompras':
          aVal = a.numeroComprasPeriodo;
          bVal = b.numeroComprasPeriodo;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
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
  }, [clientesFiltrados, pesquisaTabela, ordenacao]);

  // Paginação
  const clientesPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return clientesTabela.slice(inicio, fim);
  }, [clientesTabela, paginaAtual, itensPorPagina]);

  const totalPaginas = Math.ceil(clientesTabela.length / itensPorPagina);

  // Função para alternar ordenação
  const alternarOrdenacao = (campo: string) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Formatação de valores
  const formatarValorAbreviado = (valor: number) => {
    if (valor >= 1_000_000) {
      return `R$ ${(valor / 1_000_000).toFixed(1)}M`;
    } else if (valor >= 1_000) {
      return `R$ ${(valor / 1_000).toFixed(1)}K`;
    }
    return `R$ ${valor.toFixed(2)}`;
  };

  // Exportação para Excel
  const exportarExcel = useCallback(() => {
    const dadosExport = clientesTabela.map(c => ({
      'Nome': c.nome,
      'CPF/CNPJ': c.cpf_cnpj,
      'Email': c.email || '',
      'Telefone': c.fone || '',
      'Última Compra': c.ultimaCompra ? c.ultimaCompra.toLocaleDateString('pt-BR') : 'Nunca',
      'Total Comprado': c.totalCompradoPeriodo,
      'Número de Compras': c.numeroComprasPeriodo,
      'Ticket Médio': c.ticketMedioPeriodo,
      'Status': c.status === 'ativo' ? 'Ativo' : 'Inativo'
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, `clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [clientesTabela]);

  // Exportação para PDF
  const exportarPDF = useCallback(() => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(16);
    doc.text("Relatório de Clientes", 14, 20);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
    doc.text(`Usuário: ${user?.username}`, 14, 34);

    // Dados para tabela
    const dadosTabela = clientesTabela.slice(0, 30).map(c => [
      c.nome.substring(0, 25),
      c.cpf_cnpj,
      c.ultimaCompra ? c.ultimaCompra.toLocaleDateString('pt-BR') : 'Nunca',
      `R$ ${c.totalCompradoPeriodo.toFixed(2)}`,
      c.status === 'ativo' ? 'Ativo' : 'Inativo'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Nome", "CPF/CNPJ", "Última Compra", "Total", "Status"]],
      body: dadosTabela,
    });

    doc.save(`clientes_${new Date().toISOString().split("T")[0]}.pdf`);
  }, [clientesTabela, user]);

  // Componente de MultiSelect customizado
  const MultiSelect = ({ 
    options, 
    selected, 
    onChange, 
    placeholder 
  }: {
    options: { value: string; label: string }[];
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

    const toggleOption = (value: string) => {
      if (selected.includes(value)) {
        onChange(selected.filter(s => s !== value));
      } else {
        onChange([...selected, value]);
      }
    };

    const filteredOptions = options.filter((option) => {
      const searchLower = searchTerm.toLowerCase();
      const labelLower = option.label.toLowerCase();
      const valueLower = option.value.toLowerCase(); // mantém texto original
      const valueNormalizado = option.value.replace(/\D/g, '');
      const searchNormalizado = searchTerm.replace(/\D/g, '');

      return (
        labelLower.includes(searchLower) ||     // pesquisa no label (nome/descrição)
        valueLower.includes(searchLower) ||     // pesquisa no value cru (nome/descrição)
        (searchNormalizado && valueNormalizado.includes(searchNormalizado)) // pesquisa numérica
      );
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
                <label key={option.value} className="flex items-center px-4 py-2 cursor-pointer 
                                                     hover:bg-gray-100 dark:hover:bg-gray-700">
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={() => toggleOption(option.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">{option.label}</span>
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
            Carregando dados dos clientes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkBlue transition-colors">
      <div className="p-6">
        {/* Cabeçalho */}
        <div className="bg-white dark:bg-[#0f172a] shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl transition-colors">
          <div className="px-6 py-4">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-yellow-400">
              Clientes - Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Bem-vindo, <span className="font-semibold">{user?.username}</span> ({user?.role})
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              Visualize seus principais clientes e oportunidades de reativação.
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cliente
                </label>
                <MultiSelect
                  options={clientesUnicos}
                  selected={filtroCliente}
                  onChange={setFiltroCliente}
                  placeholder="Todos os clientes"
                />
              </div>

              {/* Vendedor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vendedor
                </label>
                <MultiSelect
                  options={vendedoresUnicos.map(v => ({ value: v, label: v }))}
                  selected={filtroVendedor}
                  onChange={setFiltroVendedor}
                  placeholder="Todos os vendedores"
                />
              </div>

              {/* Produto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Produto
                </label>
                <MultiSelect
                  options={produtosUnicos.map(p => ({ value: p, label: p }))}
                  selected={filtroProduto}
                  onChange={setFiltroProduto}
                  placeholder="Todos os produtos"
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
                            dark:bg-[#1e3a8a] dark:text-white
                            border-gray-300 dark:border-gray-600
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
                            dark:bg-[#1e3a8a] dark:text-white
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
                            dark:bg-[#1e3a8a] dark:text-white
                            border-gray-300 dark:border-gray-600
                            focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Clientes Ativos */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Clientes Ativos</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                    {kpis.clientesAtivos}
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/40 p-3 rounded-full">
                  <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            {/* Clientes Inativos */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Inativos (90 dias)</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                    {kpis.clientesInativos}
                  </p>
                </div>
                <div className="bg-red-100 dark:bg-red-900/40 p-3 rounded-full">
                  <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>

            {/* Top Cliente */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Top Cliente</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-2 truncate 
                                max-w-[180px] overflow-hidden whitespace-nowrap"
                     title={kpis.topCliente?.nome || "N/A"}>
                    {kpis.topCliente?.nome || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {kpis.topCliente ? formatarValorAbreviado(kpis.topCliente.totalCompradoPeriodo) : "R$ 0"}
                  </p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-full">
                  <Star className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {/* Ticket Médio */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Ticket Médio/Cliente</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                    R$ {kpis.ticketMedioPorCliente.toLocaleString("pt-BR", {
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
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Ranking de Clientes */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Top 10 Clientes
              </h3>

              {/* wrapper para medir a largura do gráfico */}
              <div ref={chartRef} className="relative">
                <ResponsiveContainer width="100%" height={isMobile ? 420 : 300}>
                  <BarChart
                    data={rankingClientes}
                    layout="vertical"
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                    barCategoryGap={2}
                    onMouseMove={(state: any) => {
                      if (!state?.isTooltipActive) {
                        setTooltipPos(undefined);
                        return;
                      }
                      const tooltipW = isMobile ? 220 : 280;     // mesma largura que usamos no conteúdo
                      const padding = 16;                        // afastar do cursor/borda
                      const chartX = state.chartX ?? 0;
                      const chartY = state.chartY ?? 0;
                      const containerW = chartRef.current?.getBoundingClientRect().width ?? 0;

                      // Se estourar à direita, mostra à esquerda do cursor; senão, à direita
                      const x =
                        chartX + tooltipW + padding > containerW
                          ? Math.max(8, chartX - tooltipW - padding)
                          : chartX + padding;

                      // Altura com pequeno deslocamento para não cobrir a barra
                      const y = Math.max(8, chartY - 40);

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
                      dataKey="nomeCompleto"
                      width={isMobile ? 130 : 160}
                      tick={{ fontSize: isMobile ? 10 : 11 }}
                      tickFormatter={(name: string) =>
                        isMobile
                          ? name.length > 12 ? `${name.substring(0, 12)}...` : name
                          : name.length > 18 ? `${name.substring(0, 18)}...` : name
                      }
                      axisLine={false}
                      tickLine={false}
                      stroke="#9ca3af"
                    />

                    <Tooltip
                      position={tooltipPos}     // 🔥 posição controlada
                      offset={0}
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={{ overflow: "visible", pointerEvents: "none" }}
                      content={({ active, payload }) => {
                        if (!(active && payload && payload.length)) return null;

                        const { nomeCompleto, valor } = payload[0].payload;
                        const isDark = document.documentElement.classList.contains("dark");
                        const isMobileW = window.innerWidth < 640;

                        return (
                          <div
                            style={{
                              backgroundColor: isDark ? "#1e293b" : "#ffffff",
                              border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`,
                              borderRadius: 8,
                              padding: "8px 12px",
                              maxWidth: isMobileW ? 220 : 280,
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              hyphens: "auto",
                              color: isDark ? "#f9fafb" : "#111827",
                              fontSize: isMobileW ? "12px" : "13px",
                              lineHeight: 1.35,
                              boxShadow: "0 10px 20px rgba(0,0,0,.15)",
                            }}
                          >
                            <p style={{ fontWeight: 600, marginBottom: 6 }}>{nomeCompleto}</p>
                            <p style={{ color: isDark ? "#38bdf8" : "#0284c7" }}>
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

                    <Bar dataKey="valor" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Estatísticas do Período
              </h3>

              <div className="space-y-1">
                {[
                  {
                    label: "Total de Clientes",
                    value: clientesFiltrados.length,
                    className: "text-gray-900 dark:text-gray-100",
                  },
                  {
                    label: "Taxa de Ativação",
                    value:
                      clientesFiltrados.length > 0
                        ? ((kpis.clientesAtivos / clientesFiltrados.length) * 100).toFixed(
                            1
                          ) + "%"
                        : "0%",
                    className: "text-green-600 dark:text-green-400",
                  },
                  {
                    label: "Faturamento Total",
                    value: `R$ ${faturamentoTotalPeriodo.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`,
                    className: "text-blue-600 dark:text-blue-400",
                  },
                  {
                    label: "Notas no Período",
                    value: clientesFiltrados.reduce(
                      (acc, c) => acc + c.numeroComprasPeriodo,
                      0
                    ),
                    className: "text-purple-600 dark:text-purple-400",
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

          {/* Tabela de Clientes */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 md:mb-0">
                Detalhamento de Clientes
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
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e293b]"
                      onClick={() => alternarOrdenacao("nome")}
                    >
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Cliente
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
                      onClick={() => alternarOrdenacao("ultimaCompra")}
                    >
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Última Compra
                        </span>
                        {ordenacao.campo === "ultimaCompra" &&
                          (ordenacao.direcao === "desc" ? (
                            <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e293b]"
                      onClick={() => alternarOrdenacao("totalComprado")}
                    >
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Valor Total
                        </span>
                        {ordenacao.campo === "totalComprado" &&
                          (ordenacao.direcao === "desc" ? (
                            <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e293b]"
                      onClick={() => alternarOrdenacao("numeroCompras")}
                    >
                      <div className="flex items-center">
                        <ShoppingBag className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Nº Compras
                        </span>
                        {ordenacao.campo === "numeroCompras" &&
                          (ordenacao.direcao === "desc" ? (
                            <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e293b]"
                      onClick={() => alternarOrdenacao("status")}
                    >
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Status
                        </span>
                        {ordenacao.campo === "status" &&
                          (ordenacao.direcao === "desc" ? (
                            <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-400" />
                          ))}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientesPaginados.map((cliente, index) => (
                    <tr
                      key={cliente.id}
                      className={`border-b border-gray-100 dark:border-gray-700 
                                  hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-colors ${
                                    index % 2 === 0
                                      ? "bg-white dark:bg-[#0f172a]"
                                      : "bg-gray-50/50 dark:bg-[#1e293b]/40"
                                  }`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {cliente.nome}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {cliente.cpf_cnpj}
                          </p>
                          <div className="flex gap-3 mt-1">
                            {cliente.email && (
                              <span className="flex items-center text-xs text-gray-400">
                                <Mail className="w-3 h-3 mr-1" />
                                {cliente.email}
                              </span>
                            )}
                            {cliente.fone && (
                              <span className="flex items-center text-xs text-gray-400">
                                <Phone className="w-3 h-3 mr-1" />
                                {cliente.fone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {cliente.ultimaCompra
                          ? cliente.ultimaCompra.toISOString().split("T")[0].split("-").reverse().join("/")
                          : "Nunca"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          R$ {cliente.totalCompradoPeriodo.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {cliente.numeroComprasPeriodo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            cliente.status === "ativo"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400"
                          }`}
                        >
                          {cliente.status === "ativo" ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a{" "}
                  {Math.min(paginaAtual * itensPorPagina, clientesTabela.length)} de{" "}
                  {clientesTabela.length} registros
                </div>

                {/* Desktop */}
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

                {/* Mobile */}
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
        </div>
      </div>
    </div>
  );
};

export default Clientes;