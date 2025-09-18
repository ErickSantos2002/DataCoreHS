import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchVendas, updateNotaTipo } from "../services/notasapi";
import { useAuth } from "../hooks/useAuth";

// Tipagem da Nota
interface Nota {
  id: number;
  data_emissao: string;
  valor_nota: number;
  cliente: { 
    nome: string; 
    cpf_cnpj: string; 
  } | null;
  nome_vendedor: string;
  tipo: "Outbound" | "Inbound" | "ReCompra" | null;
  itens: {
    descricao: string;
    quantidade: string;
    valor_total: string;
    valor_unitario?: string;
  }[];
}

// Tipagem do contexto
interface VendedoresContextType {
  notas: Nota[];
  notasVendedor: Nota[];
  carregando: boolean;
  atualizarNotas: () => Promise<void>;
  atualizarTipoNota: (notaId: number, tipo: string) => Promise<void>;
  vendedorLogado: string;
}

const VendedoresContext = createContext<VendedoresContextType | undefined>(undefined);

export const VendedoresProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [carregando, setCarregando] = useState(true);
  const vendedorLogado = user?.username || "";

  // Função para buscar e atualizar as notas
  const atualizarNotas = useCallback(async () => {
    try {
      setCarregando(true);
      const data = await fetchVendas();
      setNotas(data);
    } catch (error) {
      console.error("Erro ao buscar notas:", error);
    } finally {
      setCarregando(false);
    }
  }, []);

  // Função para atualizar o tipo de uma nota
  const atualizarTipoNota = useCallback(async (notaId: number, tipo: string) => {
    try {
      // Atualiza na API
      await updateNotaTipo(notaId, tipo);
      
      // Atualiza no estado local
      setNotas(prevNotas => 
        prevNotas.map(nota => 
          nota.id === notaId ? { ...nota, tipo: tipo as any } : nota
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar tipo da nota:", error);
      throw error; // Relança o erro para tratamento no componente
    }
  }, []);

  // Filtrar notas do vendedor logado
  const notasVendedor = notas.filter(n => 
    n.nome_vendedor &&
    n.nome_vendedor.toLowerCase().includes(vendedorLogado.toLowerCase())
  );

  // Buscar uma vez ao montar
  useEffect(() => {
    atualizarNotas();
  }, [atualizarNotas]);

  return (
    <VendedoresContext.Provider 
      value={{ 
        notas, 
        notasVendedor, 
        carregando, 
        atualizarNotas, 
        atualizarTipoNota,
        vendedorLogado 
      }}
    >
      {children}
    </VendedoresContext.Provider>
  );
};

// Hook para usar em qualquer lugar
export const useVendedores = () => {
  const context = useContext(VendedoresContext);
  if (!context) {
    throw new Error("useVendedores deve ser usado dentro de um VendedoresProvider");
  }
  return context;
};