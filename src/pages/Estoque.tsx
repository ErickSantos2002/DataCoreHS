import { useEffect, useState } from "react";
import { fetchEstoque } from "../services/notasapi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface EstoqueItem {
  id: number;
  nome: string;
  codigo: number;
  preco: number;
  preco_promocional: number;
  saldo: number;
  localizacao: string;
  situacao: string;
}

export default function Estoque() {
  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      try {
        const data = await fetchEstoque();
        setEstoque(data);
      } catch (error) {
        console.error("Erro ao carregar estoque", error);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  if (loading)
    return (
      <p className="text-gray-600 dark:text-gray-300">Carregando estoque...</p>
    );

  // --- Métricas para os cards ---
  const valorTotal = estoque.reduce(
    (acc, item) => acc + item.preco * item.saldo,
    0
  );
  const numeroItens = estoque.length;
  const margemMedia = (
    estoque.reduce(
      (acc, item) => acc + (item.preco - item.preco_promocional),
      0
    ) / numeroItens || 0
  ).toFixed(2);

  // --- Gráfico Produtos mais estocados ---
  const topProdutos = [...estoque]
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 6)
    .map((item) => ({ nome: item.nome, saldo: item.saldo }));

  // --- Ranking de Produtos por Valor ---
  const rankingValorProdutos = estoque
    .map((item) => ({
      nome: item.nome,
      valor: item.preco * item.saldo,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 6);

  return (
    <div className="p-6 h-full bg-gray-100 dark:bg-darkBlue transition-colors flex flex-col gap-4">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-lg shadow transition-colors">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            VALOR TOTAL DO ESTOQUE
          </h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-yellow-300">
            R$ {valorTotal.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-lg shadow transition-colors">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            NÚMERO DE ITENS
          </h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-yellow-300">
            {numeroItens}
          </p>
        </div>
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-lg shadow transition-colors">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            MARGEM MÉDIA
          </h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-yellow-300">
            {margemMedia}%
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0 overflow-hidden">
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-lg shadow transition-colors">
          <h3 className="font-medium mb-4 text-gray-700 dark:text-gray-200">
            PRODUTOS MAIS ESTOCADOS
          </h3>
          <ResponsiveContainer width="99%" height={200}>
            <BarChart
              data={topProdutos}
              margin={{ top: 10, right: 20, left: 40, bottom: 5 }}
            >
              <XAxis
                dataKey="nome"
                stroke="currentColor"
                className="text-gray-700 dark:text-gray-300"
              />
              <YAxis
                stroke="currentColor"
                className="text-gray-700 dark:text-gray-300"
                tickFormatter={(value) => value.toLocaleString("pt-BR")}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", color: "#f8fafc" }}
              />
              <Bar dataKey="saldo" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-lg shadow transition-colors">
          <h3 className="font-medium mb-4 text-gray-700 dark:text-gray-200">
            PRODUTOS MAIS VALIOSOS
          </h3>
          <ResponsiveContainer width="99%" height={200}>
            <BarChart
              data={rankingValorProdutos}
              margin={{ top: 10, right: 20, left: 50, bottom: 5 }}
            >
              <XAxis
                dataKey="nome"
                stroke="currentColor"
                className="text-gray-700 dark:text-gray-300"
              />
              <YAxis
                stroke="currentColor"
                className="text-gray-700 dark:text-gray-300"
                tickFormatter={(value) =>
                  `R$ ${(value / 1000000).toFixed(1)}M`
                }
              />
              <Tooltip
                formatter={(value: number) => `R$ ${value.toLocaleString()}`}
                contentStyle={{ backgroundColor: "#1e293b", color: "#f8fafc" }}
              />
              <Bar dataKey="valor" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-[#0f172a] p-4 rounded-lg shadow flex flex-col transition-colors">
        <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-200">
          Lista de Estoque
        </h3>

        {/* 🔥 Scroll interno, altura controlada */}
        <div className="flex-1 overflow-y-auto max-h-[240px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="p-2 text-gray-700 dark:text-gray-300">Nome</th>
                <th className="p-2 text-gray-700 dark:text-gray-300">Código</th>
                <th className="p-2 text-gray-700 dark:text-gray-300">Preço</th>
                <th className="p-2 text-gray-700 dark:text-gray-300">
                  Preço Promocional
                </th>
                <th className="p-2 text-gray-700 dark:text-gray-300">Saldo</th>
                <th className="p-2 text-gray-700 dark:text-gray-300">
                  Situação
                </th>
              </tr>
            </thead>
            <tbody>
              {estoque.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-200 dark:border-gray-700"
                >
                  <td className="p-2 text-gray-800 dark:text-gray-200">
                    {item.nome}
                  </td>
                  <td className="p-2 text-gray-800 dark:text-gray-200">
                    {item.codigo}
                  </td>
                  <td className="p-2 text-gray-800 dark:text-gray-200">
                    R$ {item.preco}
                  </td>
                  <td className="p-2 text-gray-800 dark:text-gray-200">
                    R$ {item.preco_promocional}
                  </td>
                  <td className="p-2 text-gray-800 dark:text-gray-200">
                    {item.saldo}
                  </td>
                  <td className="p-2">
                    {item.situacao === "A" ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Ativo
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        Inativo
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
