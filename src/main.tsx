// src/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { DashboardProvider } from "./context/DashboardContext";
import { ConfiguracoesProvider } from "./context/ConfiguracoesContext";
import "./styles/index.css"; // Importa o Tailwind e estilos globais

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ConfiguracoesProvider>
        <DashboardProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </DashboardProvider>
      </ConfiguracoesProvider>
    </AuthProvider>
  </React.StrictMode>
);