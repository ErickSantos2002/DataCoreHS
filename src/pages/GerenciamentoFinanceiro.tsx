import React, { useMemo, useState } from "react";
import { useVendas } from "../context/VendasContext";
import { useServicos } from "../context/ServicosContext";
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

const formatBRL = (v: number) =>
  v === 0 ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatAbrev = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return `R$ ${v}`;
};

const chaveVar = (base: Ano, comp: Ano) => `var${comp}${base}`;

const GerenciamentoFinanceiro: React.FC = () => {
  const { notas, carregando: carregandoVendas } = useVendas();
  const { servicosEnriquecidos, carregando: carregandoServicos } = useServicos();

  const [anosAtivos, setAnosAtivos] = useState<Set<Ano>>(
    new Set([2022, 2023, 2024, 2025, 2026])
  );
  const [tipo, setTipo] = useState<"vendas" | "servicos" | "combinado">("combinado");

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

  // Variação YoY para todos os pares consecutivos
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

  if (carregandoVendas || carregandoServicos) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-darkBlue">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-darkBlue transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-[#0f172a] shadow-sm rounded-xl px-6 py-4 mb-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-yellow-400">
          Gerenciamento Financeiro
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Análise comparativa de receitas 2022 · 2023 · 2024 · 2025 · 2026 — Vendas e Serviços
        </p>
      </div>

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

      {/* Variação YoY — 4 gráficos em grid 2x2 */}
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

            {/* Linha de Total */}
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
                  {PARES_YOY.map(([base, comp], idx) => {
                    const baseIdx = ANOS.indexOf(base);
                    const compIdx = ANOS.indexOf(comp);
                    const vBase = totais[baseIdx];
                    const vComp = totais[compIdx];
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
    </div>
  );
};

export default GerenciamentoFinanceiro;
