import React, { createContext, useState, useEffect, ReactNode } from "react";
import api from "../services/api";

type AuthContextType = {
  user: { username: string; role: string } | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
};

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega dados do localStorage na primeira renderização
  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    const savedUsername = localStorage.getItem("username");
    const savedRole = localStorage.getItem("role");
    if (savedToken && savedUsername && savedRole) {
      setUser({ username: savedUsername, role: savedRole });
      setToken(savedToken);
    }
    setLoading(false);
  }, []);

  // Função de login
  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/login", { username, password });
      const { access_token, role, username: userNameFromAPI } = res.data;

      // Salva no localStorage para persistência
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("username", userNameFromAPI);
      localStorage.setItem("role", role);

      setUser({ username: userNameFromAPI, role });
      setToken(access_token);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        "Erro ao fazer login. Verifique usuário e senha."
      );
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  // Função de logout
  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
};
