import { criarHttp } from "./http";

const baseURL =
  import.meta.env.VITE_API_URL || "https://authapi.healthsafetytech.com";

// Instancia propria: este e o backend de autenticacao, distinto do de notas.
// O interceptor do token vem de criarHttp, compartilhado entre os dois.
const authApi = criarHttp(baseURL);

// ── Tipos ────────────────────────────────────────────────────────────────────
//
// Derivados do que a tela de Usuarios de fato le de cada resposta. Onde o
// retorno e descartado pelo chamador, o tipo fica `unknown` em vez de `any`.

export interface Papel {
  id: number;
  name: string;
}

export interface Usuario {
  id: number;
  username: string;
  role: Papel;
  created_at: string;
}

/** `unknown`: a tela de Usuarios so aguarda a promessa; o corpo nao e lido. */
export async function updateUserPassword(
  userId: number,
  novaSenha: string,
): Promise<unknown> {
  try {
    // authApi, nao `axios` cru: o interceptor que injeta o Bearer vive na
    // instancia. Com axios cru, a troca de senha saia sem Authorization.
    const response = await authApi.put(`/users/${userId}`, {
      password: novaSenha,
    });
    return response.data;
  } catch (error) {
    console.error("Erro ao atualizar senha:", error);
    throw error;
  }
}

export async function getUsers(): Promise<Usuario[]> {
  const res = await authApi.get<Usuario[]>("/users");
  return res.data;
}

export async function getRoles(): Promise<Papel[]> {
  const res = await authApi.get<Papel[]>("/roles");
  return res.data;
}

/** `unknown`: a tela recarrega a lista depois de criar; nao le a resposta. */
export async function createUser(data: {
  username: string;
  password: string;
  role_name: string;
}): Promise<unknown> {
  const res = await authApi.post("/register", data);
  return res.data;
}

/** `unknown`: idem — a tela recarrega a lista em vez de ler o corpo. */
export async function updateUser(
  userId: number,
  data: { username?: string; role_name?: string },
): Promise<unknown> {
  const res = await authApi.put(`/users/${userId}`, data);
  return res.data;
}

/** `unknown`: idem. */
export async function deleteUser(userId: number): Promise<unknown> {
  const res = await authApi.delete(`/users/${userId}`);
  return res.data;
}

export default authApi;
