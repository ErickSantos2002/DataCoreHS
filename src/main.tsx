// src/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { DashboardProvider } from "./context/DashboardContext";
import { ConfiguracoesProvider } from "./context/ConfiguracoesContext";
import { ThemeProvider } from "./context/ThemeContext";
import { VendasProvider } from "./context/VendasContext";
import "./styles/index.css"; // Importa o Tailwind e estilos globais

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <VendasProvider>
          <ConfiguracoesProvider>
            <DashboardProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </DashboardProvider>
          </ConfiguracoesProvider>
        </VendasProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);