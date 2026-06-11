import React, { useEffect, useMemo, useState, useCallback } from "react";
import { fetchLocacao } from "../services/notasapi";
import { useAuth } from "../hooks/useAuth";
import {
  KeyRound,
  DollarSign,
  FileText,
  Calendar,
  Search,
  Download,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import * as XLSX from "xlsx";

// Tipagem da nota de locação
interface NotaLocacao {
  id: number;
  numero: string | null;
  data_emissao: string;
  valor_nota: number | string | null;
  descricao_situacao: string | null;
  natureza_operacao: string | null;
  nome_vendedor: string | null;
  cliente: {
    nome: string;
    cpf_cnpj: string;
  } | null;
  marcadores?: { descricao: string }[];
}

const Locacao: React.FC = () => {
  const { user } = useAuth();

  const [notas, setNotas] = useState<NotaLocacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [pesquisa, setPesquisa] = useState("");
  const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: "asc" | "desc" }>({
    campo: "data_emissao",
    direcao: "desc",
  });

  useEffect(() => {
    const carregar = async () => {
      try {
        setCarregando(true);
        const dados = await fetchLocacao();
        setNotas(Array.isArray(dados) ? dados : []);
        setErro(null);
      } catch (err) {
        console.error("Erro ao buscar locações", err);
        setErro("Não foi possível carregar as notas de locação.");
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  const toNumber = (v: number | string | null | undefined) => {
    if (v == null) return 0;
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return isNaN(n) ? 0 : n;
  };

  const formatarMoeda = (valor: number) =>
    valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // KPIs
  const kpis = useMemo(() => {
    const total = notas.reduce((acc, n) => acc + toNumber(n.valor_nota), 0);
    const qtd = notas.length;
    const ticketMedio = qtd > 0 ? total / qtd : 0;
    return { total, qtd, ticketMedio };
  }, [notas]);

  // Filtro + ordenação da tabela
  const notasTabela = useMemo(() => {
    let lista = [...notas];

    if (pesquisa) {
      const termo = pesquisa.toLowerCase();
      lista = lista.filter((n) => {
        const nome = n.cliente?.nome?.toLowerCase() || "";
        const cnpj = n.cliente?.cpf_cnpj?.toLowerCase() || "";
        const numero = (n.numero || "").toLowerCase();
        const vendedor = (n.nome_vendedor || "").toLowerCase();
        return (
          nome.includes(termo) ||
          cnpj.includes(termo) ||
          numero.includes(termo) ||
          vendedor.includes(termo) ||
          String(toNumber(n.valor_nota)).includes(termo)
        );
      });
    }

    lista.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (ordenacao.campo) {
        case "data_emissao":
          aVal = new Date(a.data_emissao);
          bVal = new Date(b.data_emissao);
          break;
        case "cliente":
          aVal = a.cliente?.nome || "";
          bVal = b.cliente?.nome || "";
          break;
        case "valor":
          aVal = toNumber(a.valor_nota);
          bVal = toNumber(b.valor_nota);
          break;
        case "numero":
          aVal = a.numero || "";
          bVal = b.numero || "";
          break;
        default:
          return 0;
      }
      if (ordenacao.direcao === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    return lista;
  }, [notas, pesquisa, ordenacao]);

  const alternarOrdenacao = (campo: string) => {
    setOrdenacao((prev) => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === "desc" ? "asc" : "desc",
    }));
  };

  const Seta = ({ campo }: { campo: string }) =>
    ordenacao.campo === campo ? (
      ordenacao.direcao === "desc" ? (
        <ChevronDown className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
      ) : (
        <ChevronUp className="w-4 h-4 ml-1 text-gray-600 dark:text-gray-300" />
      )
    ) : null;

  const exportarExcel = useCallback(() => {
    const dadosExport = notasTabela.map((n) => ({
      Número: n.numero || "",
      Data: new Date(n.data_emissao).toLocaleDateString("pt-BR"),
      Cliente: n.cliente?.nome || "",
      CNPJ: n.cliente?.cpf_cnpj || "",
      Valor: toNumber(n.valor_nota),
      Situação: n.descricao_situacao || "",
      Vendedor: n.nome_vendedor || "",
    }));
    const ws = XLSX.utils.json_to_sheet(dadosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Locação");
    XLSX.writeFile(wb, `locacao_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [notasTabela]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-darkBlue transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando locações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-darkBlue transition-colors">
      {/* Cabeçalho */}
      <div className="bg-white dark:bg-[#0f172a] shadow-sm rounded-xl">
        <div className="px-6 py-4 flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
            <KeyRound className="w-6 h-6 text-blue-600 dark:text-yellow-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-yellow-400">Locação</h1>
            <p className="text-gray-500 dark:text-gray-300 text-sm mt-1">
              Notas fiscais marcadas como <span className="font-semibold">Locação</span>
              {user?.username ? ` — ${user.username}` : ""}
            </p>
          </div>
        </div>
      </div>

      {erro && (
        <div className="mt-6 p-4 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
          {erro}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-6">
        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Valor Total em Locação</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-yellow-300 mt-2">
                R$ {formatarMoeda(kpis.total)}
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-yellow-300" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Quantidade de Notas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">{kpis.qtd}</p>
            </div>
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Valor Médio</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                R$ {formatarMoeda(kpis.ticketMedio)}
              </p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
              <KeyRound className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 transition-colors">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 md:mb-0">
            Notas de Locação
          </h3>

          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-300" />
              <input
                type="text"
                placeholder="Pesquisar..."
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                className="pl-10 pr-3 py-2 border rounded-lg w-full md:w-64
                          bg-white dark:bg-slate-800
                          text-gray-800 dark:text-gray-200
                          border-gray-300 dark:border-gray-600
                          focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={exportarExcel}
              disabled={notasTabela.length === 0}
              className="flex items-center justify-center px-4 py-2
                        bg-green-600 text-white rounded-lg
                        hover:bg-green-700 dark:hover:bg-green-500
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors"
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
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => alternarOrdenacao("numero")}
                >
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 dark:text-gray-200">Número</span>
                    <Seta campo="numero" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => alternarOrdenacao("data_emissao")}
                >
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                    <span className="font-medium text-gray-700 dark:text-gray-200">Data</span>
                    <Seta campo="data_emissao" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => alternarOrdenacao("cliente")}
                >
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 dark:text-gray-200">Cliente</span>
                    <Seta campo="cliente" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => alternarOrdenacao("valor")}
                >
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 dark:text-gray-200">Valor</span>
                    <Seta campo="valor" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="font-medium text-gray-700 dark:text-gray-200">Situação</span>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="font-medium text-gray-700 dark:text-gray-200">Vendedor</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {notasTabela.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                    Nenhuma nota de locação encontrada.
                  </td>
                </tr>
              ) : (
                notasTabela.map((nota, index) => (
                  <tr
                    key={nota.id}
                    className={`border-b border-gray-100 dark:border-gray-700 transition-colors ${
                      index % 2 === 0
                        ? "bg-white dark:bg-slate-800"
                        : "bg-gray-50/50 dark:bg-slate-900"
                    } hover:bg-gray-50 dark:hover:bg-slate-700`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-200">
                      {nota.numero || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {nota.data_emissao
                        ? nota.data_emissao.split("T")[0].split("-").reverse().join("/")
                        : "—"}
                    </td>
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
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        R$ {formatarMoeda(toNumber(nota.valor_nota))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                        {nota.descricao_situacao || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {nota.nome_vendedor || "Não informado"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Locacao;
