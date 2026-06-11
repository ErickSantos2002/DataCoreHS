import React, { useMemo, useState } from "react";
import { useDashboard } from "../context/DashboardContext";
import { useConfiguracoes } from "../context/ConfiguracoesContext";
import { Trophy, Target, TrendingUp, CheckCircle2, Flag, Pencil, Save, X } from "lucide-react";

// Faixas de bônus, de 5 em 5%. O multiplicador da META trimestral é obtido por
// interpolação linear entre as âncoras: 55%→0,9 · 85%→1,2 · 100%→1,4.
const FAIXAS = [55, 60, 65, 70, 75, 80, 85, 90, 95, 100] as const;

const multiplicador = (bonus: number): number =>
  bonus <= 85 ? 0.9 + (bonus - 55) * (0.3 / 30) : 1.2 + (bonus - 85) * (0.2 / 15);

// Cor da faixa: gradiente bronze (55%) → ouro (100%)
const corFaixa = (bonus: number): string => {
  const t = Math.min(Math.max((bonus - 55) / 45, 0), 1);
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${lerp(0xcd, 0xff)}, ${lerp(0x7f, 0xd7)}, ${lerp(0x32, 0x00)})`;
};

// Parse robusto: aceita "12666666.72", "12.666.666,72" ou "12666666,72"
const parseValor = (raw: string | undefined): number => {
  if (!raw) return 0;
  let s = raw.trim().replace(/\s/g, "").replace(/R\$/gi, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Valor de configuração editável inline ───────────
const ValorEditavel: React.FC<{
  label: string;
  sublabel?: string;
  valor: number;
  onSalvar: (valorStr: string) => Promise<void>;
}> = ({ label, sublabel, valor, onSalvar }) => {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const abrir = () => {
    setRascunho(valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
    setErro(null);
    setEditando(true);
  };

  const salvar = async () => {
    const v = parseValor(rascunho);
    if (v <= 0) {
      setErro("Informe um valor válido maior que zero.");
      return;
    }
    try {
      setSalvando(true);
      await onSalvar(v.toFixed(2));
      setEditando(false);
    } catch (e) {
      console.error("Erro ao salvar", e);
      setErro("Não foi possível salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex-1">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {label} {sublabel && <span className="text-xs">{sublabel}</span>}
      </p>
      {!editando ? (
        <div className="flex items-center gap-2 mt-1">
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{brl(valor)}</p>
          <button
            onClick={abrir}
            title="Editar"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-1">
          <input
            type="text"
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            autoFocus
            className="w-44 px-3 py-2 border rounded-lg bg-white dark:bg-slate-800
                      text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700
                      text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" /> {salvando ? "..." : "Salvar"}
          </button>
          <button
            onClick={() => setEditando(false)}
            disabled={salvando}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600
                      dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {erro && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{erro}</p>}
    </div>
  );
};

interface MetaTabProps {
  /** Faturamento do ano anterior (vendas + serviços), calculado na Visão Geral */
  faturamentoAnoAnterior?: number;
  /** Ano usado como base de comparação (ex.: 2025) */
  anoAnterior?: number;
}

const MetaTab: React.FC<MetaTabProps> = ({ faturamentoAnoAnterior = 0, anoAnterior }) => {
  const { total, totalAno, dados, carregando } = useDashboard();
  const { configuracoes, editarConfiguracao } = useConfiguracoes();

  // META é definida de forma ANUAL...
  const METAanual = useMemo(() => {
    const cfg = configuracoes.find((c) => c.chave === "META");
    return parseValor(cfg?.valor);
  }, [configuracoes]);

  // Faturamento do ano passado — calculado automaticamente (mesma base da Visão Geral)
  const anoPassado = faturamentoAnoAnterior;

  // ...mas o PL é apurado por TRIMESTRE (META ÷ 4)
  const META = METAanual / 4;
  const faturamento = total; // base TRIMESTRAL (o PL é por trimestre)

  const faixas = useMemo(() => {
    return FAIXAS.map((bonus) => {
      const mult = multiplicador(bonus);
      const cor = corFaixa(bonus);
      const alvo = META * mult; // alvo trimestral
      const batida = alvo > 0 && faturamento >= alvo;
      const falta = Math.max(alvo - faturamento, 0);
      const progresso = alvo > 0 ? Math.min((faturamento / alvo) * 100, 100) : 0;
      // Se bater essa faixa TODO trimestre → faturamento anual projetado
      const anualProjetado = METAanual * mult;
      const crescAnual =
        anoPassado > 0 ? ((anualProjetado - anoPassado) / anoPassado) * 100 : null;
      return { bonus, mult, cor, alvo, batida, falta, progresso, anualProjetado, crescAnual };
    });
  }, [META, METAanual, faturamento, anoPassado]);

  const faixaAtual = [...faixas].reverse().find((f) => f.batida) || null;
  const proximaFaixa = faixas.find((f) => !f.batida) || null;
  const plAtual = faixaAtual ? faixaAtual.bonus : 0;

  if (carregando) {
    return (
      <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-10 text-center text-gray-500 dark:text-gray-300">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
        Carregando dados de meta...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Definições (META anual + ano passado) ─────────── */}
      <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-5">
        <div className="flex flex-col md:flex-row gap-6">
          <ValorEditavel
            label="META Anual"
            sublabel="(base · 65% · 1,0×)"
            valor={METAanual}
            onSalvar={(v) => editarConfiguracao("META", v)}
          />
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Faturamento do Ano Passado <span className="text-xs">(base de comparação)</span>
            </p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">
              {brl(anoPassado)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {anoAnterior ? `ano ${anoAnterior} · ` : ""}calculado da Visão Geral
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          O valor da META é <strong>anual</strong>. O PL é apurado por <strong>trimestre</strong>,
          usando META ÷ 4 = <strong>{brl(META)}</strong> como base trimestral.
        </p>
      </div>

      {/* ─── Destaque: PL que os funcionários vão receber ──── */}
      <div
        className="rounded-xl shadow-sm p-6 text-white"
        style={{
          background:
            plAtual > 0
              ? "linear-gradient(135deg, #16a34a, #15803d)"
              : "linear-gradient(135deg, #475569, #334155)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Trophy className="w-12 h-12 opacity-90" />
            <div>
              <p className="text-sm uppercase tracking-wide opacity-90">
                PL que os funcionários vão receber — trimestre atual
              </p>
              <p className="text-5xl font-extrabold leading-tight">{plAtual}%</p>
              <p className="text-sm opacity-90">
                {plAtual > 0
                  ? "do salário, com base no faturamento até agora"
                  : "nenhuma faixa atingida ainda"}
              </p>
            </div>
          </div>
          <div className="md:text-right">
            <p className="text-sm opacity-90">Faturamento do trimestre</p>
            <p className="text-2xl font-bold">{brl(total)}</p>
            {proximaFaixa && (
              <p className="text-sm opacity-90 mt-1">
                Faltam <strong>{brl(proximaFaixa.falta)}</strong> para {proximaFaixa.bonus}%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Cards de resumo ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Faturamento do Trimestre</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-yellow-300 mt-2">
                {brl(total)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Ano: {brl(totalAno)}
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-yellow-300" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Meta 100% (trimestre)</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">
                {brl(META * 1.4)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Bônus máximo do trimestre
              </p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/40 p-3 rounded-full">
              <Target className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bônus Atual</p>
              <p
                className="text-2xl font-bold mt-2"
                style={{ color: faixaAtual ? "#16a34a" : "#9ca3af" }}
              >
                {faixaAtual ? `${faixaAtual.bonus}%` : "—"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {faixaAtual ? "Faixa garantida no momento" : "Nenhuma faixa atingida ainda"}
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
              <Trophy className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Próxima Faixa</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {proximaFaixa ? `${proximaFaixa.bonus}%` : "100% ✅"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {proximaFaixa
                  ? `Faltam ${brl(proximaFaixa.falta)}`
                  : "Todas as metas batidas!"}
              </p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
              <Flag className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Faixas de bonificação ───────────────────────── */}
      <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
          Faixas de Bonificação (PL) — Trimestre
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Faturamento trimestral necessário para cada percentual de bônus do salário. Abaixo de
          cada multiplicador, a projeção do <strong>faturamento anual</strong> caso a meta seja
          batida em <strong>todos os trimestres</strong> e o crescimento vs o ano passado
          ({brl(anoPassado)}).
        </p>

        <div className="space-y-3">
          {faixas.map((f) => (
            <div
              key={f.bonus}
              className={`rounded-xl border p-4 transition-colors ${
                f.batida
                  ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                  : proximaFaixa && f.bonus === proximaFaixa.bonus
                  ? "border-purple-300 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20"
                  : "border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-slate-800/40"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3 md:w-60 shrink-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-sm shadow shrink-0"
                    style={{ backgroundColor: f.cor }}
                  >
                    {f.bonus}%
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      Bônus {f.bonus}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {f.mult.toLocaleString("pt-BR", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 4,
                      })}× META÷4
                    </p>
                    {/* Projeção anual + crescimento vs ano passado */}
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-snug">
                      Se bater todo trim.: <strong>{brl(f.anualProjetado)}</strong>/ano
                    </p>
                    {f.crescAnual !== null && (
                      <p
                        className={`text-xs leading-snug ${
                          f.crescAnual >= 0
                            ? "text-green-600 dark:text-green-400 font-semibold"
                            : "text-red-600 dark:text-red-400 font-semibold"
                        }`}
                      >
                        ({f.crescAnual >= 0 ? "+" : ""}
                        {f.crescAnual.toFixed(2)}% vs ano passado)
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Alvo:{" "}
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {brl(f.alvo)}
                      </span>
                    </span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                      {f.progresso.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${f.progresso}%`,
                        backgroundColor: f.batida ? "#16a34a" : f.cor,
                      }}
                    />
                  </div>
                </div>

                <div className="md:w-52 shrink-0 md:text-right">
                  {f.batida ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4" /> Meta atingida
                    </span>
                  ) : (
                    <>
                      <p className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Faltam </span>
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          {brl(f.falta)}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Composição do trimestre */}
        {dados.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Composição do trimestre
            </p>
            <div className="flex flex-wrap gap-2">
              {dados.map((m) => (
                <span
                  key={m.mes}
                  className="px-3 py-1 rounded-full text-xs bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300"
                >
                  {m.mes}: <strong>{brl(m.total)}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetaTab;
