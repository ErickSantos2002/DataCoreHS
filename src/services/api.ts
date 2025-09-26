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

export default authApi;