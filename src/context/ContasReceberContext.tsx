import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchContasReceber } from "../services/notasapi";

export interface ContaReceber {
  id: number;
  id_tiny: number;
  data: string;
  vencimento: string;
  competencia: string | null;
  valor: string | number;
  saldo: string | number;
  link_boleto: string | null;
  nro_documento: string | null;
  serie_documento: string | null;
  nro_banco: string | null;
  historico: string | null;
  categoria: string | null;
  forma_pagamento: string | null;
  portador: string | null;
  situacao: string | null;
  liquidacao: string | null;
  ocorrencia: string;
  dia_vencimento: number | null;
  numero_parcelas: number | null;
  dia_vencimento_semanal: number | null;
  cliente_codigo: string | null;
  cliente_nome: string;
  cliente_tipo_pessoa: string | null;
  cliente_cpf_cnpj: string | null;
  cliente_ie: string | null;
  cliente_rg: string | null;
  cliente_endereco: string | null;
  cliente_numero: string | null;
  cliente_complemento: string | null;
  cliente_bairro: string | null;
  cliente_cep: string | null;
  cliente_cidade: string | null;
  cliente_uf: string | null;
  cliente_pais: string | null;
  cliente_fone: string | null;
  cliente_email: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ContaReceberEnriquecida extends ContaReceber {
  valor_numero: number;
  saldo_numero: number;
  mes: string;
  ano: number;
  vencida: boolean;
}

interface ContasReceberContextType {
  contas: ContaReceber[];
  contasEnriquecidas: ContaReceberEnriquecida[];
  carregando: boolean;
  atualizarContas: () => Promise<void>;
}

const ContasReceberContext = createContext<ContasReceberContextType | undefined>(undefined);

const converterParaNumero = (valor: string | number | undefined): number => {
  if (typeof valor === "number") return valor;
  if (!valor) return 0;
  const str = valor.toString().replace(/R\$/g, "").replace(/\s/g, "");
  if (str.includes(",")) {
    const limpo = str.replace(/\./g, "").replace(",", ".");
    return parseFloat(limpo) || 0;
  }
  return parseFloat(str) || 0;
};

export const ContasReceberProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [carregando, setCarregando] = useState(true);

  const atualizarContas = useCallback(async () => {
    try {
      setCarregando(true);
      const data = await fetchContasReceber();
      setContas(data);
    } catch (error) {
      console.error("Erro ao buscar contas a receber:", error);
    } finally {
      setCarregando(false);
    }
  }, []);

  const contasEnriquecidas = React.useMemo<ContaReceberEnriquecida[]>(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return contas.map((conta) => {
      const [ano, mes, dia] = conta.data.split("-");
      const dataEmissao = new Date(Number(ano), Number(mes) - 1, Number(dia));

      const [vAno, vMes, vDia] = conta.vencimento.split("-");
      const dataVencimento = new Date(Number(vAno), Number(vMes) - 1, Number(vDia));

      const situacaoLower = conta.situacao?.toLowerCase() ?? "";
      const vencida = dataVencimento < hoje && situacaoLower !== "pago" && situacaoLower !== "recebido";

      return {
        ...conta,
        valor_numero: converterParaNumero(conta.valor),
        saldo_numero: converterParaNumero(conta.saldo),
        mes: dataEmissao.toLocaleDateString("pt-BR", { month: "long" }),
        ano: dataEmissao.getFullYear(),
        vencida,
      };
    });
  }, [contas]);

  useEffect(() => {
    atualizarContas();
  }, [atualizarContas]);

  return (
    <ContasReceberContext.Provider value={{ contas, contasEnriquecidas, carregando, atualizarContas }}>
      {children}
    </ContasReceberContext.Provider>
  );
};

export const useContasReceber = () => {
  const context = useContext(ContasReceberContext);
  if (!context) {
    throw new Error("useContasReceber deve ser usado dentro de um ContasReceberProvider");
  }
  return context;
};
