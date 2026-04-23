import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fetchResumoProduto, fetchCentroCustoConfig, salvarCentroCustoConfig } from "../services/notasapi";

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface ServicoAduaneiro {
  mes_ano: string;
  valor: string;
  nf: string;
}

interface CustoDireto {
  descricao: string;
  valor: string;
}

interface FormCC {
  servicos_aduaneiros: ServicoAduaneiro[];
  participacao_pct: string;
  unidades_importadas: string;
  custos_diretos: CustoDireto[];
  estimativa_custos_variaveis_anual: string;
  unidades_lote_mes: string;
  quantidade_planejada: string;
  preco_unitario_planejado: string;
}

interface ResumoProduto {
  receita: number;
  quantidade: number;
}

// ── Constantes ─────────────────────────────────────────────────────────────────

const PRODUTOS = [
  { key: "BAFÔMETRO PHOEBUS",               label: "Phoebus",      cor: "#2563eb" },
  { key: "BAFÔMETRO PASSIVO - IBLOW 10 PRO", label: "iBlow 10 PRO", cor: "#7c3aed" },
  { key: "BAFÔMETRO - MARK X PLUS",          label: "Mark X Plus",  cor: "#16a34a" },
] as const;

type ProdutoKey = typeof PRODUTOS[number]["key"];

const ANOS = [2022, 2023, 2024, 2025, 2026];

const emptyForm = (): FormCC => ({
  servicos_aduaneiros: [],
  participacao_pct: "",
  unidades_importadas: "",
  custos_diretos: [],
  estimativa_custos_variaveis_anual: "",
  unidades_lote_mes: "",
  quantidade_planejada: "",
  preco_unitario_planejado: "",
});

// ── Helpers ────────────────────────────────────────────────────────────────────

const n = (v: string): number => parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;

const applyMoneyMask = (value: string): string => {
  const clean = value.replace(/[^\d,]/g, "");
  const [intPart = "", decPart] = clean.split(",");
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart !== undefined ? `${formatted},${decPart}` : formatted;
};

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatBRLOrDash = (v: number | null) =>
  v === null ? "—" : formatBRL(v);

// ── Componente ─────────────────────────────────────────────────────────────────

interface Props {
  anoCentro: number;
  setAnoCentro: (ano: number) => void;
}

