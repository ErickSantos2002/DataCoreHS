import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
  sidebarAberta: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sidebarAberta, setSidebarAberta] = useState(true);

    const toggleSidebar = () => {
        setSidebarAberta((prev) => !prev);
    };

useEffect(() => {
    const path = window.location.pathname.toLowerCase();

    // páginas que precisam manter rolagem mesmo com sidebar fechada
    const paginasComScroll = [
        "estoque",
        "vendedores",
        "clientes",
        "servicos",
        "vendas",
    ];

    const podeRolar = paginasComScroll.some((p) => path.includes(p));

    // libera scroll se a sidebar estiver aberta OU se a página precisar
    const overflowY = sidebarAberta || podeRolar ? "auto" : "hidden";
    const overflowX = "hidden";

    document.body.style.overflowY = overflowY;
    document.documentElement.style.overflowY = overflowY;
    document.body.style.overflowX = overflowX;
    document.documentElement.style.overflowX = overflowX;
}, [sidebarAberta]);

  return (
    <SidebarContext.Provider value={{ sidebarAberta, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar deve ser usado dentro de SidebarProvider");
  }
  return context;
};
