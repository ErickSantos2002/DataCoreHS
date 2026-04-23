import React, { useMemo, useState } from "react";
import CentroCustoTab from "../components/CentroCustoTab";
import { useVendas } from "../context/VendasContext";
import { useServicos } from "../context/ServicosContext";
import { useContasPagar } from "../context/ContasPagarContext";
import { useContasReceber } from "../context/ContasReceberContext";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

const ANOS = [2022, 2023, 2024, 2025, 2026] as const;
type Ano = (typeof ANOS)[number];

const PARES_YOY: [Ano, Ano][] = [
  [2022, 2023],
  [2023, 2024],
  [2024, 2025],
  [2025, 2026],
];

const MESES_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const COR: Record<Ano, string> = {
  2022: "#a16207",
  2023: "#7c3aed",
  2024: "#6b7280",
  2025: "#2563eb",
  2026: "#16a34a",
};

const CATEGORIA_GRUPOS: Record<string, string> = {
  "1":  "1 - CUSTOS E DESPESAS FIXAS - EQUIPE",
  "2":  "2 - CUSTOS E DESPESAS FIXAS - SEDE",
  "3":  "3 - CUSTOS E DESPESAS FIXAS - SERVIÇOS DE APOIO",
  "4":  "4 - CUSTOS E DESPESAS FIXAS - GERAIS",
  "5":  "5 - CUSTOS E DESPESAS FIXAS - DIRETORIA",
  "6":  "6 - CUSTOS E DESPESAS VARIÁVEIS - MATERIAIS",
  "7":  "7 - CUSTOS E DESPESAS VARIÁVEIS - IMPOSTO INDIRETO",
  "8":  "8 - CUSTOS E DESPESAS VARIÁVEIS - IMPOSTO DIRETO",
  "9":  "9 - CUSTOS E DESPESAS - FINANCEIRAS",
  "10": "10 - OUTROS CUSTOS",
  "11": "11 - RECEITAS - VENDAS",
  "12": "12 - RECEITAS - SERVIÇO",
};

const formatBRL = (v: number) =>
  v === 0 ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatAbrev = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return `R$ ${v}`;
};

const chaveVar = (base: Ano, comp: Ano) => `var${comp}${base}`;

const toNum = (v: string | number | undefined): number => {
  if (typeof v === "number") return v;
  if (!v) return 0;
  const s = v.toString().replace(/R\$/g, "").replace(/\s/g, "");
  if (s.includes(",")) return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  return parseFloat(s) || 0;
};

const getCatPrefix = (cat: string | null | undefined): string => {
  if (!cat) return "outros";
  const m = cat.match(/^(\d+)/);
  return m ? m[1] : "outros";
};

