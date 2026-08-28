import { createContext, useContext, useEffect, useState } from "react";
import { fetchVendas, fetchNotasServico } from "../services/notasapi";
import { useConfiguracoes } from "./ConfiguracoesContext";
import {
  rotuloDoMes,
  somarServicos,
  somarVendas,
  totaisPorMes,
  type RegrasDeFaturamento,
} from "./faturamento";

interface FaturamentoMensal {
  mes: string;
  total: number;
}

interface DashboardContextType {
  /** Os meses do trimestre em apuração (MESES_ANALISE). */
  dados: FaturamentoMensal[];
  /** A soma do trimestre — o número que os velocímetros medem. */
  total: number;
  /** O faturamento do ano corrente inteiro. */
  totalAno: number;
  /** Janeiro até o mês corrente, para o gráfico de barras. Sai da MESMA
   *  requisição do `totalAno`: é a quebra por mês que antes era jogada fora. */
  serieMensal: FaturamentoMensal[];
  carregando: boolean;
}

const DashboardContext = createContext<DashboardContextType>({
  dados: [],
  total: 0,
  totalAno: 0,
  serieMensal: [],
  carregando: true,
});

export const DashboardProvider = ({ children }: { children: React.ReactNode }) => {
  const [dados, setDados] = useState<FaturamentoMensal[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAno, setTotalAno] = useState(0);
  const [serieMensal, setSerieMensal] = useState<FaturamentoMensal[]>([]);
  const [carregando, setCarregando] = useState(true);

  const { configuracoes, carregando: carregandoConfig } = useConfiguracoes();

  useEffect(() => {
    const carregar = async () => {
      if (carregandoConfig) return;

      function getArray(chave: string): string[] {
        const config = configuracoes.find((c) => c.chave === chave);
        return config?.valor?.split(",").map((v) => v.trim()) || [];
      }

      // O que conta como faturamento. As regras em si moram em faturamento.ts,
      // aplicadas igual nos três recortes que esta tela busca.
      const regras: RegrasDeFaturamento = {
        cfopValidos: getArray("CFOP_VALIDOS"),
        marcadoresInvalidos: getArray("MARCADORES_INVALIDOS"),
      };

      // MESES_ANALISE é 1-based (1 = janeiro), do jeito que se digita em
      // Configurações. O Date do JS conta mês a partir de 0 — daí o -1 abaixo.
      const meses = getArray("MESES_ANALISE")
        .map(Number)
        .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12);

      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const resultados: FaturamentoMensal[] = [];

      // Calcular total do quadrimestre (meses específicos)
      for (const mes of meses) {
        const dataInicio = new Date(anoAtual, mes - 1, 1);
        const dataFim = new Date(anoAtual, mes, 0);

        try {
          // Usando fetchVendas em vez de fetchNotas
          const notas = await fetchVendas({
            data_inicio: format(dataInicio),
            data_fim: format(dataFim),
          });

          const servicos = await fetchNotasServico({
            data_inicio: format(dataInicio),
            data_fim: format(dataFim),
          });

          resultados.push({
            mes: rotuloDoMes(mes, anoAtual),
            total: somarVendas(notas, regras) + somarServicos(servicos),
          });
        } catch (err) {
          console.error(`Erro ao buscar mês ${mes}`, err);
        }
      }

      const totalQuadrimestre = resultados.reduce((acc, cur) => acc + cur.total, 0);

      // O ano corrente inteiro, em UMA requisição de venda e uma de serviço.
      // Dela saem o total do ano e a quebra mês a mês do gráfico: a quebra é
      // o mesmo dado agrupado, sem nenhuma requisição a mais.
      let totalAnoCompleto = 0;
      let serieDoAno: FaturamentoMensal[] = [];

      try {
        const totais = await totaisDoAno(anoAtual, regras);
        totalAnoCompleto = totais.reduce((acc, valor) => acc + valor, 0);
        // Mês futuro ficaria como barra vazia no fim do gráfico, sugerindo
        // queda onde só há calendário. O gráfico para no mês corrente.
        serieDoAno = totais
          .slice(0, hoje.getMonth() + 1)
          .map((valor, indice) => ({
            mes: rotuloDoMes(indice + 1, anoAtual),
            total: valor,
          }));
      } catch (err) {
        console.error("Erro ao buscar total do ano", err);
      }

      setDados(resultados);
      setTotal(totalQuadrimestre);
      setTotalAno(totalAnoCompleto);
      setSerieMensal(serieDoAno);
      setCarregando(false);
    };

    carregar();
  }, [carregandoConfig, configuracoes]);

  return (
    <DashboardContext.Provider
      value={{
        dados,
        total,
        totalAno,
        serieMensal,
        carregando,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);

// Helpers

/** O faturamento de cada mês de um ano, em doze posições. Duas requisições —
 *  vendas e serviços do ano inteiro — e o agrupamento por data de emissão. */
async function totaisDoAno(
  ano: number,
  regras: RegrasDeFaturamento,
): Promise<number[]> {
  const inicio = format(new Date(ano, 0, 1));
  const fim = format(new Date(ano, 11, 31));

  const [vendas, servicos] = await Promise.all([
    fetchVendas({ data_inicio: inicio, data_fim: fim }),
    fetchNotasServico({ data_inicio: inicio, data_fim: fim }),
  ]);

  return totaisPorMes({ vendas, servicos, regras, ano });
}

function format(date: Date) {
  return date.toISOString().slice(0, 10);
}
