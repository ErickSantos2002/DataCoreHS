import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext"; // 🔥 importa o contexto

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme(); // 🔥 pega estado e função

  if (location.pathname === "/login") return null;

  const menuItems = [
    {
      label: "Início",
      to: "/inicio",
      icon: (
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M13 5v6h6" />
        </svg>
      ),
    },
    {
      label: "Dashboard",
      to: "/dashboard",
      icon: (
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h4v-2H3v2zm6 8h2v-2h-2v2zm0-18v2h2V3h-2zm12 7v2h-2v-2h2zm-8-4V3h-2v2h2zm-2 14v2h2v-2h-2zm4-2v2h2v-2h-2z" />
        </svg>
      ),
    },
    {
      label: "Vendas",
      to: "/vendas",
      icon: (
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M9 21V10m6 11V10" />
        </svg>
      ),
    },
    {
      label: "Serviços",
      to: "/servicos",
      icon: (
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6h6v6m-3-12a9 9 0 100 18 9 9 0 000-18z" />
        </svg>
      ),
    },
    {
      label: "Clientes",
      to: "/clientes",
      icon: (
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A9 9 0 1117.804 5.121 7 7 0 005.121 17.804z" />
        </svg>
      ),
    },
    {
      label: "Vendedores",
      to: "/vendedores",
      icon: (
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zm-6 8h4a4 4 0 014 4v1H6v-1a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      label: "Estoque",
      to: "/estoque",
      icon: (
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V5a2 2 0 00-2-2H6a2 2 0 00-2 2v8m16 0H4m16 0l-2 6H6l-2-6" />
        </svg>
      ),
    },
    ...(user?.role === "admin"
      ? [
          {
            label: "Configurações",
            to: "/configuracoes",
            icon: (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m0 14v1m8-8h1M4 12H3m15.36 6.36l-.71-.71M6.34 6.34l-.71-.71m12.02 0l-.71.71M6.34 17.66l-.71.71" />
              </svg>
            ),
          },
        ]
      : []),
  ];

  return (
    <aside className="hidden lg:flex w-56 bg-white dark:bg-darkBlue shadow h-screen sticky top-0 flex-col transition-colors">
      <nav className="flex-1 py-6">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-700"
                  }`
                }
                end
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}

          {/* 🔥 Opção de modo noturno com switch */}
          <li className="flex items-center justify-between px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-700 transition">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
              </svg>
              <span>Modo Noturno</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={toggleDarkMode}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:bg-blue-600 transition"></div>
              <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full border transition peer-checked:translate-x-5"></div>
            </label>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
