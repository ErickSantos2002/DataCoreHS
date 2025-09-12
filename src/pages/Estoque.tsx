import { useEffect, useState } from "react";
import { fetchEstoque } from "../services/notasapi";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
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

  if (loading) return <p>Carregando estoque...</p>;

  // --- Métricas para os cards ---
  const valorTotal = estoque.reduce((acc, item) => acc + (item.preco * item.saldo), 0);
  const numeroItens = estoque.length;
  const margemMedia = (
    (estoque.reduce((acc, item) => acc + (item.preco - item.preco_promocional), 0) / numeroItens) || 0
  ).toFixed(2);

  // --- Gráfico Produtos mais estocados ---
  const topProdutos = [...estoque]
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 6)
    .map(item => ({ nome: item.nome, saldo: item.saldo }));

  // --- Ranking de Produtos por Valor ---
  const rankingValorProdutos = estoque
    .map(item => ({
      nome: item.nome,
      valor: item.preco * item.saldo,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 6);

  return (
    <div className="h-screen grid grid-rows-[auto_auto_1fr] gap-4 px-4 pb-4 overflow-hidden">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium">VALOR TOTAL DO ESTOQUE</h3>
          <p className="text-2xl font-bold">R$ {valorTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium">NÚMERO DE ITENS</h3>
          <p className="text-2xl font-bold">{numeroItens}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium">MARGEM MÉDIA</h3>
          <p className="text-2xl font-bold">{margemMedia}%</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0 overflow-hidden">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium mb-4">PRODUTOS MAIS ESTOCADOS</h3>
          <ResponsiveContainer width="99%" height={200}>
            <BarChart data={topProdutos}>
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="saldo" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium mb-4">PRODUTOS MAIS VALIOSOS</h3>
          <ResponsiveContainer width="99%" height={200}>
            <BarChart data={rankingValorProdutos}>
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString()}`} />
              <Bar dataKey="valor" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col overflow-hidden">
        <h3 className="font-medium mb-4">Lista de Estoque</h3>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Nome</th>
                <th className="p-2">Código</th>
                <th className="p-2">Preço</th>
                <th className="p-2">Preço Promocional</th>
                <th className="p-2">Saldo</th>
                <th className="p-2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {estoque.map(item => (
                <tr key={item.id} className="border-b">
                  <td className="p-2">{item.nome}</td>
                  <td className="p-2">{item.codigo}</td>
                  <td className="p-2">R$ {item.preco}</td>
                  <td className="p-2">R$ {item.preco_promocional}</td>
                  <td className="p-2">{item.saldo}</td>
                  <td className="p-2">
                    {item.situacao === "A" ? (
                      <span className="text-green-600 font-medium">Ativo</span>
                    ) : (
                      <span className="text-red-600 font-medium">Inativo</span>
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
