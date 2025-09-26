import React, { createContext, useState, useEffect, ReactNode } from "react";
import api from "../services/api";

type AuthContextType = {
  user: { id: number; username: string; role: string } | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
};

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ id: number; username: string; role: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega dados do localStorage na primeira renderização
  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    const savedId = localStorage.getItem("id");
    const savedUsername = localStorage.getItem("username");
    const savedRole = localStorage.getItem("role");

    if (savedToken && savedId && savedUsername && savedRole) {
      setUser({ id: Number(savedId), username: savedUsername, role: savedRole });
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
      const { access_token } = res.data;

      // salva token
      localStorage.setItem("access_token", access_token);
      setToken(access_token);

      // busca dados do usuário logado
      const me = await api.get("/me", {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const { id, username: userNameFromAPI, role } = me.data;
      const roleName = typeof role === "string" ? role : role?.name || "";

      // salva no localStorage
      localStorage.setItem("id", id.toString());
      localStorage.setItem("username", userNameFromAPI);
      localStorage.setItem("role", roleName);

      // atualiza state
      setUser({ id, username: userNameFromAPI, role: roleName });
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
