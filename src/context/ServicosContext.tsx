import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchNotasServico } from "../services/notasapi";
import { useAuth } from "../hooks/useAuth";

interface Servico {
  id: number;
  numero_nfse: string;
  data_emissao: string;
  valor_servico: number | string;
  valor_total_recebido?: number | string;
  valor_iss?: number | string;
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
  atualizarServicos: () => Promise<void>;
}

const ServicosContext = createContext<ServicosContextType | undefined>(undefined);

export const ServicosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Função para converter valor string para número
  const converterParaNumero = (valor: string | number | undefined): number => {
    if (typeof valor === "number") return valor;
    if (!valor) return 0;

    // Remove R$, espaços e formata corretamente
    const valorLimpo = valor
      .toString()
      .replace(/R\$/g, "")
      .replace(/\s/g, "")
      .replace(/\./g, "") // Remove pontos de milhar
      .replace(",", "."); // Troca vírgula por ponto

    const numero = parseFloat(valorLimpo);
    return isNaN(numero) ? 0 : numero;
  };

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

        return {
          ...servico,
          data_emissao: dataEmissaoAjustada,
          valor_servico: converterParaNumero(servico.valor_servico),
          valor_total_recebido: converterParaNumero(servico.valor_total_recebido),
          valor_iss: converterParaNumero(servico.valor_iss),
        };
      });

      setServicos(servicosNormalizados);
    } catch (error) {
      console.error("Erro ao buscar serviços:", error);
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
        valor_servico_numero: converterParaNumero(servico.valor_servico),
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
