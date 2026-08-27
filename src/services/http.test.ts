import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { criarHttp } from "./http";

/**
 * Troca o transporte da instância por um espião: nenhuma requisição sai da
 * máquina, e o que sobra é exatamente a config que o interceptor montou.
 */
function espiarRequisicoes(http: AxiosInstance) {
  const capturadas: InternalAxiosRequestConfig[] = [];
  http.defaults.adapter = async (config) => {
    capturadas.push(config);
    return {
      data: null,
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  return capturadas;
}

describe("criarHttp", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("usa a baseURL que recebeu", () => {
    const http = criarHttp("https://exemplo.test");
    expect(http.defaults.baseURL).toBe("https://exemplo.test");
  });

  it("manda Authorization: Bearer <token> quando ha token guardado", async () => {
    localStorage.setItem("access_token", "tok-123");
    const http = criarHttp("https://exemplo.test");
    const capturadas = espiarRequisicoes(http);

    await http.get("/qualquer");

    expect(capturadas).toHaveLength(1);
    expect(capturadas[0].headers.Authorization).toBe("Bearer tok-123");
  });

  it("nao manda cabecalho de autenticacao quando nao ha token", async () => {
    const http = criarHttp("https://exemplo.test");
    const capturadas = espiarRequisicoes(http);

    await http.get("/qualquer");

    expect(capturadas).toHaveLength(1);
    expect(capturadas[0].headers.Authorization).toBeUndefined();
  });

  it("cria instancias independentes, uma por backend", () => {
    // O spec pedia "uma instância única"; sao dois backends distintos, e uma
    // instância só apontaria as chamadas de notas para a API de auth.
    const auth = criarHttp("https://authapi.test");
    const notas = criarHttp("https://tinyapi.test");

    expect(auth).not.toBe(notas);
    expect(auth.defaults.baseURL).toBe("https://authapi.test");
    expect(notas.defaults.baseURL).toBe("https://tinyapi.test");
  });
});
