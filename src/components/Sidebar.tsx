import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  if (location.pathname === "/login") return null;

  const iconBaseClass = "w-5 h-5 mr-2 transition-colors";

  const getColor = (isActive: boolean) => {
    if (darkMode) {
      return "FFFFFF"; // ícones brancos no dark
    }
    return isActive ? "1E3A8A" : "1D4ED8"; // ativo azul mais escuro, normal azul leal
  };

  const menuItems = [
    {
      label: "Início",
      to: "/inicio",
      icon: (isActive: boolean) => (
        <img
          src={`https://img.icons8.com/?size=100&id=83326&format=png&color=${getColor(isActive)}`}
          alt="Início"
          className={iconBaseClass}
        />
      ),
    },
    {
      label: "Dashboard",
      to: "/dashboard",
      icon: (isActive: boolean) => (
        <img
          src={`https://img.icons8.com/?size=100&id=udjU_YS4lMXL&format=png&color=${getColor(isActive)}`}
          alt="Dashboard"
          className={iconBaseClass}
        />
      ),
    },
    {
      label: "Vendas",
      to: "/vendas",
      icon: (isActive: boolean) => (
        <img
          src={`https://img.icons8.com/?size=100&id=js1Qz0RqXlSO&format=png&color=${getColor(isActive)}`}
          alt="Vendas"
          className={iconBaseClass}
        />
      ),
    },
    {
      label: "Serviços",
      to: "/servicos",
      icon: (isActive: boolean) => (
        <img
          src={`https://img.icons8.com/?size=100&id=30379&format=png&color=${getColor(isActive)}`}
          alt="Serviços"
          className={iconBaseClass}
        />
      ),
    },
    {
      label: "Clientes",
      to: "/clientes",
      icon: (isActive: boolean) => (
        <img
          src={`https://img.icons8.com/?size=100&id=59220&format=png&color=${getColor(isActive)}`}
          alt="Clientes"
          className={iconBaseClass}
        />
      ),
    },
    {
      label: "Vendedores",
      to: "/vendedores",
      icon: (isActive: boolean) => (
        <img
          src={`https://img.icons8.com/?size=100&id=JWjVwvCeYGIZ&format=png&color=${getColor(isActive)}`}
          alt="Vendedores"
          className={iconBaseClass}
        />
      ),
    },
    {
      label: "Estoque",
      to: "/estoque",
      icon: (isActive: boolean) => (
        <img
          src={`https://img.icons8.com/?size=100&id=392&format=png&color=${getColor(isActive)}`}
          alt="Estoque"
          className={iconBaseClass}
        />
      ),
    },
    ...(user?.role === "admin"
      ? [
          {
            label: "Configurações",
            to: "/configuracoes",
            icon: (isActive: boolean) => (
              <img
                src={`https://img.icons8.com/?size=100&id=2969&format=png&color=${getColor(isActive)}`}
                alt="Configurações"
                className={iconBaseClass}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <aside className="hidden lg:flex w-56 bg-white dark:bg-[#0a192f] text-gray-900 dark:text-gray-100 shadow sticky top-0 flex-col transition-colors">
      <nav className="flex-1 py-6">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 font-medium transition-colors ${
                    isActive
                      ? "bg-gray-200 text-blue-700 dark:bg-white/10 dark:text-white"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-blue-700"
                  }`
                }
                end
              >
                {({ isActive }) => (
                  <>
                    {item.icon(isActive)}
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Switch de modo noturno */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between font-medium text-gray-800 dark:text-white">
          <div className="flex items-center gap-2">
            {darkMode ? (
              // ☀️ Sol amarelo
              <img
                src="https://img.icons8.com/?size=100&id=s6SybfgfYCLU&format=png&color=FFD700"
                alt="Modo Claro"
                className="w-6 h-6 drop-shadow-md"
              />
            ) : (
              // 🌙 Lua azul no modo claro
              <img
                src="https://img.icons8.com/?size=100&id=11404&format=png&color=2563EB"
                alt="Modo Escuro"
                className="w-6 h-6 drop-shadow-md"
              />
            )}
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={toggleDarkMode}
              className="sr-only peer"
            />
            {/* trilha */}
            <div className="w-12 h-7 bg-gray-400 dark:bg-gray-700 rounded-full peer-checked:bg-blue-700 transition-all"></div>
            {/* bolinha */}
            <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full border shadow-md transition-transform peer-checked:translate-x-5"></div>
          </label>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
