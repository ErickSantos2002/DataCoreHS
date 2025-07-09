import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { fetchNotas } from "../services/notasapi";

interface FaturamentoMensal {
  mes: string;
  total: number;
}

const META = 3000000;

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [dadosAtual, setDadosAtual] = useState<FaturamentoMensal[]>([]);
  const [totalAtual, setTotalAtual] = useState<number>(0);

  useEffect(() => {
    const carregarQuadrimestreAtual = async () => {
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const meses = [4, 5, 6, 7]; // Maio a Agosto (base 0)
      const cfopValidos = ["6102", "5102", "6108", "5108"];
      const resultados: FaturamentoMensal[] = [];

      for (const mesIndex of meses) {
        const dataInicio = new Date(anoAtual, mesIndex, 1);
        const dataFim = new Date(anoAtual, mesIndex + 1, 0);

        try {
          const notas = await fetchNotas({
            data_inicio: dataInicio.toISOString().slice(0, 10),
            data_fim: dataFim.toISOString().slice(0, 10),
          });

          const notasFiltradas = notas.filter((nota: any) => {
          const situacaoOk = (nota.descricao_situacao || "").toLowerCase().trim() === "emitida danfe";
          const cfop = extrairCFOP(nota.natureza_operacao);
          const naturezaOk = cfopValidos.includes(cfop);

          const marcadoresInvalidos = [
            "cancelar",
            "cliente não quis o produto",
            "nf devolvida",
            "nf cancelada",
            "nf recusada",
            "nf recusada. cliente solicitou frete",
            "inutilizada",
          ];

          const marcadorOk =
            !nota.marcadores ||
            nota.marcadores.every((m: any) => {
              const desc = (m?.descricao || "").toLowerCase().trim();
              return !marcadoresInvalidos.includes(desc);
            });

          const valor = parseFloat(nota.valor_nota || "0");

          return naturezaOk && situacaoOk && marcadorOk && !isNaN(valor) && valor > 0;
        });

          const totalMes = notasFiltradas.reduce((acc: number, nota: any) => {
            const valor = parseFloat(nota.valor_nota || "0");
            return acc + valor;
          }, 0);

          const nomeMes = dataInicio.toLocaleString("pt-BR", { month: "long" });
          resultados.push({
            mes: `${nomeMes[0].toUpperCase()}${nomeMes.slice(1)}/${anoAtual}`,
            total: totalMes,
          });
        } catch (err) {
          console.error(`Erro ao buscar notas de ${mesIndex + 1}/${anoAtual}`, err);
        }
      }

      setDadosAtual(resultados);
      setTotalAtual(resultados.reduce((acc, cur) => acc + cur.total, 0));
    };

    carregarQuadrimestreAtual();
  }, []);

  const extrairCFOP = (texto: string | null | undefined): string => {
    if (!texto) return "";
    const match = texto.match(/\b(\d{4})\b/);
    return match ? match[1] : "";
  };

  const progressoAtual = Math.min((totalAtual / META) * 100, 100);

  const Speedometer = ({ progress = 0, goal = META, value = 0 }: { progress?: number; goal?: number; value?: number }) => {
    const safeProgress = isNaN(progress) ? 0 : Math.min(Math.max(progress, 0), 100);
    const radius = 60;
    const circumference = Math.PI * radius;
    const dash = (safeProgress / 100) * circumference;

    return (
      <div className="flex flex-col items-center p-4">
        <svg width="160" height="100" viewBox="0 0 160 100">
          <path d="M20 80 A60 60 0 0 1 140 80" fill="none" stroke="#e5e7eb" strokeWidth="12" />
          <path d="M20 80 A60 60 0 0 1 140 80" fill="none" stroke="#3b82f6" strokeWidth="12" strokeDasharray={`${dash}, ${circumference}`} strokeLinecap="round" />
        </svg>
        <div className="text-center mt-2">
          <p className="text-sm text-gray-600">Progresso</p>
          <p className="text-xl font-bold text-blue-600">{safeProgress.toFixed(1)}%</p>
          <p className="text-sm text-gray-500">(R$ {value.toLocaleString('pt-BR')})</p>
          <p className="text-xs text-gray-400 mt-1">Meta: R$ {goal.toLocaleString('pt-BR')}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-1">
        Bem-vindo, <span className="font-semibold">{user?.username}</span>!
      </p>
      <p className="mb-6 text-gray-600">
        Sua permissão: <span className="inline-block bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">{user?.role}</span>
      </p>

      <div className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row items-center gap-8 md:gap-16 justify-center">
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-800 text-center md:text-left">Quadrimestre Atual (Mai–Ago)</h2>
          <ul className="text-gray-700 space-y-2 mb-4 text-center md:text-left">
            {dadosAtual.map((item) => (
              <li key={item.mes}>
                <span className="font-medium">{item.mes}:</span>{" "}
                <span className="text-blue-700 font-bold">
                  R$ {item.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Speedometer progress={progressoAtual} goal={META} value={totalAtual} />
      </div>
    </div>
  );
};

export default Dashboard;