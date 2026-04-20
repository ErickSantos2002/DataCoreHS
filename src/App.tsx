import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import "./styles/index.css"; // Importa o Tailwind e estilos globais
import AppRoutes from "./router";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import CentralButton from "./components/CentralButton";

// Rotas onde o layout (Header/Sidebar) não deve aparecer (ex: login)
const noLayoutRoutes = ["/login"];

const App: React.FC = () => {
  const location = useLocation();
  const hideLayout = noLayoutRoutes.includes(location.pathname);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (hideLayout) {
    // 🔥 Quando for rota sem layout, renderiza só as rotas
    return <AppRoutes />;
  }

  return (
    <>
      <div className="h-screen flex flex-col bg-gray-100 dark:bg-darkBlue text-gray-900 dark:text-gray-100 transition-colors">
        <Header onToggleSidebar={() => setSidebarCollapsed((v) => !v)} />
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          <Sidebar collapsed={sidebarCollapsed} />
          <main className="flex-1 overflow-auto bg-gray-100 dark:bg-darkBlue transition-colors">
            <AppRoutes />
          </main>
        </div>
      </div>

      {/* Botão Flutuante Central HS */}
      <CentralButton />
    </>
  );
};

export default App;