const CentroCustoTab: React.FC<Props> = ({ anoCentro, setAnoCentro }) => {
  const [produtoAtivo, setProdutoAtivo] = useState<ProdutoKey>("BAFÔMETRO PHOEBUS");
  const [resumo, setResumo] = useState<Record<ProdutoKey, ResumoProduto | null>>({
    "BAFÔMETRO PHOEBUS": null,
    "BAFÔMETRO PASSIVO - IBLOW 10 PRO": null,
    "BAFÔMETRO - MARK X PLUS": null,
  });
  const [forms, setForms] = useState<Record<ProdutoKey, FormCC>>({
    "BAFÔMETRO PHOEBUS": emptyForm(),
    "BAFÔMETRO PASSIVO - IBLOW 10 PRO": emptyForm(),
    "BAFÔMETRO - MARK X PLUS": emptyForm(),
  });
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvoMsg, setSalvoMsg] = useState(false);
  const [erroSalvo, setErroSalvo] = useState<string | null>(null);

  // ── Carregar dados ──────────────────────────────────────────────────────────

  const carregarTudo = useCallback(async () => {
    setCarregando(true);
    try {
      const resultados = await Promise.all(
        PRODUTOS.map(async (p) => {
          const [dados, cfg] = await Promise.all([
            fetchResumoProduto(p.key, anoCentro),
            fetchCentroCustoConfig(p.key, anoCentro),
          ]);
          const totalReceita = dados.reduce((s: number, r: any) => s + r.receita, 0);
          const totalQtd = dados.reduce((s: number, r: any) => s + r.quantidade, 0);
          return { key: p.key as ProdutoKey, resumo: { receita: totalReceita, quantidade: totalQtd }, cfg };
        })
      );

      const novoResumo = { ...resumo };
      const novoForms = { ...forms };

      for (const r of resultados) {
        novoResumo[r.key] = r.resumo;
        const cj = r.cfg?.config_json;
        if (cj) {
          novoForms[r.key] = {
            servicos_aduaneiros: (cj.servicos_aduaneiros ?? []).map((s: any) => ({
              mes_ano: s.mes_ano ?? "",
              valor: s.valor != null ? String(s.valor) : "",
              nf: s.nf ?? "",
            })),
            participacao_pct: cj.participacao_pct != null ? String(cj.participacao_pct) : "",
            unidades_importadas: cj.unidades_importadas != null ? String(cj.unidades_importadas) : "",
            custos_diretos: (cj.custos_diretos ?? []).map((c: any) => ({
              descricao: c.descricao ?? "",
              valor: c.valor != null ? String(c.valor) : "",
            })),
            estimativa_custos_variaveis_anual: cj.estimativa_custos_variaveis_anual != null
              ? String(cj.estimativa_custos_variaveis_anual) : "",
            unidades_lote_mes: cj.unidades_lote_mes != null ? String(cj.unidades_lote_mes) : "",
            quantidade_planejada: cj.quantidade_planejada != null ? String(cj.quantidade_planejada) : "",
            preco_unitario_planejado: cj.preco_unitario_planejado != null ? String(cj.preco_unitario_planejado) : "",
          };
        } else {
          novoForms[r.key] = emptyForm();
        }
      }

      setResumo(novoResumo);
      setForms(novoForms);
    } finally {
      setCarregando(false);
    }
  }, [anoCentro]);

  useEffect(() => { carregarTudo(); }, [anoCentro]);

  // ── Salvar ──────────────────────────────────────────────────────────────────

  const salvar = async () => {
    setSalvando(true);
    setErroSalvo(null);
    try {
      const f = forms[produtoAtivo];
      const config_json = {
        servicos_aduaneiros: f.servicos_aduaneiros.map((s) => ({
          mes_ano: s.mes_ano,
          valor: n(s.valor),
          nf: s.nf,
        })),
        participacao_pct: n(f.participacao_pct),
        unidades_importadas: n(f.unidades_importadas),
        custos_diretos: f.custos_diretos.map((c) => ({
          descricao: c.descricao,
          valor: n(c.valor),
        })),
        estimativa_custos_variaveis_anual: n(f.estimativa_custos_variaveis_anual),
        unidades_lote_mes: n(f.unidades_lote_mes),
        quantidade_planejada: n(f.quantidade_planejada) || null,
        preco_unitario_planejado: n(f.preco_unitario_planejado) || null,
      };
      await salvarCentroCustoConfig({ produto: produtoAtivo, ano: anoCentro, cmv_unitario: null, frete_unitario: null, outros_custos_unitario: null, config_json });
      setSalvoMsg(true);
      setTimeout(() => setSalvoMsg(false), 2500);
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? err?.message ?? "Erro desconhecido";
      setErroSalvo(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setSalvando(false);
    }
  };

  // ── Mutações do form ────────────────────────────────────────────────────────

  const setForm = (patch: Partial<FormCC>) =>
    setForms((prev) => ({ ...prev, [produtoAtivo]: { ...prev[produtoAtivo], ...patch } }));

  const f = forms[produtoAtivo];
  const r = resumo[produtoAtivo];
  const produtoCor = PRODUTOS.find((p) => p.key === produtoAtivo)?.cor ?? "#2563eb";

  // ── Cálculos ────────────────────────────────────────────────────────────────

  const totalAduaneiro = f.servicos_aduaneiros.reduce((s, x) => s + n(x.valor), 0);
  const pct = n(f.participacao_pct) / 100;
  const unidadesImportadas = n(f.unidades_importadas);
  const custoAduaneiroPorUn =
    pct > 0 && unidadesImportadas > 0
      ? (totalAduaneiro * pct) / unidadesImportadas
      : null;

  const totalDireto = f.custos_diretos.reduce((s, x) => s + n(x.valor), 0);

  const estimativaAnual = n(f.estimativa_custos_variaveis_anual);
  const estimativaMensal = estimativaAnual > 0 ? estimativaAnual / 12 : null;
  const unidadesLote = n(f.unidades_lote_mes);
  const overheadPorUn =
    estimativaMensal && pct > 0 && unidadesLote > 0
      ? (estimativaMensal * pct) / unidadesLote
      : null;

  const custoTotalPorUn =
    (custoAduaneiroPorUn ?? 0) + totalDireto + (overheadPorUn ?? 0);

  const qtdPlanejada = n(f.quantidade_planejada);
  const precoPlanejado = n(f.preco_unitario_planejado);
  const usandoQtdManual = qtdPlanejada > 0;
  const usandoPrecoManual = precoPlanejado > 0;

  const ticketMedioSistema = r && r.quantidade > 0 ? r.receita / r.quantidade : null;
  const ticketMedio = usandoPrecoManual ? precoPlanejado : ticketMedioSistema;

  const margemPorUn = ticketMedio !== null && custoTotalPorUn > 0
    ? ticketMedio - custoTotalPorUn : null;
  const margemPct = margemPorUn !== null && ticketMedio
    ? (margemPorUn / ticketMedio) * 100 : null;

  const qtdEfetiva = usandoQtdManual ? qtdPlanejada : (r?.quantidade ?? 0);
  const receitaProjetada = ticketMedio !== null && qtdEfetiva > 0
    ? ticketMedio * qtdEfetiva : null;
  const margemTotalProjetada = margemPorUn !== null && qtdEfetiva > 0
    ? margemPorUn * qtdEfetiva : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Seletor de Ano */}
      <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-4 mb-4 flex flex-wrap items-center gap-4">
        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Ano:</span>
        <div className="flex gap-2">
          {ANOS.map((ano) => (
            <button
              key={ano}
              onClick={() => setAnoCentro(ano)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors
                ${anoCentro === ano
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
            >
              {ano}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs de produto */}
      <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm mb-4 px-4 pt-3 pb-0">
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {PRODUTOS.map((p) => (
            <button
              key={p.key}
              onClick={() => setProdutoAtivo(p.key)}
              className={`px-5 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors -mb-px
                ${produtoAtivo === p.key
                  ? "border-b-2 bg-opacity-10"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              style={produtoAtivo === p.key
                ? { borderBottomColor: p.cor, color: p.cor }
                : {}}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Coluna formulário (2/3) ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* 1. Serviços Aduaneiros */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">1. Serviços Aduaneiros</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">NFs de importação que incluem este produto</p>
                </div>
                <button
                  onClick={() => setForm({ servicos_aduaneiros: [...f.servicos_aduaneiros, { mes_ano: "", valor: "", nf: "" }] })}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 border border-blue-300 dark:border-blue-700 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={13} /> Adicionar NF
                </button>
              </div>

              {f.servicos_aduaneiros.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-4">
                  Nenhuma NF adicionada. Clique em "Adicionar NF".
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  <div className="grid grid-cols-[100px_1fr_100px_32px] gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 px-1">
                    <span>Mês/Ano</span><span>Valor (R$)</span><span>NF</span><span />
                  </div>
                  {f.servicos_aduaneiros.map((s, i) => (
                    <div key={i} className="grid grid-cols-[100px_1fr_100px_32px] gap-2 items-center">
                      <input
                        className="input-cc"
                        placeholder="03/2026"
                        value={s.mes_ano}
                        onChange={(e) => {
                          const arr = [...f.servicos_aduaneiros];
                          arr[i] = { ...arr[i], mes_ano: e.target.value };
                          setForm({ servicos_aduaneiros: arr });
                        }}
                      />
                      <input
                        className="input-cc"
                        placeholder="221.371,58"
                        value={s.valor}
                        onChange={(e) => {
                          const arr = [...f.servicos_aduaneiros];
                          arr[i] = { ...arr[i], valor: applyMoneyMask(e.target.value) };
                          setForm({ servicos_aduaneiros: arr });
                        }}
                      />
                      <input
                        className="input-cc"
                        placeholder="7858"
                        value={s.nf}
                        onChange={(e) => {
                          const arr = [...f.servicos_aduaneiros];
                          arr[i] = { ...arr[i], nf: e.target.value };
                          setForm({ servicos_aduaneiros: arr });
                        }}
                      />
                      <button
                        onClick={() => setForm({ servicos_aduaneiros: f.servicos_aduaneiros.filter((_, j) => j !== i) })}
                        className="text-red-400 hover:text-red-600 transition-colors flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 text-right">
                    Total NFs: <span className="font-semibold text-gray-700 dark:text-gray-300">{formatBRL(totalAduaneiro)}</span>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">% participação do produto</label>
                  <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                    <input
                      className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 outline-none"
                      placeholder="78"
                      value={f.participacao_pct}
                      onChange={(e) => setForm({ participacao_pct: e.target.value })}
                    />
                    <span className="px-2 text-xs text-gray-400 bg-gray-50 dark:bg-slate-800 border-l border-gray-300 dark:border-gray-600 py-2">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Unidades importadas (total NFs)</label>
                  <input
                    className="input-cc w-full"
                    placeholder="510"
                    value={f.unidades_importadas}
                    onChange={(e) => setForm({ unidades_importadas: e.target.value })}
                  />
                </div>
              </div>

              {custoAduaneiroPorUn !== null && (
                <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-2 text-xs">
                  <span className="text-blue-600 dark:text-blue-400 font-mono">
                    {formatBRL(totalAduaneiro)} × {f.participacao_pct}% ÷ {f.unidades_importadas} un
                  </span>
                  <span className="ml-2 font-bold text-blue-700 dark:text-blue-300">
                    = {formatBRL(custoAduaneiroPorUn)} / unidade
                  </span>
                </div>
              )}
            </div>

            {/* 2. Custos Diretos */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">2. Custos Diretos por Unidade</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Produto, embalagem, insumos, frete, etc.</p>
                </div>
                <button
                  onClick={() => setForm({ custos_diretos: [...f.custos_diretos, { descricao: "", valor: "" }] })}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 border border-blue-300 dark:border-blue-700 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={13} /> Adicionar item
                </button>
              </div>

              {f.custos_diretos.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-4">
                  Nenhum custo adicionado. Clique em "Adicionar item".
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_140px_32px] gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 px-1">
                    <span>Descrição</span><span>Valor / unidade (R$)</span><span />
                  </div>
                  {f.custos_diretos.map((c, i) => (
                    <div key={i} className="grid grid-cols-[1fr_140px_32px] gap-2 items-center">
                      <input
                        className="input-cc"
                        placeholder="Ex: Caixa, Frete, Produto..."
                        value={c.descricao}
                        onChange={(e) => {
                          const arr = [...f.custos_diretos];
                          arr[i] = { ...arr[i], descricao: e.target.value };
                          setForm({ custos_diretos: arr });
                        }}
                      />
                      <input
                        className="input-cc"
                        placeholder="0,00"
                        value={c.valor}
                        onChange={(e) => {
                          const arr = [...f.custos_diretos];
                          arr[i] = { ...arr[i], valor: applyMoneyMask(e.target.value) };
                          setForm({ custos_diretos: arr });
                        }}
                      />
                      <button
                        onClick={() => setForm({ custos_diretos: f.custos_diretos.filter((_, j) => j !== i) })}
                        className="text-red-400 hover:text-red-600 transition-colors flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 text-right">
                    Total custos diretos: <span className="font-semibold text-gray-700 dark:text-gray-300">{formatBRL(totalDireto)} / unidade</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Custos Variáveis */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">3. Custos Variáveis (Overhead)</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Despesas fixas da empresa alocadas proporcionalmente ao produto</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Estimativa anual total (R$)</label>
                  <input
                    className="input-cc w-full"
                    placeholder="6.240.000"
                    value={f.estimativa_custos_variaveis_anual}
                    onChange={(e) => setForm({ estimativa_custos_variaveis_anual: applyMoneyMask(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Estimativa mensal (automático)</label>
                  <div className="input-cc w-full bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                    {estimativaMensal !== null ? formatBRL(estimativaMensal) : "—"}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">% participação do produto</label>
                  <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                    <input
                      className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 outline-none"
                      placeholder="78"
                      value={f.participacao_pct}
                      onChange={(e) => setForm({ participacao_pct: e.target.value })}
                    />
                    <span className="px-2 text-xs text-gray-400 bg-gray-50 dark:bg-slate-800 border-l border-gray-300 dark:border-gray-600 py-2">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Unidades vendidas/mês (lote)</label>
                  <input
                    className="input-cc w-full"
                    placeholder="34"
                    value={f.unidades_lote_mes}
                    onChange={(e) => setForm({ unidades_lote_mes: e.target.value })}
                  />
                </div>
              </div>

              {overheadPorUn !== null && (
                <div className="mt-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-4 py-2 text-xs">
                  <span className="text-purple-600 dark:text-purple-400 font-mono">
                    {formatBRL(estimativaMensal!)} × {f.participacao_pct}% ÷ {f.unidades_lote_mes} un
                  </span>
                  <span className="ml-2 font-bold text-purple-700 dark:text-purple-300">
                    = {formatBRL(overheadPorUn)} / unidade
                  </span>
                </div>
              )}
            </div>

            {/* 4. Projeção de Vendas */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">4. Projeção de Vendas <span className="font-normal text-gray-400">(opcional)</span></h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Quando preenchidos, substituem os dados do sistema nos cálculos de margem. Útil para anos em andamento ou projeções.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Quantidade planejada (un)
                    {usandoQtdManual && (
                      <span className="ml-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded font-semibold">MANUAL</span>
                    )}
                  </label>
                  <input
                    className="input-cc w-full"
                    placeholder={r ? `${r.quantidade.toFixed(0)} (sistema)` : "Ex: 510"}
                    value={f.quantidade_planejada}
                    onChange={(e) => setForm({ quantidade_planejada: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Preço unitário (R$)
                    {usandoPrecoManual && (
                      <span className="ml-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded font-semibold">MANUAL</span>
                    )}
                  </label>
                  <input
                    className="input-cc w-full"
                    placeholder={ticketMedioSistema ? `${ticketMedioSistema.toFixed(2).replace(".", ",")} (sistema)` : "Ex: 2890,00"}
                    value={f.preco_unitario_planejado}
                    onChange={(e) => setForm({ preco_unitario_planejado: applyMoneyMask(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Botão Salvar */}
            <button
              onClick={salvar}
              disabled={salvando}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
              style={{ borderTop: `3px solid ${produtoCor}` }}
            >
              {salvando ? "Salvando..." : salvoMsg ? "✓ Configuração salva!" : `Salvar configuração — ${PRODUTOS.find(p => p.key === produtoAtivo)?.label}`}
            </button>

            {erroSalvo && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
                <span className="font-semibold">Erro ao salvar: </span>{erroSalvo}
              </div>
            )}
          </div>

          {/* ── Coluna resumo (1/3) ── */}
          <div className="space-y-4">

            {/* Dados do Sistema */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-5 border-t-4" style={{ borderTopColor: produtoCor }}>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Dados do Sistema</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Receita Real</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{r ? formatBRL(r.receita) : "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Qtd Vendida</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{r ? `${r.quantidade.toFixed(0)} un` : "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Ticket Médio</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{ticketMedioSistema ? formatBRL(ticketMedioSistema) : "—"}</span>
                </div>
              </div>

              {(usandoQtdManual || usandoPrecoManual) && (
                <div className="mt-3 border-t border-amber-200 dark:border-amber-800 pt-3 space-y-2 text-sm">
                  <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Projeção Manual</p>
                  {usandoQtdManual && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Qtd Planejada</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">{qtdPlanejada.toFixed(0)} un</span>
                    </div>
                  )}
                  {usandoPrecoManual && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Preço Unitário</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">{formatBRL(precoPlanejado)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Resumo de Custos */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Resumo de Custos / Unidade</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Serviços Aduaneiros</span>
                  <span className="tabular-nums text-gray-700 dark:text-gray-300">{formatBRLOrDash(custoAduaneiroPorUn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Custos Diretos</span>
                  <span className="tabular-nums text-gray-700 dark:text-gray-300">{totalDireto > 0 ? formatBRL(totalDireto) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Overhead</span>
                  <span className="tabular-nums text-gray-700 dark:text-gray-300">{formatBRLOrDash(overheadPorUn)}</span>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                  <div className="flex justify-between font-bold text-base">
                    <span className="text-gray-800 dark:text-gray-200">Custo Total</span>
                    <span className="tabular-nums text-gray-900 dark:text-gray-100">
                      {custoTotalPorUn > 0 ? formatBRL(custoTotalPorUn) : "—"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-500 dark:text-gray-400">
                    Preço Unitário
                    {usandoPrecoManual && (
                      <span className="ml-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[9px] px-1 py-0.5 rounded font-semibold">MANUAL</span>
                    )}
                  </span>
                  <span className="tabular-nums text-gray-700 dark:text-gray-300">{ticketMedio ? formatBRL(ticketMedio) : "—"}</span>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-700 dark:text-gray-300">Margem / unidade</span>
                    <span
                      className="tabular-nums"
                      style={{ color: margemPorUn === null ? "#9ca3af" : margemPorUn >= 0 ? "#16a34a" : "#dc2626" }}
                    >
                      {formatBRLOrDash(margemPorUn)}
                    </span>
                  </div>
                  {margemPct !== null && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500 dark:text-gray-400">Margem %</span>
                      <span
                        className="font-bold tabular-nums"
                        style={{ color: margemPct >= 0 ? "#16a34a" : "#dc2626" }}
                      >
                        {margemPct.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                {margemTotalProjetada !== null && qtdEfetiva > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 space-y-1">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                      Projeção — {qtdEfetiva.toFixed(0)} un {usandoQtdManual ? "(manual)" : "(sistema)"}
                    </p>
                    {receitaProjetada !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Receita Projetada</span>
                        <span className="tabular-nums text-gray-700 dark:text-gray-300">{formatBRL(receitaProjetada)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-700 dark:text-gray-300">Margem Total</span>
                      <span
                        className="tabular-nums"
                        style={{ color: margemTotalProjetada >= 0 ? "#16a34a" : "#dc2626" }}
                      >
                        {formatBRL(margemTotalProjetada)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Metodologia resumida */}
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
              <p className="font-semibold text-gray-600 dark:text-gray-300 mb-2">Como é calculado</p>
              <p><span className="font-medium text-blue-600 dark:text-blue-400">Aduaneiro/un</span> = Σ NFs × % ÷ unidades importadas</p>
              <p><span className="font-medium text-gray-600 dark:text-gray-300">Direto/un</span> = Σ custos por unidade</p>
              <p><span className="font-medium text-purple-600 dark:text-purple-400">Overhead/un</span> = (Anual ÷ 12) × % ÷ unid/mês</p>
              <p className="pt-1 border-t border-gray-200 dark:border-gray-700"><span className="font-bold text-gray-700 dark:text-gray-200">Margem/un</span> = Preço − Custo Total</p>
              <p><span className="font-medium text-amber-600 dark:text-amber-400">Projeção</span> = Margem/un × Qtd planejada</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentroCustoTab;
