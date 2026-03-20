import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "https://authapi.healthsafetytech.com";

const authApi = axios.create({ baseURL });

authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export async function updateUserPassword(userId: number, novaSenha: string) {
  try {
    const response = await axios.put(`${baseURL}/users/${userId}`, {
      password: novaSenha,
    });
    return response.data;
  } catch (error: any) {
    console.error("Erro ao atualizar senha:", error);
    throw error;
  }
}

export async function getUsers() {
  const res = await authApi.get("/users");
  return res.data;
}

export async function getRoles() {
  const res = await authApi.get("/roles");
  return res.data;
}

export async function createUser(data: { username: string; password: string; role_name: string }) {
  const res = await authApi.post("/register", data);
  return res.data;
}

export async function updateUser(userId: number, data: { username?: string; role_name?: string }) {
  const res = await authApi.put(`/users/${userId}`, data);
  return res.data;
}

export async function deleteUser(userId: number) {
  const res = await authApi.delete(`/users/${userId}`);
  return res.data;
}

export default authApi;