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

  const progressoAtual = Math.min((total / META) * 140, 100);

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
    const centerX = 80;
    const centerY = 80;
    const circumference = Math.PI * radius;
    const dash = (safeProgress / 140) * circumference;

    const markerPercentages = [60, 70, 80, 90, 100];
    const bonificacoes = [
      { real: 90, bonus: "55%" },
      { real: 100, bonus: "65%" },
      { real: 110, bonus: "75%" },
      { real: 120, bonus: "85%" },
      { real: 130, bonus: "95%" },
      { real: 140, bonus: "100%" },
    ];

    const markers = bonificacoes.map(({ real, bonus }) => {
      const visualPercent = (real / 140) * 100;
      const angleDeg = 180 - (visualPercent / 100) * 180;
      const angleRad = (angleDeg * Math.PI) / 180;

      const innerRadius = radius - 6;
      const outerRadius = radius + 6;
      const bonusRadius = radius + 16;

      const x1 = centerX + innerRadius * Math.cos(angleRad);
      const y1 = centerY - innerRadius * Math.sin(angleRad);
      const x2 = centerX + outerRadius * Math.cos(angleRad);
      const y2 = centerY - outerRadius * Math.sin(angleRad);
      const xb = centerX + bonusRadius * Math.cos(angleRad);
      const yb = centerY - bonusRadius * Math.sin(angleRad);

      return (
        <g key={real}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="red" strokeWidth="2" />
          <text
            x={xb}
            y={yb}
            fill="purple"
            fontSize="9"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {bonus}
          </text>
        </g>
      );
    });

    return (
      <div className="flex flex-col items-center p-4">
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
            stroke="#3b82f6"
            strokeWidth="12"
            strokeDasharray={`${dash}, ${circumference}`}
            strokeLinecap="round"
          />
          {markers}
        </svg>
        <div className="text-center mt-2">
          <p className="text-sm text-gray-600">Progresso</p>
          <p className="text-xl font-bold text-blue-600">
            {safeProgress.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500">
            (R$ {value.toLocaleString("pt-BR")})
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

      <div className="bg-white rounded-xl shadow p-8 mt-6 grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* COLUNA ESQUERDA: INTRODUÇÃO */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            Relatório de Faturamento e Bonificação
          </h2>
          <p className="text-gray-700 max-w-xl">
            Esta página exibe o <strong>faturamento total do quadrimestre atual</strong>,
            considerando as Notas Fiscais de Venda e Serviço. Ao lado, temos um
            <strong> gráfico velocímetro</strong> com faixas de bonificação. Ao atingir cada marcação,
            a equipe receberá um <strong>PL proporcional</strong> à porcentagem alcançada da meta.
          </p>
        </div>

        <div className="flex flex-col w-full">
          <div className="flex justify-end">
            {/* TÍTULO ENTRE A LISTA E O VELOCÍMETRO */}
            <h2 className="text-lg font-semibold mb-4 text-gray-800 mr-10 lg:mr-32">
              Quadrimestre Atual
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-start sm:justify-end gap-6">
            {/* Lista de meses */}
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

            {/* Velocímetro mais para cima e à direita */}
            <div className="sm:mt-0">
              <Speedometer progress={progressoAtual} goal={META} value={total} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
