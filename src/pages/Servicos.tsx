import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useServicos } from "../context/ServicosContext";
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

const Servicos: React.FC = () => {
  const { user } = useAuth();
  const { servicos, servicosEnriquecidos, carregando } = useServicos();

  // Estados dos filtros
  const [filtroCliente, setFiltroCliente] = useState<string[]>([]);
  const [filtroCidade, setFiltroCidade] = useState<string[]>([]);
  const [filtroTipoServico, setFiltroTipoServico] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [presetPeriodo, setPresetPeriodo] = useState("todos");
  const [observacoesSelecionadas, setObservacoesSelecionadas] = useState<string | null>(null);

  // Estados da tabela
  const [ordenacao, setOrdenacao] = useState<{campo: string; direcao: 'asc' | 'desc'}>({
    campo: 'data_emissao',
    direcao: 'desc'
  });
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(15);
  const [pesquisaTabela, setPesquisaTabela] = useState("");

  // Função para converter valor para número
  const converterParaNumero = (valor: string | number | undefined): number => {
    if (typeof valor === 'number') return valor;
    if (!valor) return 0;
    
    const valorLimpo = valor
      .toString()
      .replace(/R\$/g, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    
    const numero = parseFloat(valorLimpo);
    return isNaN(numero) ? 0 : numero;
  };

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
  const clientesUnicos = useMemo(() =>
    Array.from(
      new Set(
        servicosEnriquecidos.map(s => 
          `${s.razao_social_tomador} (${s.cpf_cnpj_tomador})`
        )
      )
    ).sort(),
    [servicosEnriquecidos]
  );

  const cidadesUnicas = useMemo(() =>
    Array.from(
      new Set(
        servicosEnriquecidos.map(s => `${s.cidade_tomador}/${s.uf_tomador}`)
      )
    ).sort(),
    [servicosEnriquecidos]
  );

  const tiposServicoUnicos = useMemo(() => {
    const tipos = new Set<string>();
    servicosEnriquecidos.forEach(s => {
      // Pega os primeiros 50 caracteres da discriminação como "tipo"
      const tipo = s.discriminacao_servico?.substring(0, 50) || "Não especificado";
      tipos.add(tipo);
    });
    return Array.from(tipos).sort();
  }, [servicosEnriquecidos]);

  // Serviços filtrados
  const servicosFiltrados = useMemo(() => {
    return servicosEnriquecidos.filter(s => {
      const clienteFormatado = `${s.razao_social_tomador} (${s.cpf_cnpj_tomador})`;
      const clienteOk = filtroCliente.length === 0 || filtroCliente.includes(clienteFormatado);

      const cidadeFormatada = `${s.cidade_tomador}/${s.uf_tomador}`;
      const cidadeOk = filtroCidade.length === 0 || filtroCidade.includes(cidadeFormatada);

      const tipoServico = s.discriminacao_servico?.substring(0, 50) || "Não especificado";
      const tipoOk = filtroTipoServico.length === 0 || filtroTipoServico.includes(tipoServico);

      const dataOk = (() => {
        if (!dataInicio && !dataFim) return true;

        // Converte tudo para Date com segurança
        const dataEmissao = new Date(s.data_emissao + "T00:00:00");
        const inicio = dataInicio ? new Date(dataInicio + "T00:00:00") : new Date("0000-01-01");
        const fim = dataFim ? new Date(dataFim + "T23:59:59") : new Date("9999-12-31");

        return dataEmissao >= inicio && dataEmissao <= fim;
      })();

      return clienteOk && cidadeOk && tipoOk && dataOk;
    });
  }, [servicosEnriquecidos, filtroCliente, filtroCidade, filtroTipoServico, dataInicio, dataFim]);

  // KPIs
  const kpis = useMemo(() => {
    const totalFaturado = servicosFiltrados.reduce(
      (acc, s) => acc + converterParaNumero(s.valor_servico),
      0
    );

    const totalServicos = servicosFiltrados.length;
    const ticketMedio = totalServicos > 0 ? totalFaturado / totalServicos : 0;

    // Cliente com maior consumo
    const clientesAgrupados = servicosFiltrados.reduce((acc: any, s) => {
      const cliente = s.razao_social_tomador;
      if (!acc[cliente]) acc[cliente] = 0;
      acc[cliente] += converterParaNumero(s.valor_servico);
      return acc;
    }, {});

    const topCliente = Object.entries(clientesAgrupados)
      .sort(([,a]: any, [,b]: any) => b - a)[0];

    return {
      totalFaturado,
      totalServicos,
      ticketMedio,
      topCliente: topCliente ? {
        nome: topCliente[0],
        valor: topCliente[1] as number
      } : null
    };
  }, [servicosFiltrados]);

  // Dados para evolução mensal
  const evolucaoMensal = useMemo(() => {
    const agrupado = servicosFiltrados.reduce((acc: Record<string, number>, s) => {
      // 🔹 Cria a data local sem UTC
      const [anoStr, mesStr, diaStr] = s.data_emissao.split("-");
      const data = new Date(Number(anoStr), Number(mesStr) - 1, Number(diaStr));

      const ano = data.getFullYear();
      const mes = data.getMonth();
      const chave = `${ano}-${mes}`;
      if (!acc[chave]) acc[chave] = 0;
      acc[chave] += converterParaNumero(s.valor_servico);
      return acc;
    }, {});

    return Object.entries(agrupado)
      .map(([chave, total]) => {
        const [ano, mes] = chave.split("-");
        // 🔹 Cria data novamente de forma local
        const data = new Date(Number(ano), Number(mes));
        return {
          mes: data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
          total,
          ordem: data.getTime(),
        };
      })
      .sort((a, b) => a.ordem - b.ordem);
  }, [servicosFiltrados]);


  // Ranking de clientes (Top 10)
  const rankingClientes = useMemo(() => {
    const agrupado = servicosFiltrados.reduce((acc: any, s) => {
      const cliente = s.razao_social_tomador;
      if (!acc[cliente]) acc[cliente] = 0;
      acc[cliente] += converterParaNumero(s.valor_servico);
      return acc;
    }, {});

    return Object.entries(agrupado)
      .map(([cliente, valor]) => ({ 
        cliente: cliente.length > 20 ? cliente.substring(0, 20) + "..." : cliente, 
        clienteCompleto: cliente,
        valor 
      }))
      .sort((a: any, b: any) => b.valor - a.valor)
      .slice(0, 10);
  }, [servicosFiltrados]);

  // Distribuição por cidade
  const distribuicaoCidades = useMemo(() => {
    const agrupado = servicosFiltrados.reduce((acc: any, s) => {
      const cidade = `${s.cidade_tomador}/${s.uf_tomador}`;
      if (!acc[cidade]) acc[cidade] = 0;
      acc[cidade] += converterParaNumero(s.valor_servico);
      return acc;
    }, {});

    return Object.entries(agrupado)
      .map(([name, value]) => ({ name, value }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 10); // 🔹 agora só mostra as 10 maiores
  }, [servicosFiltrados]);

  // Tabela com pesquisa e ordenação
  const servicosTabela = useMemo(() => {
    let filtrados = [...servicosFiltrados];

    // Aplicar pesquisa
    if (pesquisaTabela) {
      const termoLower = pesquisaTabela.toLowerCase();
      const termoNumerico = pesquisaTabela.replace(/\D/g, ""); // 🔹 só dígitos

      filtrados = filtrados.filter((s) => {
        const numero = s.numero_nfse?.toString().toLowerCase() || "";
        const cliente = s.razao_social_tomador?.toLowerCase() || "";
        const cnpj = s.cpf_cnpj_tomador?.toLowerCase() || "";
        const cnpjNumerico = s.cpf_cnpj_tomador?.replace(/\D/g, "") || ""; // 🔹 só dígitos
        const cidade = s.cidade_tomador?.toLowerCase() || "";
        const descricao = s.discriminacao_servico?.toLowerCase() || "";

        return (
          numero.includes(termoLower) ||
          cliente.includes(termoLower) ||
          cnpj.includes(termoLower) ||
          (termoNumerico && cnpjNumerico.includes(termoNumerico)) || // 🔹 compara sem máscara
          cidade.includes(termoLower) ||
          descricao.includes(termoLower)
        );
      });
    }

    // Aplicar ordenação
    filtrados.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch(ordenacao.campo) {
        case 'numero':
          aVal = a.numero_nfse;
          bVal = b.numero_nfse;
          break;
        case 'data_emissao':
          aVal = new Date(a.data_emissao);
          bVal = new Date(b.data_emissao);
          break;
        case 'cliente':
          aVal = a.razao_social_tomador.toLowerCase();
          bVal = b.razao_social_tomador.toLowerCase();
          break;
        case 'valor':
          aVal = converterParaNumero(a.valor_servico);
          bVal = converterParaNumero(b.valor_servico);
          break;
        case 'cidade':
          aVal = a.cidade_tomador.toLowerCase();
          bVal = b.cidade_tomador.toLowerCase();
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
  }, [servicosFiltrados, pesquisaTabela, ordenacao]);

  // Paginação
  const servicosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return servicosTabela.slice(inicio, fim);
  }, [servicosTabela, paginaAtual, itensPorPagina]);

  const totalPaginas = Math.ceil(servicosTabela.length / itensPorPagina);

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
    const dadosExport = servicosTabela.map(s => ({
      'Número NFS-e': s.numero_nfse,
      'Cliente': s.razao_social_tomador,
      'CNPJ/CPF': s.cpf_cnpj_tomador,
      'Data Emissão': new Date(s.data_emissao).toLocaleDateString('pt-BR'),
      'Cidade': `${s.cidade_tomador}/${s.uf_tomador}`,
      'Valor': converterParaNumero(s.valor_servico),
      'Descrição': s.discriminacao_servico
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Serviços");
    XLSX.writeFile(wb, `servicos_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [servicosTabela]);

  // Exportação para PDF
  const exportarPDF = useCallback(() => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(16);
    doc.text("Relatório de Serviços", 14, 20);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
    doc.text(`Usuário: ${user?.username}`, 14, 34);

    // Dados para tabela
    const dadosTabela = servicosTabela.slice(0, 30).map(s => [
      s.numero_nfse,
      s.razao_social_tomador.substring(0, 25),
      new Date(s.data_emissao).toLocaleDateString('pt-BR'),
      `R$ ${converterParaNumero(s.valor_servico).toFixed(2)}`,
      `${s.cidade_tomador}/${s.uf_tomador}`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["NFS-e", "Cliente", "Data", "Valor", "Cidade"]],
      body: dadosTabela,
    });

    doc.save(`servicos_${new Date().toISOString().split("T")[0]}.pdf`);
  }, [servicosTabela, user]);

  // Componente MultiSelect
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
      // Texto em minúsculo normal
      const optionLower = option.toLowerCase();
      const searchLower = searchTerm.toLowerCase();

      // 🔹 Remove tudo que não for número
      const optionNumerico = option.replace(/\D/g, "");
      const searchNumerico = searchTerm.replace(/\D/g, "");

      return (
        optionLower.includes(searchLower) || // pesquisa normal
        (searchNumerico && optionNumerico.includes(searchNumerico)) // pesquisa sem máscara
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
                <label key={option} className="flex items-center px-4 py-2 cursor-pointer 
                                                     hover:bg-gray-100 dark:hover:bg-gray-700">
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggleOption(option)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">{option}</span>
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
            Carregando dados de serviços...
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
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-4 mb-6 transition-colors">
            <div className="flex items-center mb-4">
              <Filter className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-300" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Filtros
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Cliente (Tomador) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cliente (Tomador)
                </label>
                <MultiSelect
                  options={clientesUnicos}
                  selected={filtroCliente}
                  onChange={setFiltroCliente}
                  placeholder="Todos os clientes"
                />
              </div>

              {/* Cidade do Serviço */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cidade do Serviço
                </label>
                <MultiSelect
                  options={cidadesUnicas}
                  selected={filtroCidade}
                  onChange={setFiltroCidade}
                  placeholder="Todas as cidades"
                />
              </div>

              {/* Tipo de Serviço */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Serviço
                </label>
                <MultiSelect
                  options={tiposServicoUnicos}
                  selected={filtroTipoServico}
                  onChange={setFiltroTipoServico}
                  placeholder="Todos os tipos"
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
                  <option value="30dias">Mês atual</option>
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
            {/* Faturamento Total */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors lg:col-span-2">
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
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
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
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e293b]"
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
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e293b]"
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
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e293b]"
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
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e293b]"
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
                  {servicosPaginados.map((servico, index) => (
                    <tr
                      key={servico.id}
                      className={`border-b border-gray-100 dark:border-gray-700 
                                  hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-colors ${
                                    index % 2 === 0
                                      ? "bg-white dark:bg-[#0f172a]"
                                      : "bg-gray-50/50 dark:bg-[#1e293b]/40"
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
                          R$ {converterParaNumero(servico.valor_servico).toLocaleString("pt-BR", {
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
                  ))}
                  {observacoesSelecionadas && (
                    <ModalObservacoes
                      observacoes={observacoesSelecionadas}
                      onClose={() => setObservacoesSelecionadas(null)}
                    />
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="mt-4">
                {/* Texto de registros */}
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 md:mb-0">
                  Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a{" "}
                  {Math.min(paginaAtual * itensPorPagina, servicosTabela.length)} de{" "}
                  {servicosTabela.length} registros
                </div>

                {/* Desktop: paginação completa */}
                <div className="hidden md:flex justify-between items-center">
                  <div></div> {/* placeholder para alinhar com mobile */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
                      disabled={paginaAtual === 1}
                      className="px-3 py-1 border rounded-lg 
                        bg-white dark:bg-[#0f172a] 
                        border-gray-300 dark:border-gray-600 
                        text-gray-700 dark:text-gray-300
                        hover:bg-gray-50 dark:hover:bg-[#1e293b]
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
                                : "bg-white dark:bg-[#0f172a] border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1e293b]"
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
                        bg-white dark:bg-[#0f172a] 
                        border-gray-300 dark:border-gray-600 
                        text-gray-700 dark:text-gray-300
                        hover:bg-gray-50 dark:hover:bg-[#1e293b]
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
                      bg-white dark:bg-[#0f172a] 
                      border-gray-300 dark:border-gray-600 
                      text-gray-700 dark:text-gray-300
                      hover:bg-gray-50 dark:hover:bg-[#1e293b]
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {"<"}
                  </button>

                  <span className="px-3 py-1 border rounded-lg bg-white dark:bg-[#0f172a] border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                    {paginaAtual}
                  </span>

                  <button
                    onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
                    disabled={paginaAtual === totalPaginas}
                    className="px-3 py-1 border rounded-lg 
                      bg-white dark:bg-[#0f172a] 
                      border-gray-300 dark:border-gray-600 
                      text-gray-700 dark:text-gray-300
                      hover:bg-gray-50 dark:hover:bg-[#1e293b]
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

export default Servicos;