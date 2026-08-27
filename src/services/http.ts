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
  const http = axios.create({ baseURL });

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
