import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchNotasServico } from "../services/notasapi";
import { useAuth } from "../hooks/useAuth";

/**
 * Uma nota de serviço, como `/faturamento/servicos` a entrega.
 *
 * Os três valores são NÚMERO, e não mais `number | string`: a origem grava
 * texto em duas convenções, e quem converte agora é o `gold`. A união com
 * `string` era o que obrigava cada consumidor a converter — e foi assim que
 * uma cópia antiga da conversão sobreviveu aqui dentro.
 */
interface Servico {
  id: number;
  numero_nfse: number;
  data_emissao: string;
  valor_servico: number;
  valor_total_recebido?: number;
  valor_iss?: number;
  razao_social_tomador: string;
  cpf_cnpj_tomador: string;
  email_tomador?: string;
  telefone_tomador?: string;
  cidade_tomador: string;
  uf_tomador: string;
  discriminacao_servico: string;
  status?: string;
}

interface ServicoEnriquecido extends Servico {
  valor_servico_numero: number;
  mes: string;
  ano: number;
}

interface ServicosContextType {
  servicos: Servico[];
  servicosEnriquecidos: ServicoEnriquecido[];
  carregando: boolean;
  /**
   * A mensagem de falha da última busca, ou `null` quando deu certo.
   *
   * Mesmo motivo do `VendasContext`: sem isto a tela de Financeiro abre
   * zerada com a API caída e não avisa ninguém.
   */
  erro: string | null;
  atualizarServicos: () => Promise<void>;
}

const ServicosContext = createContext<ServicosContextType | undefined>(undefined);

export const ServicosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const atualizarServicos = useCallback(async () => {
    try {
      setCarregando(true);
      const servicosData = await fetchNotasServico();

      // 🔹 Normaliza e ajusta a data local (sem UTC)
      const servicosNormalizados = servicosData.map((servico: any) => {
        let dataEmissaoAjustada = servico.data_emissao;
        // 🔹 Ajuste de data local (sem UTC e sem "Z")
        if (servico.data_emissao && typeof servico.data_emissao === "string") {
          const [ano, mes, dia] = servico.data_emissao.split("-");
          const dataLocal = new Date(Number(ano), Number(mes) - 1, Number(dia));
          // Aqui geramos manualmente no formato local, sem toISOString()
          dataEmissaoAjustada = `${dataLocal.getFullYear()}-${String(dataLocal.getMonth() + 1).padStart(2, "0")}-${String(dataLocal.getDate()).padStart(2, "0")}`;
        }

        // Os três valores já chegam como número de `/faturamento/servicos`, que os lê
        // do `gold`. Aqui morava uma CÓPIA da conversão de texto para número — a versão
        // antiga, sem o teste de ponto-de-milhar que o `lib/dinheiro.ts` ganhou depois.
        // Nela `"1.234"` viraria R$ 1,23. Nenhuma nota caía nesse caso hoje (medido:
        // zero), mas a cópia era bomba armada esperando um cadastro escrito de outro
        // jeito — e some junto com o texto que a obrigava a existir.
        return { ...servico, data_emissao: dataEmissaoAjustada };
      });

      setServicos(servicosNormalizados);
      setErro(null);
    } catch (error) {
      console.error("Erro ao buscar serviços:", error);
      setServicos([]);
      setErro("Não foi possível carregar as notas de serviço.");
    } finally {
      setCarregando(false);
    }
  }, []);

  // Enriquecer serviços com dados adicionais
  const servicosEnriquecidos = React.useMemo(() => {
    return servicos.map((servico) => {
      // 🔹 Garante que estamos usando a data já ajustada localmente
      const [ano, mes, dia] = servico.data_emissao.split("-");
      const data = new Date(Number(ano), Number(mes) - 1, Number(dia));

      return {
        ...servico,
        // `valor_servico` já é número; o campo continua existindo com o nome antigo
        // porque a tela de Financeiro e a de Serviços o leem assim.
        valor_servico_numero: servico.valor_servico,
        mes: data.toLocaleDateString("pt-BR", { month: "long" }),
        ano: data.getFullYear(),
      };
    });
  }, [servicos]);

  useEffect(() => {
    atualizarServicos();
  }, [atualizarServicos]);

  return (
    <ServicosContext.Provider
      value={{
        servicos,
        servicosEnriquecidos,
        carregando,
        erro,
        atualizarServicos,
      }}
    >
      {children}
    </ServicosContext.Provider>
  );
};

export const useServicos = () => {
  const context = useContext(ServicosContext);
  if (!context) {
    throw new Error("useServicos deve ser usado dentro de um ServicosProvider");
  }
  return context;
};
