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
import Locacao from "./pages/Locacao";
import Vendedores from "./pages/Vendedores";
import Produtos from "./pages/Produtos";
import GerenciamentoFinanceiro from "./pages/GerenciamentoFinanceiro";
import Usuarios from "./pages/Usuarios";
import ContasPagar from "./pages/ContasPagar";
import ContasReceber from "./pages/ContasReceber";

import ProtectedRoute from "./components/ProtectedRoute";
import RequirePermissao from "./auth/RequirePermissao";

/**
 * Só rotas. A regra de quem entra em cada uma mora em `auth/permissoes.ts`, e
 * `RequirePermissao` a aplica — antes, seis guardas eram definidos aqui dentro,
 * cada um com a própria condição de papel escrita à mão.
 *
 * `ProtectedRoute` continua por fora: ele decide entre *entrar no app* e ir
 * para o login. `RequirePermissao` decide entre *ver a tela* e ver o bloqueio.
 */
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
          <RequirePermissao rota="/clientes">
            <Clientes />
          </RequirePermissao>
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
          <RequirePermissao rota="/servicos">
            <Servicos />
          </RequirePermissao>
        </ProtectedRoute>
      }
    />

    <Route
      path="/vendas"
      element={
        <ProtectedRoute>
          <RequirePermissao rota="/vendas">
            <Vendas />
          </RequirePermissao>
        </ProtectedRoute>
      }
    />

    <Route
      path="/locacao"
      element={
        <ProtectedRoute>
          <RequirePermissao rota="/locacao">
            <Locacao />
          </RequirePermissao>
        </ProtectedRoute>
      }
    />

    <Route
      path="/produtos"
      element={
        <ProtectedRoute>
          <RequirePermissao rota="/produtos">
            <Produtos />
          </RequirePermissao>
        </ProtectedRoute>
      }
    />

    <Route
      path="/vendedores"
      element={
        <ProtectedRoute>
          <RequirePermissao rota="/vendedores">
            <Vendedores />
          </RequirePermissao>
        </ProtectedRoute>
      }
    />

    <Route
      path="/usuarios"
      element={
        <ProtectedRoute>
          <RequirePermissao rota="/usuarios">
            <Usuarios />
          </RequirePermissao>
        </ProtectedRoute>
      }
    />

    <Route
      path="/configuracoes"
      element={
        <ProtectedRoute>
          <RequirePermissao rota="/configuracoes">
            <Configuracoes />
          </RequirePermissao>
        </ProtectedRoute>
      }
    />

    <Route
      path="/financeiro"
      element={
        <ProtectedRoute>
          <RequirePermissao rota="/financeiro">
            <GerenciamentoFinanceiro />
          </RequirePermissao>
        </ProtectedRoute>
      }
    />

    <Route
      path="/contas-pagar"
      element={
        <ProtectedRoute>
          <RequirePermissao rota="/contas-pagar">
            <ContasPagar />
          </RequirePermissao>
        </ProtectedRoute>
      }
    />

    <Route
      path="/contas-receber"
      element={
        <ProtectedRoute>
          <RequirePermissao rota="/contas-receber">
            <ContasReceber />
          </RequirePermissao>
        </ProtectedRoute>
      }
    />

    <Route path="/" element={<Navigate to="/inicio" />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
