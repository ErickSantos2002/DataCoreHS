import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartTheme, corDaSerie, useTemaDoGrafico } from "../../design-system/chartTheme";
import { Card, CardTitle } from "../../design-system/ui";
import { formatarValorAbreviado, type PontoDeEvolucao } from "./vendedores";

/** Índice da rampa de séries do `chartTheme`, com nome em vez de número. */
const SERIE_ACAO = 0;

export interface GraficosDeVendedoresProps {
  evolucao: PontoDeEvolucao[];
  topProdutos: { produto: string; valor: number }[];
  distribuicaoClientes: { name: string; value: number }[];
}

/**
 * Evolução da mercadoria, os cinco produtos de maior valor e a distribuição
 * pelos oito maiores clientes.
 *
 * Nasce limpo, sobre o `chartTheme`. Saem as oito cores cravadas (`CORES`) e os
 * três balões de estilo próprio — um deles sempre branco, mesmo no tema escuro,
 * e outro que perguntava `classList.contains("dark")` no render, sem nada que o
 * fizesse renderizar de novo na troca de tema.
 *
 * ⚠️ As barras do "Top Produtos" eram LARANJA e a linha era azul. Aqui as duas
 * saem na cor de ação — a mesma mudança deliberada que Produtos fez (ver o
 * retrato de 10/09 na spec). A pizza passa da rampa de oito para a de seis do
 * `chartTheme`: a sétima e a oitava fatias repetem as duas primeiras cores.
 */
export function GraficosDeVendedores({
  evolucao,
  topProdutos,
  distribuicaoClientes,
}: GraficosDeVendedoresProps) {
  useTemaDoGrafico();
  return (
    <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card padding="lg">
        <CardTitle className="mb-4">Evolução das Vendas</CardTitle>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={evolucao}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid.stroke} />
            <XAxis
              dataKey="mes"
              tick={{ fill: chartTheme.axis.stroke, fontSize: 12 }}
              axisLine={{ stroke: chartTheme.grid.stroke }}
            />
            <YAxis
              tickFormatter={(value) => formatarValorAbreviado(value)}
              tick={{ fill: chartTheme.axis.stroke, fontSize: 12 }}
              axisLine={{ stroke: chartTheme.grid.stroke }}
            />
            <Tooltip
              contentStyle={chartTheme.tooltip}
              itemStyle={{ color: corDaSerie(SERIE_ACAO) }}
              formatter={(value: number) => formatarValorAbreviado(value)}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke={corDaSerie(SERIE_ACAO)}
              strokeWidth={3}
              dot={{ fill: corDaSerie(SERIE_ACAO), r: 4 }}
              activeDot={{ r: 6, fill: corDaSerie(SERIE_ACAO) }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card padding="lg">
        <CardTitle className="mb-4">Top Produtos Vendidos</CardTitle>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topProdutos} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid.stroke} />
            <XAxis
              dataKey="produto"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fill: chartTheme.axis.stroke, fontSize: 12 }}
              tickFormatter={(value: string) =>
                value.length > 12 ? `${value.substring(0, 12)}...` : value
              }
            />
            <YAxis
              tick={{ fill: chartTheme.axis.stroke, fontSize: 12 }}
              tickFormatter={(value: number) => formatarValorAbreviado(value)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const { produto, valor } = payload[0].payload;
                  return (
                    <div
                      style={{
                        ...chartTheme.tooltip,
                        padding: "8px 12px",
                        maxWidth: "250px",
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                        overflow: "hidden",
                      }}
                    >
                      <p style={{ fontWeight: 600, marginBottom: "4px" }}>{produto}</p>
                      <p style={{ color: corDaSerie(SERIE_ACAO) }}>
                        Valor:{" "}
                        {typeof valor === "number"
                          ? `R$ ${valor.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : "N/A"}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="valor" fill={corDaSerie(SERIE_ACAO)} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card padding="lg">
        <CardTitle className="mb-4">Distribuição de Clientes</CardTitle>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={distribuicaoClientes}
              cx="50%"
              cy="50%"
              label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill={corDaSerie(SERIE_ACAO)}
              dataKey="value"
            >
              {distribuicaoClientes.map((_fatia, indice) => (
                <Cell key={`cell-${indice}`} fill={corDaSerie(indice)} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const { name, value } = payload[0].payload;
                  return (
                    <div
                      style={{
                        ...chartTheme.tooltip,
                        padding: "8px 12px",
                        maxWidth: "260px",
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                      }}
                    >
                      <p style={{ fontWeight: 600, marginBottom: "4px" }}>{name}</p>
                      <p style={{ color: corDaSerie(SERIE_ACAO) }}>
                        valor: {formatarValorAbreviado(value)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
