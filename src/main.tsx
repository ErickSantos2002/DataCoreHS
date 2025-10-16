import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { DashboardProvider } from "./context/DashboardContext";
import { ConfiguracoesProvider } from "./context/ConfiguracoesContext";
import { EstoqueProvider } from "./context/EstoqueContext";
import { DataProvider } from "./context/DataContext";
import { ServicosProvider } from "./context/ServicosContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SidebarProvider } from "./context/SidebarContext";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <EstoqueProvider>
          <DataProvider>
            <ServicosProvider>
              <ConfiguracoesProvider>
                <DashboardProvider>
                  <SidebarProvider>
                    <BrowserRouter>
                      <App />
                    </BrowserRouter>
                  </SidebarProvider>
                </DashboardProvider>
              </ConfiguracoesProvider>
            </ServicosProvider>
          </DataProvider>
        </EstoqueProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
