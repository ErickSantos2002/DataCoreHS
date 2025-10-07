// DataContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { fetchClientes, fetchVendas, updateNotaTipo } from "../services/notasapi";
import { useAuth } from "../hooks/useAuth";

interface Cliente {
  id: number;
  nome: string;
  cpf_cnpj: string;
  email?: string;
  fone?: string;
}
interface Nota { 
  id: number;
  numero: number;
  data_emissao: string;
  valor_nota: number;
  valor_produtos: number;
  cliente: Cliente | null;
  nome_vendedor: string;
  tipo: "Outbound" | "Inbound" | "ReCompra" | null;
  itens: {
    descricao: string;
    quantidade: string;
    valor_total: string;
    valor_unitario?: string;
    codigo?: string;
  }[];
  observacoes?: string | null; // ✅ adicionar aqui
}

interface ClienteEnriquecido extends Cliente {
  totalComprado: number;
  numeroCompras: number;
  ultimaCompra: Date | null;
  status: "ativo" | "inativo";
  ticketMedio: number;
}

interface DataContextType {
  clientes: Cliente[];
  notas: Nota[];
  notasVendedor: Nota[];
  clientesEnriquecidos: ClienteEnriquecido[];
  carregando: boolean;
  atualizarNotas: () => Promise<void>;
  atualizarTipoNota: (notaId: number, tipo: "Outbound" | "Inbound" | "ReCompra") => Promise<void>;
  vendedorLogado: string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [carregando, setCarregando] = useState(true);

  const vendedorLogado = user?.username || "";

  const atualizarNotas = useCallback(async () => {
    try {
      setCarregando(true);
      const [clientesData, vendasData] = await Promise.all([
        fetchClientes(),
        fetchVendas(),
      ]);

      // 🔹 Conversão segura da data para local (sem UTC)
      const notasComDataLocal = vendasData.map((n: any) => {
        if (n.data_emissao && typeof n.data_emissao === "string") {
          const [ano, mes, dia] = n.data_emissao.split("-");
          // Cria data local corretamente
          const dataLocal = new Date(Number(ano), Number(mes) - 1, Number(dia));
          return { ...n, data_emissao: dataLocal.toISOString().split("T")[0] };
        }
        return n;
      });

      setClientes(clientesData);
      setNotas(notasComDataLocal);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setCarregando(false);
    }
  }, []);

  const atualizarTipoNota = useCallback(async (notaId: number, tipo: "Outbound" | "Inbound" | "ReCompra") => {
    try {
      await updateNotaTipo(notaId, tipo);
      setNotas(prev => prev.map(n => n.id === notaId ? { ...n, tipo } : n));
    } catch (error) {
      console.error("Erro ao atualizar tipo da nota:", error);
    }
  }, []);

  // notas apenas do vendedor logado
  const notasVendedor = useMemo(() =>
    notas.filter(n =>
      n.nome_vendedor?.toLowerCase().includes(vendedorLogado.toLowerCase())
    ), [notas, vendedorLogado]
  );

  const clientesEnriquecidos = useMemo(() =>
    clientes.map(cliente => {
      const vendasCliente = notas.filter(n => n.cliente?.id === cliente.id);
      const totalComprado = vendasCliente.reduce((acc, n) => acc + (Number(n.valor_nota) || 0), 0);
      const numeroCompras = vendasCliente.length;
      const ultimaCompra = vendasCliente.length > 0
        ? new Date(Math.max(...vendasCliente.map(v => new Date(v.data_emissao).getTime())))
        : null;
      const status = ultimaCompra && (new Date().getTime() - ultimaCompra.getTime()) / (1000 * 60 * 60 * 24) <= 90
        ? "ativo" as const
        : "inativo" as const;
      return { ...cliente, totalComprado, numeroCompras, ultimaCompra, status, ticketMedio: numeroCompras ? totalComprado / numeroCompras : 0 };
    }), [clientes, notas]
  );

  useEffect(() => { atualizarNotas(); }, [atualizarNotas]);

  return (
    <DataContext.Provider value={{
      clientes,
      notas,                 // 🔹 todas as notas
      notasVendedor,       // 🔹 só do vendedor logado
      clientesEnriquecidos,
      carregando,
      atualizarNotas,
      atualizarTipoNota,
      vendedorLogado
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData deve ser usado dentro de um DataProvider");
  return context;
};
