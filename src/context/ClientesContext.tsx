import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchClientes, fetchVendas } from "../services/notasapi";

// Tipagem do Cliente
interface Cliente {
  id: number;
  nome: string;
  cpf_cnpj: string;
  email?: string;
  telefone?: string;
  endereco?: string;
}

// Tipagem da Nota
interface NotaVenda {
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
}

// Cliente enriquecido com métricas
interface ClienteEnriquecido extends Cliente {
  totalComprado: number;
  numeroCompras: number;
  ultimaCompra: Date | null;
  status: 'ativo' | 'inativo';
  ticketMedio: number;
}

// Tipagem do contexto
interface ClientesContextType {
  clientes: Cliente[];
  vendas: NotaVenda[];
  clientesEnriquecidos: ClienteEnriquecido[];
  carregando: boolean;
  atualizarDados: () => Promise<void>;
  calcularStatusCliente: (ultimaCompra: Date | null) => 'ativo' | 'inativo';
}

const ClientesContext = createContext<ClientesContextType | undefined>(undefined);

export const ClientesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendas, setVendas] = useState<NotaVenda[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Função para calcular status do cliente
  const calcularStatusCliente = useCallback((ultimaCompra: Date | null): 'ativo' | 'inativo' => {
    if (!ultimaCompra) return 'inativo';
    
    const hoje = new Date();
    const diasInativos = 90;
    const limiteInatividade = new Date();
    limiteInatividade.setDate(hoje.getDate() - diasInativos);
    
    return ultimaCompra >= limiteInatividade ? 'ativo' : 'inativo';
  }, []);

  // Enriquecer clientes com dados de vendas
  const clientesEnriquecidos = React.useMemo(() => {
    return clientes.map(cliente => {
      // Normalizar CPF/CNPJ para comparação
      const cpfCnpjNormalizado = cliente.cpf_cnpj.replace(/\D/g, '');
      
      // Filtrar vendas do cliente
      const vendasCliente = vendas.filter(v => {
        if (!v.cliente) return false;
        const vendaCpfCnpjNormalizado = v.cliente.cpf_cnpj.replace(/\D/g, '');
        return vendaCpfCnpjNormalizado === cpfCnpjNormalizado ||
               v.cliente.nome.toLowerCase() === cliente.nome.toLowerCase();
      });

      // Calcular métricas
      const totalComprado = vendasCliente.reduce((acc, v) => acc + Number(v.valor_nota || 0), 0);
      const numeroCompras = vendasCliente.length;
      const ticketMedio = numeroCompras > 0 ? totalComprado / numeroCompras : 0;

      // Última compra
      const ultimaCompra = vendasCliente.length > 0
        ? vendasCliente
            .map(v => new Date(v.data_emissao))
            .sort((a, b) => b.getTime() - a.getTime())[0]
        : null;

      // Status
      const status = calcularStatusCliente(ultimaCompra);

      return {
        ...cliente,
        totalComprado,
        numeroCompras,
        ultimaCompra,
        status,
        ticketMedio
      };
    });
  }, [clientes, vendas, calcularStatusCliente]);

  // Função para buscar e atualizar dados
  const atualizarDados = useCallback(async () => {
    try {
      setCarregando(true);
      
      // Buscar em paralelo
      const [clientesData, vendasData] = await Promise.all([
        fetchClientes(),
        fetchVendas()
      ]);
      
      setClientes(clientesData);
      setVendas(vendasData);
    } catch (error) {
      console.error("Erro ao buscar dados de clientes:", error);
    } finally {
      setCarregando(false);
    }
  }, []);

  // Buscar dados ao montar
  useEffect(() => {
    atualizarDados();
  }, [atualizarDados]);

  return (
    <ClientesContext.Provider 
      value={{ 
        clientes, 
        vendas, 
        clientesEnriquecidos,
        carregando, 
        atualizarDados,
        calcularStatusCliente
      }}
    >
      {children}
    </ClientesContext.Provider>
  );
};

// Hook para usar o contexto
export const useClientes = () => {
  const context = useContext(ClientesContext);
  if (!context) {
    throw new Error("useClientes deve ser usado dentro de um ClientesProvider");
  }
  return context;
};