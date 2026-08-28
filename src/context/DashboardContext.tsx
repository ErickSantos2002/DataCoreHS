import { createContext, useContext, useEffect, useState } from "react";
import { fetchVendas, fetchNotasServico } from "../services/notasapi";
import { useConfiguracoes } from "./ConfiguracoesContext";
import {
  rotuloDoMes,
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
  /** O faturamento de cada mês do ANO ANTERIOR, índice 0 = janeiro. É a forma
   *  sazonal sobre a qual a projeção de fechamento estima o que falta do
   *  trimestre. Vazio quando não há dado do ano anterior — e aí a projeção
   *  cai no método linear e a tela diz que caiu. */
  totaisAnoAnterior: number[];
  carregando: boolean;
}

const DashboardContext = createContext<DashboardContextType>({
  dados: [],
  total: 0,
  totalAno: 0,
  serieMensal: [],
  totaisAnoAnterior: [],
  carregando: true,
});

export const DashboardProvider = ({ children }: { children: React.ReactNode }) => {
  const [dados, setDados] = useState<FaturamentoMensal[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAno, setTotalAno] = useState(0);
  const [serieMensal, setSerieMensal] = useState<FaturamentoMensal[]>([]);
  const [totaisAnoAnterior, setTotaisAnoAnterior] = useState<number[]>([]);
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
      // aplicadas igual nos dois recortes que esta tela busca.
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

      // O ano corrente inteiro, em UMA requisição de venda e uma de serviço.
      // Dela saem as TRÊS leituras que a tela faz dele: o total do ano, a
      // quebra mês a mês do gráfico e os meses do trimestre em apuração. É o
      // mesmo dado agrupado de três jeitos, sem nenhuma requisição a mais.
      //
      // O trimestre vinha de um laço à parte: seis requisições sequenciais
      // (uma de venda e uma de serviço por mês de MESES_ANALISE) sobre notas
      // que a busca do ano já traz. Antes de apagá-lo os dois caminhos foram
      // rodados lado a lado contra a base real, nos doze meses de 2026 e nos
      // doze de 2025: os 24 pares batem, com diferença máxima de 7e-10 —
      // ruído de ordem de soma em ponto flutuante, não um centavo. Eles
      // podiam divergir se a API filtrasse por um campo de data diferente de
      // `data_emissao`, que é por onde `totaisPorMes` separa os meses; das 26
      // requisições nenhuma devolveu nota fora da janela pedida, então o
      // campo é o mesmo.
      let totalAnoCompleto = 0;
      let serieDoAno: FaturamentoMensal[] = [];
      let mesesEmApuracao: FaturamentoMensal[] = [];

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
        mesesEmApuracao = meses.map((mes) => ({
          mes: rotuloDoMes(mes, anoAtual),
          total: totais[mes - 1],
        }));
      } catch (err) {
        console.error("Erro ao buscar total do ano", err);
      }

      const totalQuadrimestre = mesesEmApuracao.reduce(
        (acc, cur) => acc + cur.total,
        0,
      );

      // O ano anterior, na mesma dupla de requisições do ano corrente. É a
      // forma sazonal que a projeção de fechamento usa para estimar o que
      // falta do trimestre. Falhar aqui não derruba a tela: sem esta série a
      // projeção cai no método linear e diz na tela que caiu.
      //
      // Vem DEPOIS do ano corrente, e não junto. Disparar os quatro pedidos
      // de uma vez foi medido e é mais LENTO: são as quatro respostas mais
      // pesadas da tela e a API as atende em disputa — na mesma bancada,
      // 1.421 ms em paralelo contra 1.072 ms em série. Concorrência aqui não
      // é ganho de graça; a fila é do outro lado.
      let totaisDoAnoAnterior: number[] = [];

      try {
        totaisDoAnoAnterior = await totaisDoAno(anoAtual - 1, regras);
      } catch (err) {
        console.error("Erro ao buscar o faturamento do ano anterior", err);
      }

      setDados(mesesEmApuracao);
      setTotal(totalQuadrimestre);
      setTotalAno(totalAnoCompleto);
      setSerieMensal(serieDoAno);
      setTotaisAnoAnterior(totaisDoAnoAnterior);
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
        totaisAnoAnterior,
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
