import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useDashboard } from "../context/DashboardContext";
import { useConfiguracoes } from "../context/ConfiguracoesContext";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { dados, total, carregando } = useDashboard();
  const { configuracoes } = useConfiguracoes();

  const metaConfig = configuracoes.find((c) => c.chave === "META");
  const META = parseFloat(metaConfig?.valor || "0");
  const META1 = META * 0.9;
  const META2 = META * 1.2;
  const META3 = META * 1.4;

  const progresso80 = Math.min((total / META1) * 100, 100);
  const progresso100 = Math.min((total / META2) * 100, 100);
  const progresso140 = Math.min((total / META3) * 100, 100);

  // ---------- COMPONENTE VELOCÍMETRO ----------
  const Speedometer = ({
    progress = 0,
    color,
    value = 0,
    goal,
    bonusLabel,
  }: {
    progress?: number;
    color: string;
    value?: number;
    goal: number;
    bonusLabel: string;
  }) => {
    const safeProgress = isNaN(progress)
      ? 0
      : Math.min(Math.max(progress, 0), 100);

    const radius = 60;
    const circumference = Math.PI * radius;
    const dash = (safeProgress / 100) * circumference;

    return (
      <div className="flex flex-col items-center p-2 w-full">
        <svg width="180" height="100" viewBox="0 0 160 100">
          <path
            d="M20 80 A60 60 0 0 1 140 80"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
          />
          <path
            d="M20 80 A60 60 0 0 1 140 80"
            fill="none"
            stroke={color}
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
            Valor Atual: (R$ {value.toLocaleString("pt-BR")})
          </p>
          {goal - value > 0 ? (
            <p className="text-sm text-gray-500">
              Diferença até a meta: (R$
              {(goal - value).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })})
            </p>
          ) : (
            <p className="text-sm text-green-600 font-semibold">
              Meta atingida! 🎉
            </p>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">{bonusLabel}</p>
      </div>
    );
  };

  // ---------- MAIN ----------
  if (carregando) {
    return (
      <div className="p-6 text-gray-500">Carregando dados do dashboard...</div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
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

      <div className="bg-white rounded-xl shadow p-8 mt-6 w-full max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* COLUNA ESQUERDA */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Relatório de Faturamento e Bonificação
            </h2>
            <p className="text-gray-700 max-w-sm text-justify">
              Esta página exibe o{" "}
              <strong>faturamento total do quadrimestre atual</strong>,
              considerando as Notas Fiscais de Venda e Serviço. Ao lado, temos
              um <strong>gráfico velocímetro</strong> com faixas de bonificação.
              Ao atingir cada marcação, a equipe receberá um{" "}
              <strong>PL proporcional</strong> à porcentagem alcançada da meta.
            </p>
          </div>

          {/* COLUNA DIREITA */}
          <div className="lg:col-span-3 flex flex-col w-full">
            <div className="flex justify-center lg:justify-end">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">
                Quadrimestre Atual
              </h2>
            </div>

            <div className="flex flex-col md:flex-row gap-8 w-full">
              {/* Lista à esquerda */}
              <div className="md:w-1/3">
                <ul className="text-gray-700 space-y-4 text-left">
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

              {/* Velocímetros à direita */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                <Speedometer
                  progress={progresso80}
                  goal={META1}
                  value={total}
                  color="#cd7f32"
                  bonusLabel="55%"
                />
                <Speedometer
                  progress={progresso100}
                  goal={META2}
                  value={total}
                  color="#7f8c8d"
                  bonusLabel="85%"
                />
                <Speedometer
                  progress={progresso140}
                  goal={META3}
                  value={total}
                  color="#ffd700"
                  bonusLabel="100%"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
