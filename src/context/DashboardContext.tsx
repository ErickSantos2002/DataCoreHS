import { createContext, useContext, useEffect, useState } from "react";
import { fetchNotas, fetchNotasServico } from "../services/notasapi";
import { useConfiguracoes } from "./ConfiguracoesContext";

interface FaturamentoMensal {
  mes: string;
  total: number;
}

interface DashboardContextType {
  dados: FaturamentoMensal[];
  total: number;
  carregando: boolean;
}

const DashboardContext = createContext<DashboardContextType>({
  dados: [],
  total: 0,
  carregando: true,
});

export const DashboardProvider = ({ children }: { children: React.ReactNode }) => {
  const [dados, setDados] = useState<FaturamentoMensal[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);

  const { configuracoes, carregando: carregandoConfig } = useConfiguracoes();

  useEffect(() => {
    const carregar = async () => {
      if (carregandoConfig) return;

      function getArray(chave: string): string[] {
        const config = configuracoes.find((c) => c.chave === chave);
        return config?.valor?.split(",").map((v) => v.trim()) || [];
      }

      // Extrai valores das configurações
      const cfopValidos = getArray("CFOP_VALIDOS");
      const marcadoresInvalidos = getArray("MARCADORES_INVALIDOS");
      const meses = getArray("MESES_ANALISE").map(Number);

      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const resultados: FaturamentoMensal[] = [];

      for (const mesIndex of meses) {
        const dataInicio = new Date(anoAtual, mesIndex, 1);
        const dataFim = new Date(anoAtual, mesIndex + 1, 0);

        try {
          const notas = await fetchNotas({
            data_inicio: format(dataInicio),
            data_fim: format(dataFim),
          });

          const filtradas = notas.filter((nota: any) => {
            const cfop = extrairCFOP(nota.natureza_operacao);
            const naturezaOk = cfopValidos.includes(cfop);
            const situacaoOk = (nota.descricao_situacao || "").toLowerCase().trim() === "emitida danfe";
            const marcadorOk =
              !nota.marcadores ||
              nota.marcadores.every((m: any) => {
                const desc = (m?.descricao || "").toLowerCase().trim();
                return !marcadoresInvalidos.includes(desc);
              });
            const valor = parseFloat(nota.valor_nota || "0");
            return naturezaOk && situacaoOk && marcadorOk && !isNaN(valor) && valor > 0;
          });

          const totalVenda = filtradas.reduce((acc: number, nota: any) => acc + parseFloat(nota.valor_nota || "0"), 0);

          const servicos = await fetchNotasServico({
            data_inicio: format(dataInicio),
            data_fim: format(dataFim),
          });

          const totalServico = servicos.reduce((acc: number, nota: any) => {
            let valorRaw = nota.valor_servico || "0";
            if (typeof valorRaw === "string") {
              valorRaw = valorRaw.replace(/\./g, "").replace(",", ".");
            }
            const valor = parseFloat(valorRaw);
            return acc + (isNaN(valor) ? 0 : valor);
          }, 0);

          const totalMes = totalVenda + totalServico;
          const nomeMes = dataInicio.toLocaleString("pt-BR", { month: "long" });

          resultados.push({
            mes: `${nomeMes[0].toUpperCase()}${nomeMes.slice(1)}/${anoAtual}`,
            total: totalMes,
          });
        } catch (err) {
          console.error(`Erro ao buscar mês ${mesIndex + 1}`, err);
        }
      }

      const total = resultados.reduce((acc, cur) => acc + cur.total, 0);
      setDados(resultados);
      setTotal(total);
      setCarregando(false);
    };

    carregar();
  }, [carregandoConfig, configuracoes]);

  return (
    <DashboardContext.Provider value={{ dados, total, carregando }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);

// Helpers
function format(date: Date) {
  return date.toISOString().slice(0, 10);
}

function extrairCFOP(texto: string | null | undefined): string {
  if (!texto) return "";
  const match = texto.match(/\b(\d{4})\b/);
  return match ? match[1] : "";
}
