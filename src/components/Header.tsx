import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import logo from "../assets/HS2.ico";

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [menuVisivel, setMenuVisivel] = useState(false);
  const [menuAnimado, setMenuAnimado] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  if (location.pathname === "/login") return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const abrirMenu = () => {
    setMenuVisivel(true);
    setTimeout(() => setMenuAnimado(true), 10);
  };

  const fecharMenu = () => {
    setMenuAnimado(false);
    setTimeout(() => setMenuVisivel(false), 300);
  };

  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        fecharMenu();
      }
    };
    if (menuVisivel) {
      document.addEventListener("mousedown", handleClickFora);
      document.body.style.overflow = "hidden";
    } else {
      document.removeEventListener("mousedown", handleClickFora);
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("mousedown", handleClickFora);
      document.body.style.overflow = "";
    };
  }, [menuVisivel]);

  return (
    <>
      {/* HEADER FIXO */}
      <header className="sticky top-0 inset-x-0 z-50 bg-white/80 dark:bg-[#0a192f]/95 backdrop-blur-md shadow flex items-center justify-between px-4 py-3 transition-colors">
        <div className="flex items-center gap-4">
          <button
            onClick={abrirMenu}
            className="block lg:hidden text-gray-700 dark:text-gray-200 text-2xl focus:outline-none"
          >
            ☰
          </button>

          <Link
            to="/inicio"
            className="hidden lg:flex items-center gap-2 font-bold text-xl text-blue-700 dark:text-blue-400 hover:scale-105 transition no-underline group"
          >
            <img
              src={logo}
              alt="Logo"
              className="w-6 h-6 transition-transform duration-500 group-hover:rotate-[360deg]"
            />
            <span>DataCoreHS</span>
          </Link>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-700 dark:text-gray-300 max-w-[160px] truncate">
            {user?.username}{" "}
            <span className="text-xs text-gray-400">({user?.role})</span>
          </span>
          {!menuVisivel && (
            <button
              onClick={handleLogout}
              className="bg-blue-600 text-white px-3 py-1 rounded-lg font-semibold hover:bg-blue-700"
            >
              Sair
            </button>
          )}
        </div>
      </header>

      {/* MENU MOBILE */}
      {menuVisivel && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={fecharMenu}
          />
          <div
            ref={menuRef}
            className={`fixed inset-y-0 left-0 w-[70vw] bg-white dark:bg-[#0a192f] z-50 shadow-lg px-6 pb-6 flex flex-col transform transition-transform duration-300 ${
              menuAnimado ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between py-3 mb-3">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Logo" className="w-6 h-6 object-contain" />

                <span className="font-bold text-lg text-blue-700 dark:text-blue-400">
                  Menu
                </span>
              </div>
              <button
                onClick={fecharMenu}
                className="text-gray-600 dark:text-gray-300 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Navegação */}
            <nav className="flex flex-col gap-4">
              <Link to="/inicio" onClick={fecharMenu} className="text-gray-700 dark:text-gray-200 font-medium">Início</Link>
              <Link to="/dashboard" onClick={fecharMenu} className="text-gray-700 dark:text-gray-200 font-medium">Dashboard</Link>
              <Link to="/vendas" onClick={fecharMenu} className="text-gray-700 dark:text-gray-200 font-medium">Vendas</Link>
              <Link to="/servicos" onClick={fecharMenu} className="text-gray-700 dark:text-gray-200 font-medium">Serviços</Link>
              <Link to="/clientes" onClick={fecharMenu} className="text-gray-700 dark:text-gray-200 font-medium">Clientes</Link>
              <Link to="/vendedores" onClick={fecharMenu} className="text-gray-700 dark:text-gray-200 font-medium">Vendedores</Link>
              <Link to="/estoque" onClick={fecharMenu} className="text-gray-700 dark:text-gray-200 font-medium">Estoque</Link>
              {user?.role === "admin" && (
                <Link to="/configuracoes" onClick={fecharMenu} className="text-gray-700 dark:text-gray-200 font-medium">Configurações</Link>
              )}
            </nav>

            {/* Rodapé do menu mobile */}
            <div className="mt-auto flex flex-col gap-3">
              {/* Switch modo noturno */}
              <div className="flex items-center justify-between font-medium text-gray-700 dark:text-gray-200 py-2">
                <div className="flex items-center gap-2">
                  {darkMode ? (
                    <img
                      src="https://img.icons8.com/?size=100&id=s6SybfgfYCLU&format=png&color=FFD700"
                      alt="Modo Claro"
                      className="w-5 h-5"
                    />
                  ) : (
                    <img
                      src="https://img.icons8.com/?size=100&id=11404&format=png&color=1E40AF"
                      alt="Modo Escuro"
                      className="w-5 h-5"
                    />
                  )}
                  <span>{darkMode ? "" : ""}</span>
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
              </div>

              {/* Botão sair */}
              <button
                onClick={handleLogout}
                className="flex items-center w-full text-left text-red-600 font-medium hover:text-red-800 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition"
              >
                <img
                  src="https://img.icons8.com/?size=100&id=59781&format=png&color=FF0000"
                  alt="Sair"
                  className="w-5 h-5"
                />
                <span className="ml-2">Sair</span>
              </button>

            </div>

          </div>
        </>
      )}
    </>
  );
};

export default Header;