const GerenciamentoFinanceiro: React.FC = () => {
  const { notas, carregando: carregandoVendas } = useVendas();
  const { servicosEnriquecidos, carregando: carregandoServicos } = useServicos();
  const { contas: contasPagar, carregando: carregandoPagar } = useContasPagar();
  useContasReceber();

  const [abaAtiva, setAbaAtiva] = useState<"visaoGeral" | "balancete" | "centroCusto">("visaoGeral");
  const [anosAtivos, setAnosAtivos] = useState<Set<Ano>>(
    new Set([2022, 2023, 2024, 2025, 2026])
  );
  const [tipo, setTipo] = useState<"vendas" | "servicos" | "combinado">("combinado");
  const [anoBalancete, setAnoBalancete] = useState(2026);

  const [anoCentro, setAnoCentro] = useState(2025);

  const toggleAno = (ano: Ano) => {
    setAnosAtivos((prev) => {
      const next = new Set(prev);
      if (next.has(ano)) {
        if (next.size > 1) next.delete(ano);
      } else {
        next.add(ano);
      }
      return next;
    });
  };

  // ── Visão Geral ─────────────────────────────────────────────────────────────

  const vendasPorAnoMes = useMemo(() => {
    const result: Record<number, number[]> = {};
    for (const ano of ANOS) result[ano] = Array(12).fill(0);
    for (const nota of notas) {
      const [anoStr, mesStr] = nota.data_emissao.split("-");
      const ano = Number(anoStr);
      const mes = Number(mesStr) - 1;
      if (ano in result) result[ano][mes] += Number(nota.valor_nota || 0);
    }
    return result;
  }, [notas]);

  const servicosPorAnoMes = useMemo(() => {
    const result: Record<number, number[]> = {};
    for (const ano of ANOS) result[ano] = Array(12).fill(0);
    for (const s of servicosEnriquecidos) {
      const ano = s.ano;
      const mes = Number(s.data_emissao.split("-")[1]) - 1;
      if (ano in result) result[ano][mes] += s.valor_servico_numero;
    }
    return result;
  }, [servicosEnriquecidos]);

  const totalPorAnoMes = useMemo(() => {
    const result: Record<number, number[]> = {};
    for (const ano of ANOS) {
      result[ano] = Array(12).fill(0).map((_, i) => {
        const v = tipo !== "servicos" ? vendasPorAnoMes[ano][i] : 0;
        const s = tipo !== "vendas" ? servicosPorAnoMes[ano][i] : 0;
        return v + s;
      });
    }
    return result;
  }, [tipo, vendasPorAnoMes, servicosPorAnoMes]);

  const variacaoYoY = useMemo(
    () =>
      MESES_LABELS.map((mes, i) => {
        const obj: Record<string, string | number | null> = { mes };
        for (const [base, comp] of PARES_YOY) {
          const vBase = totalPorAnoMes[base][i];
          const vComp = totalPorAnoMes[comp][i];
          obj[chaveVar(base, comp)] = vBase > 0 ? ((vComp - vBase) / vBase) * 100 : null;
        }
        return obj;
      }),
    [totalPorAnoMes]
  );

  const kpisPorAno = useMemo(
    () =>
      ANOS.map((ano) => {
        const total = totalPorAnoMes[ano].reduce((a, b) => a + b, 0);
        const countVendas =
          tipo !== "servicos"
            ? notas.filter((n) => Number(n.data_emissao.split("-")[0]) === ano).length
            : 0;
        const countServicos =
          tipo !== "vendas"
            ? servicosEnriquecidos.filter((s) => s.ano === ano).length
            : 0;
        return { ano, total, count: countVendas + countServicos };
      }),
    [totalPorAnoMes, notas, servicosEnriquecidos, tipo]
  );

  const dadosComparativoMensal = useMemo(
    () =>
      MESES_LABELS.map((label, i) => {
        const obj: Record<string, string | number> = { mes: label };
        for (const ano of ANOS) {
          if (anosAtivos.has(ano)) obj[ano.toString()] = totalPorAnoMes[ano][i];
        }
        return obj;
      }),
    [totalPorAnoMes, anosAtivos]
  );

  const dadosYTD = useMemo(
    () =>
      MESES_LABELS.map((label, i) => {
        const obj: Record<string, string | number> = { mes: label };
        for (const ano of ANOS) {
          if (!anosAtivos.has(ano)) continue;
          obj[ano.toString()] = totalPorAnoMes[ano].slice(0, i + 1).reduce((a, b) => a + b, 0);
        }
        return obj;
      }),
    [totalPorAnoMes, anosAtivos]
  );

  // ── Balancete ────────────────────────────────────────────────────────────────

  const balancete = useMemo(() => {
    const entradas: Record<string, number[]> = {
      vendas:   [...(vendasPorAnoMes[anoBalancete] ?? Array(12).fill(0))],
      servicos: [...(servicosPorAnoMes[anoBalancete] ?? Array(12).fill(0))],
    };
    const saidas: Record<string, number[]> = {};

    for (const c of contasPagar) {
      const dateStr = c.data_emissao;
      if (!dateStr) continue;
      const parts = dateStr.split("-");
      if (Number(parts[0]) !== anoBalancete) continue;
      const mes = Number(parts[1]) - 1;
      const prefix = getCatPrefix(c.categoria);
      if (!saidas[prefix]) saidas[prefix] = Array(12).fill(0);
      saidas[prefix][mes] += toNum(c.valor);
    }

    const totalEntradasMes = Array(12)
      .fill(0)
      .map((_, i) => Object.values(entradas).reduce((sum, arr) => sum + arr[i], 0));
    const totalSaidasMes = Array(12)
      .fill(0)
      .map((_, i) => Object.values(saidas).reduce((sum, arr) => sum + arr[i], 0));
    const saldoMes = totalEntradasMes.map((e, i) => e - totalSaidasMes[i]);

    const sortedEntradas = ["vendas", "servicos"].filter((p) => p in entradas);
    const sortedSaidas = Object.keys(saidas)
      .filter((p) => p !== "outros")
      .sort((a, b) => Number(a) - Number(b));

    const dadosGrafico = MESES_LABELS.map((mes, i) => ({
      mes,
      Entradas: totalEntradasMes[i],
      Saídas: totalSaidasMes[i],
    }));

    const totalEntradasAnual = totalEntradasMes.reduce((a, b) => a + b, 0);
    const totalSaidasAnual = totalSaidasMes.reduce((a, b) => a + b, 0);
    const saldoAnual = totalEntradasAnual - totalSaidasAnual;

    return {
      entradas, saidas,
      totalEntradasMes, totalSaidasMes, saldoMes,
      sortedEntradas, sortedSaidas,
      dadosGrafico,
      totalEntradasAnual, totalSaidasAnual, saldoAnual,
    };
  }, [vendasPorAnoMes, servicosPorAnoMes, contasPagar, anoBalancete]);

  // ── Loading ──────────────────────────────────────────────────────────────────

  const carregando =
    carregandoVendas ||
    carregandoServicos ||
    carregandoPagar;

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-darkBlue">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-darkBlue transition-colors">
      {/* Header + Tabs */}
      <div className="bg-white dark:bg-[#0f172a] shadow-sm rounded-xl px-6 pt-4 mb-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-yellow-400">
          Gerenciamento Financeiro
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Análise comparativa de receitas 2022 · 2023 · 2024 · 2025 · 2026 — Vendas e Serviços
        </p>
        <div className="flex gap-1 mt-4 border-b border-gray-200 dark:border-gray-700">
          {([
            { key: "visaoGeral",   label: "Visão Geral" },
            { key: "balancete",    label: "Balancete" },
            { key: "centroCusto",  label: "Centro de Custo" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setAbaAtiva(key)}
              className={`px-5 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors -mb-px
                ${abaAtiva === key
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════ ABA VISÃO GERAL ══════════════════ */}
      {abaAtiva === "visaoGeral" && (
        <>
          {/* Controles */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-4 items-center">
            <div className="flex flex-wrap gap-2">
              {ANOS.map((ano) => (
                <button
                  key={ano}
                  onClick={() => toggleAno(ano)}
                  className="px-4 py-2 rounded-lg font-semibold border transition-colors text-sm"
                  style={
                    anosAtivos.has(ano)
                      ? { backgroundColor: COR[ano], borderColor: COR[ano], color: "#fff" }
                      : { backgroundColor: "transparent", borderColor: "#d1d5db", color: "#9ca3af" }
                  }
                >
                  {ano}
                </button>
              ))}
            </div>

            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

            <div className="flex gap-2">
              {(["combinado", "vendas", "servicos"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors
                    ${tipo === t
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800"
                    }`}
                >
                  {t === "combinado" ? "Combinado" : t === "vendas" ? "Vendas" : "Serviços"}
                </button>
              ))}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {kpisPorAno.map(({ ano, total, count }, idx) => {
              const prevTotal = idx > 0 ? kpisPorAno[idx - 1].total : null;
              const growth =
                prevTotal !== null && prevTotal > 0
                  ? ((total - prevTotal) / prevTotal) * 100
                  : null;
              const hasData = total > 0;

              return (
                <div
                  key={ano}
                  className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-5 border-l-4"
                  style={{ borderLeftColor: COR[ano as Ano] }}
                >
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{ano}</p>
                  <p className="text-xl font-bold mt-1" style={{ color: COR[ano as Ano] }}>
                    {hasData ? formatBRL(total) : "Sem dados"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{count} transações</p>
                  {growth !== null && hasData && (
                    <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${growth >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {growth >= 0 ? "+" : ""}{growth.toFixed(1)}% vs {ano - 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Comparativo Mensal */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Comparativo Mensal</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={dadosComparativoMensal} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-axis, #e5e7eb)" />
                <XAxis dataKey="mes" tick={{ fill: "var(--chart-text, #6b7280)", fontSize: 12 }} />
                <YAxis tickFormatter={formatAbrev} tick={{ fill: "var(--chart-text, #6b7280)", fontSize: 11 }} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9" }}
                  formatter={(value: number, name: string) => [formatBRL(value), name]}
                />
                <Legend />
                {ANOS.filter((a) => anosAtivos.has(a)).map((ano) => (
                  <Bar key={ano} dataKey={ano.toString()} fill={COR[ano]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* YTD Acumulado */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Acumulado no Ano (YTD)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dadosYTD}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-axis, #e5e7eb)" />
                <XAxis dataKey="mes" tick={{ fill: "var(--chart-text, #6b7280)", fontSize: 12 }} />
                <YAxis tickFormatter={formatAbrev} tick={{ fill: "var(--chart-text, #6b7280)", fontSize: 11 }} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9" }}
                  formatter={(value: number, name: string) => [formatBRL(value), name]}
                />
                <Legend />
                {ANOS.filter((a) => anosAtivos.has(a)).map((ano) => (
                  <Line
                    key={ano}
                    type="monotone"
                    dataKey={ano.toString()}
                    stroke={COR[ano]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Variação YoY */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {PARES_YOY.map(([base, comp]) => {
              const chave = chaveVar(base, comp);
              return (
                <div key={chave} className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Variação Mensal</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{comp} vs {base}</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={variacaoYoY}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-axis, #e5e7eb)" />
                      <XAxis dataKey="mes" tick={{ fill: "var(--chart-text, #6b7280)", fontSize: 11 }} />
                      <YAxis
                        tickFormatter={(v) => `${v.toFixed(0)}%`}
                        tick={{ fill: "var(--chart-text, #6b7280)", fontSize: 11 }}
                        width={50}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9" }}
                        formatter={(value) => {
                          const v = value as number | null;
                          return v === null ? ["—", "Variação"] : [`${v >= 0 ? "+" : ""}${v.toFixed(1)}%`, "Variação"];
                        }}
                      />
                      <ReferenceLine y={0} stroke="var(--chart-axis, #9ca3af)" strokeWidth={1.5} />
                      <Bar dataKey={chave} radius={[4, 4, 0, 0]}>
                        {variacaoYoY.map((entry, index) => {
                          const val = entry[chave] as number | null;
                          return (
                            <Cell
                              key={`cell-${chave}-${index}`}
                              fill={val === null ? "#d1d5db" : val >= 0 ? "#16a34a" : "#dc2626"}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>

          {/* Tabela Mensal Comparativa */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 overflow-x-auto">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Tabela Mensal Comparativa</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 px-3 text-left text-gray-600 dark:text-gray-400 font-semibold">Mês</th>
                  {ANOS.map((ano) => (
                    <th key={ano} className="py-2 px-3 text-right font-semibold" style={{ color: COR[ano] }}>
                      {ano}
                    </th>
                  ))}
                  {PARES_YOY.map(([base, comp]) => (
                    <th key={`${comp}${base}`} className="py-2 px-3 text-right text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
                      {String(base).slice(2)}/{comp}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MESES_LABELS.map((label, i) => (
                  <tr
                    key={label}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <td className="py-2 px-3 font-medium text-gray-800 dark:text-gray-200">{label}</td>
                    {ANOS.map((ano) => (
                      <td key={ano} className="py-2 px-3 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                        {formatBRL(totalPorAnoMes[ano][i])}
                      </td>
                    ))}
                    {PARES_YOY.map(([base, comp]) => {
                      const chave = chaveVar(base, comp);
                      const val = variacaoYoY[i][chave] as number | null;
                      return (
                        <td
                          key={chave}
                          className="py-2 px-3 text-right font-semibold tabular-nums"
                          style={{ color: val === null ? "#9ca3af" : val >= 0 ? "#16a34a" : "#dc2626" }}
                        >
                          {val === null ? "—" : `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {(() => {
                  const totais = ANOS.map((ano) => totalPorAnoMes[ano].reduce((a, b) => a + b, 0));
                  return (
                    <tr className="bg-gray-100 dark:bg-slate-700 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                      <td className="py-3 px-3 text-gray-800 dark:text-gray-200">Total</td>
                      {ANOS.map((ano, idx) => (
                        <td key={ano} className="py-3 px-3 text-right tabular-nums" style={{ color: COR[ano] }}>
                          {formatBRL(totais[idx])}
                        </td>
                      ))}
                      {PARES_YOY.map(([base, comp]) => {
                        const vBase = totais[ANOS.indexOf(base)];
                        const vComp = totais[ANOS.indexOf(comp)];
                        const growth = vBase > 0 ? ((vComp - vBase) / vBase) * 100 : null;
                        return (
                          <td
                            key={`total-${comp}${base}`}
                            className="py-3 px-3 text-right tabular-nums"
                            style={{ color: growth === null ? "#9ca3af" : growth >= 0 ? "#16a34a" : "#dc2626" }}
                          >
                            {growth === null ? "—" : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════════════════ ABA BALANCETE ══════════════════ */}
      {abaAtiva === "balancete" && (
        <>
          {/* Seletor de Ano */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-4 mb-4 flex flex-wrap items-center gap-4">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Ano:</span>
            <div className="flex gap-2">
              {ANOS.map((ano) => (
                <button
                  key={ano}
                  onClick={() => setAnoBalancete(ano)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors
                    ${anoBalancete === ano
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800"
                    }`}
                >
                  {ano}
                </button>
              ))}
            </div>

            {/* KPIs resumo */}
            <div className="ml-auto flex gap-6 flex-wrap">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Entradas</p>
                <p className="text-base font-bold text-green-600">{formatBRL(balancete.totalEntradasAnual)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Saídas</p>
                <p className="text-base font-bold text-red-600">{formatBRL(balancete.totalSaidasAnual)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Saldo do Período</p>
                <p className={`text-base font-bold ${balancete.saldoAnual >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatBRL(balancete.saldoAnual)}
                </p>
              </div>
            </div>
          </div>

          {/* Gráfico Entradas vs Saídas */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Entradas vs Saídas — {anoBalancete}
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={balancete.dadosGrafico} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-axis, #e5e7eb)" />
                <XAxis dataKey="mes" tick={{ fill: "var(--chart-text, #6b7280)", fontSize: 12 }} />
                <YAxis tickFormatter={formatAbrev} tick={{ fill: "var(--chart-text, #6b7280)", fontSize: 11 }} width={85} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9" }}
                  formatter={(value: number, name: string) => [formatBRL(value), name]}
                />
                <Legend />
                <Bar dataKey="Entradas" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Saídas" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela Balancete */}
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6 overflow-x-auto">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Balancete — {anoBalancete}
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                  <th className="py-2 px-3 text-left font-semibold text-gray-600 dark:text-gray-400 min-w-[260px]">
                    Categoria
                  </th>
                  {MESES_LABELS.map((m) => (
                    <th key={m} className="py-2 px-2 text-right font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {m}/{String(anoBalancete).slice(2)}
                    </th>
                  ))}
                  <th className="py-2 px-3 text-right font-semibold text-gray-600 dark:text-gray-400">Total</th>
                </tr>
              </thead>
              <tbody>
                {/* ── Entradas ── */}
                <tr className="bg-green-50 dark:bg-green-900/20">
                  <td colSpan={14} className="py-2 px-3 font-bold text-green-800 dark:text-green-300 text-sm uppercase tracking-wide">
                    Entradas
                  </td>
                </tr>

                {balancete.sortedEntradas.map((prefix) => {
                  const vals = balancete.entradas[prefix];
                  const total = vals.reduce((a, b) => a + b, 0);
                  const label = prefix === "vendas"
                    ? "RECEITAS - VENDAS"
                    : prefix === "servicos"
                    ? "RECEITAS - SERVIÇO"
                    : CATEGORIA_GRUPOS[prefix] ?? `${prefix} - Outros`;
                  return (
                    <tr key={prefix} className="border-b border-gray-100 dark:border-gray-800 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
                      <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{label}</td>
                      {vals.map((v, i) => (
                        <td key={i} className="py-2 px-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                          {v > 0 ? formatBRL(v) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-right font-semibold tabular-nums text-green-700 dark:text-green-400">
                        {formatBRL(total)}
                      </td>
                    </tr>
                  );
                })}

                <tr className="bg-green-100 dark:bg-green-900/30 font-bold border-t border-green-300 dark:border-green-700">
                  <td className="py-2 px-3 text-green-800 dark:text-green-300 text-sm">Total de entradas</td>
                  {balancete.totalEntradasMes.map((v, i) => (
                    <td key={i} className="py-2 px-2 text-right tabular-nums text-green-700 dark:text-green-400">
                      {v > 0 ? formatBRL(v) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                  ))}
                  <td className="py-2 px-3 text-right tabular-nums text-green-700 dark:text-green-300 text-sm">
                    {formatBRL(balancete.totalEntradasAnual)}
                  </td>
                </tr>

                {/* ── Saídas ── */}
                <tr className="bg-red-50 dark:bg-red-900/20">
                  <td colSpan={14} className="py-2 px-3 font-bold text-red-800 dark:text-red-300 text-sm uppercase tracking-wide">
                    Saídas
                  </td>
                </tr>

                {balancete.sortedSaidas.map((prefix) => {
                  const vals = balancete.saidas[prefix];
                  const total = vals.reduce((a, b) => a + b, 0);
                  const label = CATEGORIA_GRUPOS[prefix] ?? `${prefix} - Outros`;
                  return (
                    <tr key={prefix} className="border-b border-gray-100 dark:border-gray-800 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                      <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{label}</td>
                      {vals.map((v, i) => (
                        <td key={i} className="py-2 px-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                          {v > 0 ? formatBRL(v) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-right font-semibold tabular-nums text-red-600 dark:text-red-400">
                        {formatBRL(total)}
                      </td>
                    </tr>
                  );
                })}

                <tr className="bg-red-100 dark:bg-red-900/30 font-bold border-t border-red-300 dark:border-red-700">
                  <td className="py-2 px-3 text-red-800 dark:text-red-300 text-sm">Total de saídas</td>
                  {balancete.totalSaidasMes.map((v, i) => (
                    <td key={i} className="py-2 px-2 text-right tabular-nums text-red-600 dark:text-red-400">
                      {v > 0 ? formatBRL(v) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                  ))}
                  <td className="py-2 px-3 text-right tabular-nums text-red-700 dark:text-red-300 text-sm">
                    {formatBRL(balancete.totalSaidasAnual)}
                  </td>
                </tr>

                {/* ── Saldo ── */}
                <tr className="bg-gray-100 dark:bg-slate-700 font-bold border-t-2 border-gray-400 dark:border-gray-500">
                  <td className="py-3 px-3 text-gray-800 dark:text-gray-100 text-sm uppercase tracking-wide">
                    Saldo do Período
                  </td>
                  {balancete.saldoMes.map((v, i) => {
                    const temDados = balancete.totalEntradasMes[i] > 0 || balancete.totalSaidasMes[i] > 0;
                    return (
                      <td
                        key={i}
                        className="py-3 px-2 text-right tabular-nums font-bold"
                        style={{ color: !temDados ? "#9ca3af" : v >= 0 ? "#16a34a" : "#dc2626" }}
                      >
                        {temDados ? formatBRL(v) : "—"}
                      </td>
                    );
                  })}
                  <td
                    className="py-3 px-3 text-right tabular-nums font-bold text-sm"
                    style={{ color: balancete.saldoAnual >= 0 ? "#16a34a" : "#dc2626" }}
                  >
                    {formatBRL(balancete.saldoAnual)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════════════════ ABA CENTRO DE CUSTO ══════════════════ */}
      {abaAtiva === "centroCusto" && (
        <CentroCustoTab anoCentro={anoCentro} setAnoCentro={setAnoCentro} />
      )}
    </div>
  );
};

export default GerenciamentoFinanceiro;
