import axios, { type AxiosInstance } from "axios";

/**
 * Fábrica das instâncias de rede do app.
 *
 * O que se compartilha aqui é o **interceptor**, não a instância: o DataCoreHS
 * fala com dois backends distintos — a API de autenticação (`VITE_API_URL`) e
 * a API de notas (`VITE_NOTAS_URL`). Uma instância `axios` única, como o spec
 * original pedia, apontaria as chamadas de um dos dois para o endereço do
 * outro. Cada backend ganha a sua instância; a regra do token é uma só.
 */
export function criarHttp(baseURL: string): AxiosInstance {
  const http = axios.create({
    baseURL,
    // `indexes: null` -> `cliente_id=1&cliente_id=2`, e nao `cliente_id[]=1`.
    // Os dois backends sao FastAPI, e ele le lista repetindo a CHAVE: com os
    // colchetes do padrao do axios o parametro simplesmente nao chega, o filtro
    // fica valendo "sem filtro" e a tela mostra o universo inteiro como se
    // fosse o recorte pedido — sem erro nenhum, que e o pior jeito de errar.
    paramsSerializer: { indexes: null },
  });

  http.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("access_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  return http;
}
