import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

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

import { ConfiguracoesProvider } from "./context/ConfiguracoesContext";
import { ContasPagarProvider } from "./context/ContasPagarContext";
import { ContasReceberProvider } from "./context/ContasReceberContext";
import { DashboardProvider } from "./context/DashboardContext";
import { DataProvider } from "./context/DataContext";
import { EstoqueProvider } from "./context/EstoqueContext";
import { ServicosProvider } from "./context/ServicosContext";
import { VendasProvider } from "./context/VendasContext";

/**
 * Rotas e, junto delas, os providers de dados de cada ramo.
 *
 * A regra de quem entra em cada rota mora em `auth/permissoes.ts`, e
 * `RequirePermissao` a aplica — antes, seis guardas eram definidos aqui dentro,
 * cada um com a própria condição de papel escrita à mão.
 *
 * `ProtectedRoute` continua por fora: ele decide entre *entrar no app* e ir
 * para o login. `RequirePermissao` decide entre *ver a tela* e ver o bloqueio.
 *
 * ## Por que os providers estão aqui
 *
 * O `main.tsx` empilhava dez providers em volta do aplicativo inteiro, então
 * abrir a tela de login montava `EstoqueProvider`, `VendasProvider`,
 * `ContasPagarProvider` e mais sete — cada um carregando dados que aquela tela
 * nunca ia usar. Agora cada context é montado no ramo que o consome, e o
 * `main.tsx` guarda só o que é global de verdade: tema, sessão e o router.
 *
 * O critério, quando um context tem mais de um consumidor: ele sobe até o
 * menor grupo de rotas que **só** contém consumidores dele. Quando dois
 * conjuntos de consumidores se cruzam sem um conter o outro — o caso de
 * `Servicos` (`/servicos` e `/financeiro`), de `ContasPagar` (`/contas-pagar` e
 * `/financeiro`) e de `ContasReceber` (`/contas-receber` e `/financeiro`) — o
 * provider aparece em dois pontos de montagem, em vez de subir até um ancestral
 * que arrastaria junto rotas que não o consomem. O preço é não compartilhar
 * estado entre esses ramos; o preço da alternativa seria voltar a montar dados
 * de contas a pagar para quem abriu serviços.
 *
 * `ThemeProvider` e `AuthProvider` ficaram no `main.tsx` porque toda rota,
 * inclusive `/login`, depende das duas.
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
      path="/estoque"
      element={
        <ProtectedRoute>
          <EstoqueProvider>
            <Estoque />
          </EstoqueProvider>
        </ProtectedRoute>
      }
    />

    <Route
      path="/servicos"
      element={
        <ProtectedRoute>
          <RequirePermissao rota="/servicos">
            <ServicosProvider>
              <Servicos />
            </ServicosProvider>
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
      path="/usuarios"
      element={
        <ProtectedRoute>
          <RequirePermissao rota="/usuarios">
            <Usuarios />
          </RequirePermissao>
        </ProtectedRoute>
      }
    />

    {/* Comercial: as quatro telas do `DataContext` (clientes, vendas,
        produtos e vendedores) compartilham a mesma carga de cadastros. */}
    <Route
      element={
        <ProtectedRoute>
          <DataProvider>
            <Outlet />
          </DataProvider>
        </ProtectedRoute>
      }
    >
      <Route
        path="/clientes"
        element={
          <RequirePermissao rota="/clientes">
            <Clientes />
          </RequirePermissao>
        }
      />
      <Route
        path="/vendas"
        element={
          <RequirePermissao rota="/vendas">
            <Vendas />
          </RequirePermissao>
        }
      />
      <Route
        path="/produtos"
        element={
          <RequirePermissao rota="/produtos">
            <Produtos />
          </RequirePermissao>
        }
      />
      <Route
        path="/vendedores"
        element={
          <RequirePermissao rota="/vendedores">
            <Vendedores />
          </RequirePermissao>
        }
      />
    </Route>

    {/* As duas telas de contas não se cruzam: `ContasPagar` só lê
        `ContasPagarContext` e `ContasReceber` só lê `ContasReceberContext`.
        Agrupá-las montaria em cada uma o provider da outra. */}
    <Route
      path="/contas-pagar"
      element={
        <ProtectedRoute>
          <RequirePermissao rota="/contas-pagar">
            <ContasPagarProvider>
              <ContasPagar />
            </ContasPagarProvider>
          </RequirePermissao>
        </ProtectedRoute>
      }
    />

    <Route
      path="/contas-receber"
      element={
        <ProtectedRoute>
          <RequirePermissao rota="/contas-receber">
            <ContasReceberProvider>
              <ContasReceber />
            </ContasReceberProvider>
          </RequirePermissao>
        </ProtectedRoute>
      }
    />

    {/* `/configuracoes`, `/dashboard` e `/financeiro` formam um ramo aninhado
        de fora para dentro pelo que cada uma consome: as três leem as metas de
        `ConfiguracoesContext`; `/dashboard` e `/financeiro` também leem
        `DashboardContext`; e `/financeiro` ainda carrega os quatro próprios.
        (`/financeiro` chega em `Dashboard` e `Configuracoes` via `MetaTab`.) */}
    <Route
      element={
        <ProtectedRoute>
          <ConfiguracoesProvider>
            <Outlet />
          </ConfiguracoesProvider>
        </ProtectedRoute>
      }
    >
      <Route
        path="/configuracoes"
        element={
          <RequirePermissao rota="/configuracoes">
            <Configuracoes />
          </RequirePermissao>
        }
      />

      <Route
        element={
          <DashboardProvider>
            <Outlet />
          </DashboardProvider>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        <Route
          path="/financeiro"
          element={
            <RequirePermissao rota="/financeiro">
              <VendasProvider>
                <ServicosProvider>
                  <ContasPagarProvider>
                    <ContasReceberProvider>
                      <GerenciamentoFinanceiro />
                    </ContasReceberProvider>
                  </ContasPagarProvider>
                </ServicosProvider>
              </VendasProvider>
            </RequirePermissao>
          }
        />
      </Route>
    </Route>

    <Route path="/" element={<Navigate to="/inicio" />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
