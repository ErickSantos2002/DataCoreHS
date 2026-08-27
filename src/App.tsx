import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./styles/index.css"; // Importa o Tailwind e estilos globais
import AppRoutes from "./router";
import { AppShell } from "./design-system/ui/navigation/AppShell";
import Header from "./components/Header";
import useNavGroups from "./components/Sidebar";
import CentralButton from "./components/CentralButton";
import { ToastProvider } from "./components/ToastProvider";
import { useAuth } from "./hooks/useAuth";
import logo from "./assets/HS2.ico";

// Rotas onde o layout (AppShell) não deve aparecer (ex: login)
const noLayoutRoutes = ["/login"];

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const groups = useNavGroups();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const hideLayout = noLayoutRoutes.includes(location.pathname);

  if (hideLayout) {
    return (
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="h-screen">
        <AppShell
          product="DataCoreHS"
          logoSrc={logo}
          groups={groups}
          activePath={location.pathname}
          onNavigate={(path) => navigate(path)}
          user={user ? { name: user.username, role: user.role } : undefined}
          collapsed={sidebarCollapsed}
          topbarActions={
            <Header
              collapsed={sidebarCollapsed}
              onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
            />
          }
        >
          <AppRoutes />
        </AppShell>
      </div>

      {/* Botão Flutuante Central HS */}
      <CentralButton />
    </ToastProvider>
  );
};

export default App;
