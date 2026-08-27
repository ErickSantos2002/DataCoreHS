import axios from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import authApi, { updateUserPassword } from "./api";

/**
 * Espião de transporte instalado nos DOIS caminhos possíveis: a instância
 * `authApi` e o `axios` cru. Assim a requisição é capturada mesmo que a função
 * saia pela porta errada — é justamente isso que este teste precisa enxergar,
 * em vez de estourar num erro de rede.
 */
function espiarRequisicoes(...alvos: AxiosInstance[]) {
  const capturadas: InternalAxiosRequestConfig[] = [];
  const adaptador = async (config: InternalAxiosRequestConfig) => {
    capturadas.push(config);
    return {
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  for (const alvo of alvos) {
    alvo.defaults.adapter = adaptador;
  }
  return capturadas;
}

describe("updateUserPassword", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("manda o cabecalho Authorization ao trocar a senha", async () => {
    localStorage.setItem("access_token", "tok-abc");
    const capturadas = espiarRequisicoes(authApi, axios);

    await updateUserPassword(7, "senha-nova");

    expect(capturadas).toHaveLength(1);
    expect(capturadas[0].headers.Authorization).toBe("Bearer tok-abc");
  });

  it("chama PUT /users/:id com a senha nova no corpo", async () => {
    localStorage.setItem("access_token", "tok-abc");
    const capturadas = espiarRequisicoes(authApi, axios);

    await updateUserPassword(7, "senha-nova");

    expect(capturadas[0].method).toBe("put");
    expect(capturadas[0].url).toContain("/users/7");
    expect(JSON.parse(String(capturadas[0].data))).toEqual({
      password: "senha-nova",
    });
  });
});
