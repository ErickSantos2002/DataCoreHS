import React, { useState } from "react";
import { useToast } from "./ToastProvider";

interface ModalTrocarSenhaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (novaSenha: string) => void;
}

const ModalTrocarSenha: React.FC<ModalTrocarSenhaProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [novaSenha, setNovaSenha] = useState("");
  const [repitaSenha, setRepitaSenha] = useState("");
  const { erro } = useToast();

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (novaSenha !== repitaSenha) {
      erro("As senhas não coincidem.");
      return;
    }
    onConfirm(novaSenha);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-overlay z-50 p-4 sm:p-6">
      <div className="bg-surface rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-md mx-auto">
        <h2 className="text-lg font-semibold mb-6 text-center text-conteudo-heading">
          Trocar Senha
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-conteudo">
              Nova senha:
            </label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full mt-1 p-2 border border-borda rounded-lg bg-surface text-conteudo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-conteudo">
              Repita nova senha:
            </label>
            <input
              type="password"
              value={repitaSenha}
              onChange={(e) => setRepitaSenha(e.target.value)}
              className="w-full mt-1 p-2 border border-borda rounded-lg bg-surface text-conteudo"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-borda bg-surface text-conteudo rounded hover:bg-surface-elevated"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalTrocarSenha;
