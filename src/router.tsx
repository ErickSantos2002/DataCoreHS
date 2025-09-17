import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Configuracoes from "./pages/Configuracoes";
import Home from "./pages/Home";

import Clientes from "./pages/Clientes";
import Estoque from "./pages/Estoque";
import Servicos from "./pages/Servicos";
import Vendas from "./pages/Vendas";
import Vendedores from "./pages/Vendedores";

import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";

const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-6 text-gray-500">Verificando permissões...</div>;

  if (!user || user.role !== "admin") {
    return (
      <div className="p-6 text-red-600 text-center font-semibold">
        Acesso negado. Esta página é restrita a administradores.
      </div>
    );
  }

  return <>{children}</>;
};

import Bloqueio from "./pages/Bloqueio"; // importe o novo componente

const RequireVendas: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-6 text-gray-500">Verificando permissões...</div>;

  if (!user || (user.role !== "admin" && user.role !== "vendas" && user.role !== "financeiro" && user.role !== "qualidade")) {
    return <Bloqueio />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<Login />} />

    <Route
      path="/inicio"
      element={
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      }
    />

    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      }
    />

    <Route
      path="/clientes"
      element={
        <ProtectedRoute>
          <Clientes />
        </ProtectedRoute>
      }
    />

    <Route
      path="/estoque"
      element={
        <ProtectedRoute>
          <Estoque />
        </ProtectedRoute>
      }
    />

    <Route
      path="/servicos"
      element={
        <ProtectedRoute>
          <Servicos />
        </ProtectedRoute>
      }
    />

    <Route
      path="/vendas"
      element={
        <ProtectedRoute>
          <RequireVendas>
            <Vendas />
          </RequireVendas>
        </ProtectedRoute>
      }
    />

    <Route
      path="/vendedores"
      element={
        <ProtectedRoute>
          <RequireVendas>
            <Vendas />
          </RequireVendas>
        </ProtectedRoute>
      }
    />

    <Route
      path="/configuracoes"
      element={
        <ProtectedRoute>
          <RequireAdmin>
            <Configuracoes />
          </RequireAdmin>
        </ProtectedRoute>
      }
    />

    <Route path="/" element={<Navigate to="/inicio" />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
