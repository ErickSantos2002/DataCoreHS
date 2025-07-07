import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "https://tinyapi.healthsafetytech.com";
// Cria instância sem baseURL — usaremos proxy do Vite
const notasApi = axios.create({ baseURL });

notasApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Exemplo de chamada para usar no Dashboard
export const fetchNotasMensais = async (ano: number, mes: number) => {
  const dataEmissao = `${ano}-${String(mes).padStart(2, "0")}-01`;

  const naturezaOperacao = ["6102", "5102", "6108", "5108"];
  const params = new URLSearchParams();

  params.append("data_emissao", dataEmissao);
  naturezaOperacao.forEach((n) => params.append("natureza_operacao", n));
  params.append("descricao_situacao", "Emitida DANFE");

  const res = await notasApi.get(`/api/notas_fiscais?${params.toString()}`);
  return res.data;
};
