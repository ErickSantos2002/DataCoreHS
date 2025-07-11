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
    return <div className="p-6 text-gray-500">Verificando permissões...</div>;
  }

  // Se não for admin
  if (!user || user.role !== "admin") {
    return (
      <div className="p-6 text-red-600 text-center font-semibold">
        Acesso negado. Esta página é restrita a administradores.
      </div>
    );

    // Ou, se preferir redirecionar:
    // return <Navigate to="/dashboard" replace />;
  }

  if (carregando) {
    return (
      <div className="p-6 text-gray-500">
        Carregando configurações...
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Configurações</h1>
      <p className="text-gray-600 mb-6">Gerencie os parâmetros utilizados no Dashboard.</p>

      <div className="bg-white rounded-xl shadow p-4">
        {configuracoes.map((cfg) => (
          <div
            key={cfg.id}
            className="border-b py-4 w-full flex flex-col gap-4 md:flex-row md:items-center"
          >
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-semibold mb-1">{cfg.chave}</p>
              {editandoId === cfg.id ? (
                <input
                  type="text"
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                  className="w-full overflow-x-auto whitespace-nowrap p-3 text-sm rounded-lg border border-blue-300 bg-blue-50 text-gray-800 font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  spellCheck={false}
                />
              ) : (
                <p className="text-gray-800 text-sm mt-1 whitespace-pre-line break-words">{cfg.valor}</p>
              )}
            </div>

            <div className="flex gap-2 md:ml-4">
              {editandoId === cfg.id ? (
                <>
                  <button
                    onClick={() => salvarEdicao(cfg.id, cfg.chave)}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={cancelarEdicao}
                    className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => iniciarEdicao(cfg.id, cfg.valor)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Editar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Configuracoes;
