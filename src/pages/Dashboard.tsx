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
      const meses = [5, 6, 7, 8];
      const dataInicio = `${anoAtual}-${String(meses[0]).padStart(2, "0")}-01`;
      const dataFim = new Date(anoAtual, meses[meses.length - 1], 0).toISOString().slice(0, 10);

      const naturezas = ["6102", "5102", "6108", "5108"];

      try {
        const notasTodas = await fetchNotas({
          data_inicio: dataInicio,
          data_fim: dataFim,
        });

        const notasFiltradas = notasTodas.filter((nota: any) => {
          const naturezaOk = naturezaValida(nota.natureza_operacao, naturezas);
          const situacaoOk = (nota.descricao_situacao || "").toLowerCase().includes("emitida danfe");
          const marcadorOk = !nota.marcadores || nota.marcadores.every((m: any) => !m?.descricao || m.descricao.trim() === "");
          const valor = parseFloat(nota.valor_nota || nota.valor_faturado || "0");
          const valorValido = !isNaN(valor) && valor > 0;
          return naturezaOk && situacaoOk && marcadorOk && valorValido;
        });

        const agrupado: Record<string, number> = {};
        for (const nota of notasFiltradas) {
          const data = new Date(nota.data_emissao);
          const mes = data.toLocaleString("pt-BR", { month: "long" });
          const chave = `${mes[0].toUpperCase()}${mes.slice(1)}/${data.getFullYear()}`;
          const valor = parseFloat(nota.valor_nota || nota.valor_faturado || "0");
          agrupado[chave] = (agrupado[chave] || 0) + valor;
        }

        const dadosArray = Object.entries(agrupado).map(([mes, total]) => ({ mes, total }));
        const somaTotal = dadosArray.reduce((acc, cur) => acc + cur.total, 0);

        setDadosAtual(dadosArray);
        setTotalAtual(somaTotal);
      } catch (err) {
        console.error("Erro ao buscar notas fiscais:", err);
      }
    };

    carregarQuadrimestreAtual();
  }, []);

  const naturezaValida = (texto: string | null | undefined, codigos: string[]) => {
    if (!texto) return false;
    const normalizado = texto.toLowerCase();
    return codigos.some(cod => normalizado.includes(cod));
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