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