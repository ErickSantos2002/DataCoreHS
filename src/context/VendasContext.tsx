import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchVendas } from "../services/notasapi";

// Tipagem da Nota (igual à que você já tem no Vendas.tsx)
interface Nota {
  id: number;
  data_emissao: string;
  valor_nota: number;
  cliente: { 
    nome: string; 
    cpf_cnpj: string; 
  } | null;
  nome_vendedor: string;
  itens: { 
    descricao: string; 
    quantidade: string; 
    valor_total: string;
    valor_unitario?: string;
    codigo?: string;
  }[];
  observacoes?: string | null;
}


// Tipagem do contexto
interface VendasContextType {
  notas: Nota[];
  carregando: boolean;
  /**
   * A mensagem de falha da última busca, ou `null` quando deu certo.
   *
   * O `catch` só escrevia no console: a tela de Financeiro abria com "Sem
   * dados" nos cinco anos e quem olhava não distinguia "a API caiu" de "a
   * empresa não faturou". Quem desenha o aviso é a tela, com o `Alert` do
   * design system — mesmo conserto que as telas de Contas já receberam.
   */
  erro: string | null;
  atualizarNotas: () => Promise<void>; // Para forçar refresh se precisar
}

const VendasContext = createContext<VendasContextType | undefined>(undefined);

export const VendasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Função para buscar e atualizar as notas
  const atualizarNotas = async () => {
    try {
      setCarregando(true);
      const data = await fetchVendas();
      setNotas(Array.isArray(data) ? data : []);
      setErro(null);
    } catch (error) {
      console.error("Erro ao buscar notas:", error);
      setNotas([]);
      setErro("Não foi possível carregar as notas de venda.");
    } finally {
      setCarregando(false);
    }
  };

  // Buscar uma vez ao montar
  useEffect(() => {
    atualizarNotas();
  }, []);

  return (
    <VendasContext.Provider value={{ notas, carregando, erro, atualizarNotas }}>
      {children}
    </VendasContext.Provider>
  );
};

// Hook para usar em qualquer lugar
export const useVendas = () => {
  const context = useContext(VendasContext);
  if (!context) {
    throw new Error("useVendas deve ser usado dentro de um VendasProvider");
  }
  return context;
};
