import axios from "axios";

const baseURL = import.meta.env.VITE_NOTAS_URL || "https://tinyapi.healthsafetytech.com";

const api = axios.create({ baseURL });

// Aplica token automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Notas Fiscais
export const fetchNotas = async (params: Record<string, any> = {}) => {
  const response = await api.get("/notas_fiscais/", { params });
  return response.data;
};

// Notas Vendas
export const fetchVendas = async (params: Record<string, any> = {}) => {
  const response = await api.get("/notas_fiscais/vendas/", { params });
  return response.data;
};

// Clientes
export const fetchClientes = async (params: Record<string, any> = {}) => {
  const response = await api.get("/clientes/", { params });
  return response.data;
};

// Itens da Nota
export const fetchItensNota = async (params: Record<string, any> = {}) => {
  const response = await api.get("/itens_nota/", { params });
  return response.data;
};

// Notas Fiscais de Serviço
export const fetchNotasServico = async (params: Record<string, any> = {}) => {
  const response = await api.get("/notas_servico/", { params });
  return response.data;
};

// Buscar todas as configurações
export const fetchConfiguracoes = async () => {
  const response = await api.get("/configuracoes/");
  return response.data;
};

// Atualizar valor de uma configuração por chave
export const updateConfiguracao = async (chave: string, valor: string) => {
  const response = await api.put(`/configuracoes/${chave}`, { valor });
  return response.data;
};

// Criar nova configuração (opcional)
export const createConfiguracao = async (chave: string, valor: string) => {
  const response = await api.post("/configuracoes/", { chave, valor });
  return response.data;
};

// Estoque
export const fetchEstoque = async (params: Record<string, any> = {}) => {
  const response = await api.get("/estoque/", { params });
  return response.data;
};

// Atualizar o campo "tipo" de uma nota fiscal
export const updateNotaTipo = async (notaId: number, tipo: string) => {
  const response = await api.patch(`/notas_fiscais/${notaId}/tipo`, { tipo });
  return response.data;
};

// Contas a Pagar
export const fetchContasPagar = async (params: Record<string, any> = {}) => {
  const response = await api.get("/contas_pagar/", { params });
  return response.data;
};

// Contas a Receber
export const fetchContasReceber = async (params: Record<string, any> = {}) => {
  const response = await api.get("/contas_receber/", { params });
  return response.data;
};

// Centro de Custo — resumo por produto/ano
export const fetchResumoProduto = async (produto: string, ano: number) => {
  const response = await api.get("/centro_custo/resumo_produto/", { params: { produto, ano, exato: true } });
  return response.data as { mes: number; quantidade: number; receita: number }[];
};

// Centro de Custo — config manual (CMV, frete, etc.)
export const fetchCentroCustoConfig = async (produto: string, ano: number) => {
  const response = await api.get("/centro_custo/config/", { params: { produto, ano } });
  return response.data;
};

export const salvarCentroCustoConfig = async (payload: {
  produto: string;
  ano: number;
  cmv_unitario: number | null;
  frete_unitario: number | null;
  outros_custos_unitario: number | null;
  config_json?: Record<string, any> | null;
}) => {
  const response = await api.post("/centro_custo/config/", payload);
  return response.data;
};