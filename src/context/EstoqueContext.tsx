import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchEstoque } from "../services/notasapi";

// Tipagem do Produto do Estoque
interface ProdutoEstoque {
  id: number;
  nome: string;
  codigo: string;
  unidade: string;
  preco: number;
  saldo: number;
  situacao: "A" | "I"; // A = Ativo, I = Inativo
}

// Tipagem do contexto
interface EstoqueContextType {
  produtos: ProdutoEstoque[];
  carregando: boolean;
  /** A frase para a tela quando a busca falha; `null` quando deu certo. */
  erro: string | null;
  atualizarProdutos: () => Promise<void>;
}

const EstoqueContext = createContext<EstoqueContextType | undefined>(undefined);

export const EstoqueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [carregando, setCarregando] = useState(true);
  // Sem isto o `catch` só escrevia no console: com a API caída a tela abria com
  // "0" produtos e "R$ 0,00", e lia-se "o estoque está zerado".
  const [erro, setErro] = useState<string | null>(null);

  // Função para buscar e atualizar os produtos
  const atualizarProdutos = async () => {
    try {
      setCarregando(true);
      const data = await fetchEstoque();
      setProdutos(data);
      setErro(null);
    } catch (error) {
      console.error("Erro ao buscar produtos do estoque:", error);
      setErro("Não foi possível carregar o estoque.");
    } finally {
      setCarregando(false);
    }
  };

  // Buscar uma vez ao montar
  useEffect(() => {
    atualizarProdutos();
  }, []);

  return (
    <EstoqueContext.Provider value={{ produtos, carregando, erro, atualizarProdutos }}>
      {children}
    </EstoqueContext.Provider>
  );
};

// Hook para usar em qualquer lugar
export const useEstoque = () => {
  const context = useContext(EstoqueContext);
  if (!context) {
    throw new Error("useEstoque deve ser usado dentro de um EstoqueProvider");
  }
  return context;
};