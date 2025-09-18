import React from "react";

interface ModalObservacoesProps {
  observacoes: string | null;
  onClose: () => void;
}

const ModalObservacoes: React.FC<ModalObservacoesProps> = ({ observacoes, onClose }) => {
  if (!observacoes) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-lg w-full">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Observações da Nota
        </h2>

        <div className="max-h-60 overflow-y-auto text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
          {observacoes}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalObservacoes;
