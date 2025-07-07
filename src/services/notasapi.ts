import axios from "axios";

const baseURL = "https://tinyapi.healthsafetytech.com/"; // agora passando pelo NGINX

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

export const fetchNotas = async (
  ano: number,
  mes: number,
  modo: "intervalo" | "dia" = "intervalo"
) => {
  const dataBase = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const params = new URLSearchParams();

  if (modo === "dia") {
    params.append("data_emissao", dataBase);
  } else {
    params.append("data_inicio", dataBase);
    const dataFim = new Date(ano, mes, 0).toISOString().slice(0, 10);
    params.append("data_fim", dataFim);
  }

  const naturezas = ["6102", "5102", "6108", "5108"];
  naturezas.forEach((n) => params.append("natureza_operacao", n));

  params.append("descricao_situacao", "Emitida DANFE");

  const res = await axios.get(`${baseURL}/notas_fiscais`, { params });
  return res.data;
};
