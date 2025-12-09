import React, { useState } from "react";
import { useConfiguracoes } from "../context/ConfiguracoesContext";
import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";

const Configuracoes: React.FC = () => {
  const { configuracoes, carregando, editarConfiguracao } = useConfiguracoes();
  const { user, loading } = useAuth();
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [novoValor, setNovoValor] = useState<string>("");

  const iniciarEdicao = (id: number, valorAtual: string) => {
    setEditandoId(id);
    setNovoValor(valorAtual);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNovoValor("");
  };

  const salvarEdicao = async (id: number, chave: string) => {
    await editarConfiguracao(chave, novoValor);
    cancelarEdicao();
  };

  // Se ainda está carregando auth
  if (loading) {
    return <div className="p-6 text-gray-500 dark:text-gray-300">Verificando permissões...</div>;
  }

  // Se não for admin
  if (!user || user.role !== "admin") {
    return (
      <div className="p-6 text-red-600 dark:text-red-400 text-center font-semibold">
        Acesso negado. Esta página é restrita a administradores.
      </div>
    );

    // Ou, se preferir redirecionar:
    // return <Navigate to="/dashboard" replace />;
  }

  if (carregando) {
    return (
      <div className="p-6 text-gray-500 dark:text-gray-300">
        Carregando configurações...
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Card de título e descrição */}
      <div className="bg-white dark:bg-[#0f172a] shadow-sm rounded-xl p-6 mb-6 transition-colors">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-yellow-400 mb-2">
          Configurações
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Gerencie os parâmetros utilizados no Dashboard.
        </p>
      </div>

      {/* Lista de configurações */}
      <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow p-4 transition-colors">
        {configuracoes.map((cfg) => (
          <div
            key={cfg.id}
            className="border-b border-gray-200 dark:border-gray-700 py-4 w-full flex flex-col gap-4 md:flex-row md:items-center"
          >
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1">
                {cfg.chave}
              </p>
              {cfg.chave === "ANIMACAO_META" ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const novoEstado = cfg.valor === "true" ? "false" : "true";
                      editarConfiguracao(cfg.chave, novoEstado);
                    }}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                      cfg.valor === "true"
                        ? "bg-green-600 dark:bg-green-500"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        cfg.valor === "true" ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {cfg.valor === "true" ? "Ativada" : "Desativada"}
                  </span>
                </div>
              ) : editandoId === cfg.id ? (
                <input
                  type="text"
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                  className="w-full overflow-x-auto whitespace-nowrap p-3 text-sm rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-[#1e293b] text-gray-800 dark:text-gray-200 font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[#0f172a] transition"
                  spellCheck={false}
                />
              ) : (
                <p className="text-gray-800 dark:text-gray-200 text-sm mt-1 whitespace-pre-line break-words">
                  {cfg.valor}
                </p>
              )}
            </div>

            {cfg.chave !== "ANIMACAO_META" && (
              <div className="flex gap-2 md:ml-4">
                {editandoId === cfg.id ? (
                  <>
                    <button
                      onClick={() => salvarEdicao(cfg.id, cfg.chave)}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm transition"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={cancelarEdicao}
                      className="px-3 py-1 bg-gray-400 dark:bg-gray-600 text-white rounded hover:bg-gray-500 dark:hover:bg-gray-700 text-sm transition"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => iniciarEdicao(cfg.id, cfg.valor)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition"
                  >
                    Editar
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Configuracoes;
