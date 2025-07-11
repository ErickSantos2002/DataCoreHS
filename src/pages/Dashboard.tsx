import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useDashboard } from "../context/DashboardContext";
import { useConfiguracoes } from "../context/ConfiguracoesContext";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { dados, total, carregando } = useDashboard();
  const { configuracoes } = useConfiguracoes();

  const metaConfig = configuracoes.find((c) => c.chave === "META");
  const META = parseFloat(metaConfig?.valor || "3000000");

  const progressoAtual = Math.min((total / META) * 100, 100);

  const Speedometer = ({
    progress = 0,
    goal = META,
    value = 0,
  }: {
    progress?: number;
    goal?: number;
    value?: number;
  }) => {
    const safeProgress = isNaN(progress)
      ? 0
      : Math.min(Math.max(progress, 0), 100);
    const radius = 60;
    const circumference = Math.PI * radius;
    const dash = (safeProgress / 100) * circumference;

    return (
      <div className="flex flex-col items-center p-4">
        <svg width="160" height="100" viewBox="0 0 160 100">
          <path
            d="M20 80 A60 60 0 0 1 140 80"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
          />
          <path
            d="M20 80 A60 60 0 0 1 140 80"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="12"
            strokeDasharray={`${dash}, ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="text-center mt-2">
          <p className="text-sm text-gray-600">Progresso</p>
          <p className="text-xl font-bold text-blue-600">
            {safeProgress.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500">
            (R$ {value.toLocaleString("pt-BR")})
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Meta: R$ {goal.toLocaleString("pt-BR")}
          </p>
        </div>
      </div>
    );
  };

  if (carregando) {
    return (
      <div className="p-6 text-gray-500">Carregando dados do dashboard...</div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-1">
        Bem-vindo, <span className="font-semibold">{user?.username}</span>!
      </p>
      <p className="mb-6 text-gray-600">
        Sua permissão:{" "}
        <span className="inline-block bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
          {user?.role}
        </span>
      </p>

      <div className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row items-center gap-8 md:gap-16 justify-center">
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-800 text-center md:text-left">
            Quadrimestre Atual (Mai–Ago)
          </h2>
          <ul className="text-gray-700 space-y-2 mb-4 text-center md:text-left">
            {dados.map((item) => (
              <li key={item.mes}>
                <span className="font-medium">{item.mes}:</span>{" "}
                <span className="text-blue-700 font-bold">
                  R${" "}
                  {item.total.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Speedometer progress={progressoAtual} goal={META} value={total} />
      </div>
    </div>
  );
};

export default Dashboard;
