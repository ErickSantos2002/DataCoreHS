import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useContasPagar } from "../context/ContasPagarContext";
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
  Legend,
} from "recharts";
import {
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  Filter,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import * as XLSX from "xlsx";

const CORES_GRAFICO = [
  "#2563eb", "#10b981", "#8b5cf6", "#f97316",
  "#ef4444", "#eab308", "#ec4899", "#06b6d4",
];

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatarValorAbreviado = (valor: number) => {
  if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `R$ ${(valor / 1_000).toFixed(1)}K`;
  return `R$ ${valor.toLocaleString("pt-BR")}`;
};

const formatarData = (data: string | null) => {
  if (!data) return "-";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
};

// --- MultiSelect (padrão Vendas) ---
const MultiSelect: React.FC<{
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  placeholder: string;
}> = ({ options, selected, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (option: string) => {
    onChange(selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option]);
  };

  const filtered = options.filter((o) => o.toLowerCase().includes(searchTerm.toLowerCase()));

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
        <div className="absolute z-50 w-full mt-1
          bg-white dark:bg-[#0f172a]
          border border-gray-200 dark:border-gray-600
          rounded-lg shadow-lg max-h-60 overflow-auto">
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
                placeholder-gray-400 dark:placeholder-gray-500 text-sm"
            />
          </div>
          <div className="p-2">
            <button
              onClick={() => onChange([])}
              className="w-full text-left px-2 py-1 text-sm
                text-gray-600 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Limpar seleção
            </button>
          </div>
          {filtered.length > 0 ? (
            filtered.map((option) => (
              <label
                key={option}
                className="flex items-center px-4 py-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggle(option)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">{option || "(vazio)"}</span>
              </label>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">Nenhum resultado</div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Badge Situação ---
const BadgeSituacao: React.FC<{ situacao: string | null; vencida: boolean }> = ({ situacao, vencida }) => {
  const s = situacao?.toLowerCase() ?? "";
  if (s === "pago") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Pago</span>;
  if (vencida) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Vencida</span>;
  if (s === "pendente" || s === "aberto") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">{situacao}</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{situacao ?? "-"}</span>;
};

const ContasPagar: React.FC = () => {
  const { user } = useAuth();
  const { contasEnriquecidas, carregando } = useContasPagar();

  const [filtroSituacao, setFiltroSituacao] = useState<string[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string[]>([]);
  const [filtroFornecedor, setFiltroFornecedor] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [presetPeriodo, setPresetPeriodo] = useState("todos");
  const [pesquisaTabela, setPesquisaTabela] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: "asc" | "desc" }>({ campo: "vencimento", direcao: "asc" });

  const ITENS_POR_PAGINA = 15;

  // Preset de período
  useEffect(() => {
    const hoje = new Date();
    let inicio = "";
    let fim = hoje.toISOString().split("T")[0];

    switch (presetPeriodo) {
      case "30dias":
        const d = new Date(hoje);
        d.setDate(hoje.getDate() - 30);
        inicio = d.toISOString().split("T")[0];
        break;
      case "mesAtual":
        inicio = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
        break;
      case "anoAtual":
        inicio = `${hoje.getFullYear()}-01-01`;
        fim = `${hoje.getFullYear()}-12-31`;
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

  // Opções únicas
  const opcoesSituacao = useMemo(() => Array.from(new Set(contasEnriquecidas.map((c) => c.situacao ?? "").filter(Boolean))).sort(), [contasEnriquecidas]);
  const opcoesCategoria = useMemo(() => Array.from(new Set(contasEnriquecidas.map((c) => c.categoria ?? "").filter(Boolean))).sort(), [contasEnriquecidas]);
  const opcoesFornecedor = useMemo(() => Array.from(new Set(contasEnriquecidas.map((c) => c.cliente_nome))).sort(), [contasEnriquecidas]);

  // Filtros aplicados
  const contasFiltradas = useMemo(() => {
    return contasEnriquecidas.filter((c) => {
      if (filtroSituacao.length > 0 && !filtroSituacao.includes(c.situacao ?? "")) return false;
      if (filtroCategoria.length > 0 && !filtroCategoria.includes(c.categoria ?? "")) return false;
      if (filtroFornecedor.length > 0 && !filtroFornecedor.includes(c.cliente_nome)) return false;
      if (dataInicio && c.data_emissao < dataInicio) return false;
      if (dataFim && c.data_emissao > dataFim) return false;
      return true;
    });
  }, [contasEnriquecidas, filtroSituacao, filtroCategoria, filtroFornecedor, dataInicio, dataFim]);

  // KPIs
  const kpis = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const em30Dias = new Date(hoje);
    em30Dias.setDate(hoje.getDate() + 30);

    let totalAberto = 0, totalPago = 0, contasVencidas = 0, aVencer30 = 0;

    for (const c of contasFiltradas) {
      const sit = c.situacao?.toLowerCase() ?? "";
      if (sit === "pago") {
        totalPago += c.valor_numero;
      } else {
        totalAberto += c.saldo_numero;
      }
      if (c.vencida) contasVencidas++;
      const [vA, vM, vD] = c.vencimento.split("-");
      const dv = new Date(Number(vA), Number(vM) - 1, Number(vD));
      if (dv >= hoje && dv <= em30Dias && sit !== "pago") aVencer30++;
    }

    return { totalAberto, totalPago, contasVencidas, aVencer30 };
  }, [contasFiltradas]);

  // Gráfico evolução — anual se > 1 ano, mensal se apenas 1 ano
  const { dadosEvolucao, evolucaoTitulo, evolucaoChaveX } = useMemo(() => {
    const anosPresentes = new Set(contasFiltradas.map((c) => c.ano));

    if (anosPresentes.size > 1) {
      // Agrupar por ano
      const map = new Map<number, { pago: number; aberto: number }>();
      for (const c of contasFiltradas) {
        if (!map.has(c.ano)) map.set(c.ano, { pago: 0, aberto: 0 });
        const entry = map.get(c.ano)!;
        if (c.situacao?.toLowerCase() === "pago") entry.pago += c.valor_numero;
        else entry.aberto += c.saldo_numero;
      }
      const dados = Array.from(map.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([ano, { pago, aberto }]) => ({ label: String(ano), pago, aberto }));
      return { dadosEvolucao: dados, evolucaoTitulo: "Evolução Anual", evolucaoChaveX: "label" };
    } else {
      // Agrupar por mês do único ano
      const ano = anosPresentes.values().next().value ?? new Date().getFullYear();
      const meses = MESES_ABREV.map((m) => ({ label: m, pago: 0, aberto: 0 }));
      for (const c of contasFiltradas) {
        const idx = Number(c.data_emissao.split("-")[1]) - 1;
        if (c.situacao?.toLowerCase() === "pago") meses[idx].pago += c.valor_numero;
        else meses[idx].aberto += c.saldo_numero;
      }
      return { dadosEvolucao: meses, evolucaoTitulo: `Evolução Mensal — ${ano}`, evolucaoChaveX: "label" };
    }
  }, [contasFiltradas]);

  // PieChart categorias
  const dadosCategoria = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of contasFiltradas) {
      const cat = c.categoria ?? "Sem categoria";
      map.set(cat, (map.get(cat) ?? 0) + c.valor_numero);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [contasFiltradas]);

  // BarChart top fornecedores
  const dadosFornecedores = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of contasFiltradas) {
      map.set(c.cliente_nome, (map.get(c.cliente_nome) ?? 0) + c.valor_numero);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nome, valor]) => ({ nome, valor }));
  }, [contasFiltradas]);

  // Tabela com pesquisa + ordenação
  const contasTabela = useMemo(() => {
    let lista = [...contasFiltradas];

    if (pesquisaTabela) {
      const t = pesquisaTabela.toLowerCase();
      lista = lista.filter((c) =>
        c.cliente_nome.toLowerCase().includes(t) ||
        (c.categoria?.toLowerCase().includes(t) ?? false) ||
        (c.nro_documento?.toLowerCase().includes(t) ?? false) ||
        (c.historico?.toLowerCase().includes(t) ?? false)
      );
    }

    lista.sort((a, b) => {
      const av = (a as any)[ordenacao.campo] ?? "";
      const bv = (b as any)[ordenacao.campo] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return ordenacao.direcao === "asc" ? av - bv : bv - av;
      }
      return ordenacao.direcao === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

    return lista;
  }, [contasFiltradas, pesquisaTabela, ordenacao]);

  const totalPaginas = Math.ceil(contasTabela.length / ITENS_POR_PAGINA);
  const contasPaginadas = contasTabela.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA);

  const alternarOrdenacao = (campo: string) => {
    setOrdenacao((prev) => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === "desc" ? "asc" : "desc",
    }));
  };

  const exportarExcel = useCallback(() => {
    const dados = contasTabela.map((c) => ({
      Fornecedor: c.cliente_nome,
      CPF_CNPJ: c.cliente_cpf_cnpj ?? "",
      Categoria: c.categoria ?? "",
      "Nº Documento": c.nro_documento ?? "",
      Histórico: c.historico ?? "",
      Valor: c.valor_numero,
      Saldo: c.saldo_numero,
      Emissão: formatarData(c.data_emissao),
      Vencimento: formatarData(c.vencimento),
      Liquidação: formatarData(c.liquidacao),
      Situação: c.vencida ? "Vencida" : (c.situacao ?? ""),
      Ocorrência: c.ocorrencia,
      Cidade: c.cliente_cidade ?? "",
      UF: c.cliente_uf ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contas a Pagar");
    XLSX.writeFile(wb, `contas_a_pagar_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [contasTabela]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-darkBlue transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando contas a pagar...</p>
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
            Contas a Pagar
          </h1>
          <p className="text-gray-600 dark:text-gray-200 mt-1">
            Bem-vindo, <span className="font-semibold">{user?.username}</span> ({user?.role})
          </p>
          <p className="text-gray-500 dark:text-gray-300 text-sm mt-2">
            Acompanhe e gerencie as contas a pagar integradas ao Tiny ERP.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-hidden">
        {/* Filtros */}
        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-4 mb-6 border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Situação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Situação</label>
              <MultiSelect options={opcoesSituacao} selected={filtroSituacao} onChange={(v) => { setFiltroSituacao(v); setPaginaAtual(1); }} placeholder="Todas" />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
              <MultiSelect options={opcoesCategoria} selected={filtroCategoria} onChange={(v) => { setFiltroCategoria(v); setPaginaAtual(1); }} placeholder="Todas" />
            </div>

            {/* Fornecedor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fornecedor</label>
              <MultiSelect options={opcoesFornecedor} selected={filtroFornecedor} onChange={(v) => { setFiltroFornecedor(v); setPaginaAtual(1); }} placeholder="Todos" />
            </div>

            {/* Período Rápido */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Período Rápido</label>
              <select
                value={presetPeriodo}
                onChange={(e) => { setPresetPeriodo(e.target.value); setPaginaAtual(1); }}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-darkBlue
                  dark:text-gray-200 dark:border-gray-600
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="mesAtual">Mês atual</option>
                <option value="anoAtual">Ano atual</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {/* Data Início */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => { setDataInicio(e.target.value); setPresetPeriodo("custom"); setPaginaAtual(1); }}
                className="w-full px-3 py-2 border rounded-lg
                  bg-white dark:bg-darkBlue dark:text-gray-200 dark:border-gray-600
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Data Fim */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => { setDataFim(e.target.value); setPresetPeriodo("custom"); setPaginaAtual(1); }}
                className="w-full px-3 py-2 border rounded-lg
                  bg-white dark:bg-darkBlue dark:text-gray-200 dark:border-gray-600
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total em Aberto</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {formatarMoeda(kpis.totalAberto)}
                </p>
              </div>
              <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Pago</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {formatarMoeda(kpis.totalPago)}
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Contas Vencidas</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                  {kpis.contasVencidas}
                </p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">A Vencer (30 dias)</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {kpis.aVencer30}
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Evolução Anual — ocupa linha inteira */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              {evolucaoTitulo}
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dadosEvolucao} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-axis)" />
                <XAxis dataKey={evolucaoChaveX} tick={{ fill: "var(--chart-text)", fontSize: 12 }} axisLine={{ stroke: "var(--chart-axis)" }} />
                <YAxis tickFormatter={formatarValorAbreviado} tick={{ fill: "var(--chart-text)", fontSize: 11 }} width={70} axisLine={{ stroke: "var(--chart-axis)" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: document.documentElement.classList.contains("dark") ? "#1e293b" : "#ffffff",
                    border: "1px solid var(--chart-axis)",
                    borderRadius: "8px",
                    color: "var(--chart-text)",
                  }}
                  formatter={(v: any) => formatarMoeda(v as number)}
                />
                <Legend />
                <Bar dataKey="pago" name="Pago" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="aberto" name="Em Aberto" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuição por Categoria */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Distribuição por Categoria
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosCategoria}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {dadosCategoria.map((_, i) => (
                    <Cell key={i} fill={CORES_GRAFICO[i % CORES_GRAFICO.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const { name, value } = payload[0].payload;
                      return (
                        <div style={{ backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", color: "#111827", padding: "8px 12px", maxWidth: "260px", whiteSpace: "normal", wordBreak: "break-word" }}>
                          <p style={{ fontWeight: 600, marginBottom: 4 }}>{name}</p>
                          <p style={{ color: "#0284c7" }}>{formatarMoeda(value)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top 10 Fornecedores */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Top 10 Fornecedores
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosFornecedores} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tickFormatter={formatarValorAbreviado} stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={120}
                  stroke="#9ca3af"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => v.length > 16 ? `${v.slice(0, 16)}...` : v}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const { nome, valor } = payload[0].payload;
                      return (
                        <div style={{ backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", color: "#111827", padding: "8px 12px", maxWidth: "240px", wordBreak: "break-word", whiteSpace: "normal" }}>
                          <p style={{ fontWeight: 600, marginBottom: 6 }}>{nome}</p>
                          <p style={{ color: "#10b981", fontSize: 14 }}>{formatarMoeda(valor)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="valor" fill="#2563eb" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 md:mb-0">
              Detalhamento de Contas
            </h3>

            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-300" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={pesquisaTabela}
                  onChange={(e) => { setPesquisaTabela(e.target.value); setPaginaAtual(1); }}
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
                  hover:bg-green-700 dark:hover:bg-green-500 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {[
                    { label: "ID Tiny", campo: "id_tiny" },
                  { label: "Fornecedor", campo: "cliente_nome" },
                    { label: "Categoria", campo: "categoria" },
                    { label: "Valor", campo: "valor_numero" },
                    { label: "Saldo", campo: "saldo_numero" },
                    { label: "Emissão", campo: "data_emissao" },
                    { label: "Vencimento", campo: "vencimento" },
                    { label: "Situação", campo: "situacao" },
                  ].map(({ label, campo }) => (
                    <th
                      key={campo}
                      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => alternarOrdenacao(campo)}
                    >
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 dark:text-gray-200">{label}</span>
                        {ordenacao.campo === campo ? (
                          ordenacao.direcao === "desc"
                            ? <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                            : <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
                        ) : null}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contasPaginadas.map((c, index) => (
                  <tr
                    key={c.id}
                    className={`border-b border-gray-100 dark:border-gray-700 transition-colors ${
                      index % 2 === 0
                        ? "bg-white dark:bg-slate-800"
                        : "bg-gray-50/50 dark:bg-slate-900"
                    } hover:bg-gray-50 dark:hover:bg-slate-700`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{c.id_tiny}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-200 max-w-[200px] truncate" title={c.cliente_nome}>
                      {c.cliente_nome}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{c.categoria ?? "-"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400">{formatarMoeda(c.valor_numero)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatarMoeda(c.saldo_numero)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatarData(c.data_emissao)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatarData(c.vencimento)}</td>
                    <td className="px-4 py-3">
                      <BadgeSituacao situacao={c.situacao} vencida={c.vencida} />
                    </td>
                  </tr>
                ))}
                {contasPaginadas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                      Nenhuma conta encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="mt-4">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Mostrando {(paginaAtual - 1) * ITENS_POR_PAGINA + 1} a{" "}
                {Math.min(paginaAtual * ITENS_POR_PAGINA, contasTabela.length)} de {contasTabela.length} registros
              </div>

              {/* Desktop */}
              <div className="hidden md:flex justify-between items-center">
                <div />
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    disabled={paginaAtual === 1}
                    className="px-3 py-1 border rounded-lg bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                      let p: number;
                      if (totalPaginas <= 5) p = i + 1;
                      else if (paginaAtual <= 3) p = i + 1;
                      else if (paginaAtual >= totalPaginas - 2) p = totalPaginas - 4 + i;
                      else p = paginaAtual - 2 + i;
                      return (
                        <button
                          key={p}
                          onClick={() => setPaginaAtual(p)}
                          className={`px-3 py-1 border rounded-lg transition-colors ${
                            paginaAtual === p
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual === totalPaginas}
                    className="px-3 py-1 border rounded-lg bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próximo
                  </button>
                </div>
              </div>

              {/* Mobile */}
              <div className="flex md:hidden justify-center gap-2 items-center mt-2">
                <button
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  className="px-3 py-1 border rounded-lg bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  {"<"}
                </button>
                <span className="px-3 py-1 border rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300">
                  {paginaAtual}
                </span>
                <button
                  onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="px-3 py-1 border rounded-lg bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-50"
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

export default ContasPagar;
