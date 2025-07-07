import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { fetchNotas } from "../services/notasapi";

type FaturamentoMensal = {
  mes: string;
  total: number;
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [dadosMensais, setDadosMensais] = useState<FaturamentoMensal[]>([]);

  useEffect(() => {
    const carregarDados = async () => {
      const hoje = new Date();
      const resultados: FaturamentoMensal[] = [];

      for (let i = 3; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const ano = data.getFullYear();
        const mes = data.getMonth() + 1;
        const nomeMes = data.toLocaleString("pt-BR", { month: "long" });

        try {
          const notas = await fetchNotas(ano, mes, "intervalo");
          const total = notas.reduce((acc: number, nota: any) => {
            const valor = parseFloat(nota.valor_faturado || "0");
            return acc + (isNaN(valor) ? 0 : valor);
          }, 0);

          resultados.push({
            mes: `${nomeMes[0].toUpperCase()}${nomeMes.slice(1)}/${ano}`,
            total,
          });
        } catch (err) {
          console.error(`Erro ao buscar dados de ${mes}/${ano}:`, err);
        }
      }

      setDadosMensais(resultados);
    };

    carregarDados();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="mb-2">
        Bem-vindo, <span className="font-semibold">{user?.username}</span>!
      </p>
      <p>
        Sua permissão:{" "}
        <span className="inline-block rounded bg-blue-100 px-2 py-1 text-blue-800">
          {user?.role}
        </span>
      </p>

      <div className="mt-8 p-6 rounded-xl bg-white shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Faturamento dos últimos 4 meses
        </h2>
        <ul className="list-disc list-inside text-gray-600">
          {dadosMensais.map((item) => (
            <li key={item.mes}>
              {item.mes}:{" "}
              <span className="font-bold text-blue-700">
                R$ {item.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
