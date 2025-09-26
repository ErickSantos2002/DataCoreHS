import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { updateUserPassword } from "../services/api";
import ModalTrocarSenha from "../components/ModalTrocarSenha"; // ajuste o caminho se necessário

const Home: React.FC = () => {
  const { user } = useAuth();
  const [modalAberta, setModalAberta] = useState(false);

  return (
    <div className="p-6">
      {/* Card do título e boas-vindas */}
      <div className="bg-white dark:bg-[#0f172a] shadow-sm rounded-xl p-6 mb-6 transition-colors">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-yellow-400">
          Início
        </h1>

        <p className="mb-2 text-gray-700 dark:text-gray-200">
          Seja bem-vindo ao sistema DataCoreHS,{" "}
          <span className="font-semibold">{user?.username}</span>!
        </p>

        <p className="text-gray-600 dark:text-gray-300">
          Sua permissão:{" "}
          <span className="inline-block rounded bg-blue-100 dark:bg-blue-900 px-2 py-1 text-blue-800 dark:text-blue-200">
            {user?.role}
          </span>
        </p>
      </div>

      {/* Card secundário de status */}
      <div className="p-6 rounded-xl bg-white dark:bg-[#0f172a] shadow transition-colors mb-6">
        <span className="text-gray-500 dark:text-gray-300">
          Você está autenticado. Agora você pode visualizar os módulos e dashboards do sistema!
        </span>
      </div>

      {/* Novo card de troca de senha (mesmo estilo dos outros) */}
      <div className="p-6 rounded-xl bg-white dark:bg-[#0f172a] shadow transition-colors">
        <p className="text-gray-700 dark:text-gray-200 font-medium">
          Deseja mais segurança? Troque sua senha clicando{" "}
          <button
            onClick={() => setModalAberta(true)}
            className="underline text-blue-700 dark:text-blue-400 font-semibold hover:text-blue-900 dark:hover:text-blue-200"
          >
            AQUI
          </button>
        </p>
      </div>

      {/* Modal de trocar senha */}
      <ModalTrocarSenha
        isOpen={modalAberta}
        onClose={() => setModalAberta(false)}
        onConfirm={async (novaSenha) => {
          try {
            if (user?.id) {
              await updateUserPassword(user.id, novaSenha);
              alert("Senha atualizada com sucesso!");
            } else {
              alert("Usuário não identificado.");
            }
          } catch (error) {
            alert("Erro ao atualizar senha, tente novamente.");
          }
        }}
      />
    </div>
  );
};

export default Home;
