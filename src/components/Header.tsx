import React from "react";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLocation, useNavigate, Link } from "react-router-dom";


const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Não exibe Header na página de login
  if (location.pathname === "/login") return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-white shadow flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-4">
        {/* Botão de menu visível só no mobile */}
        <button
          onClick={() => setMenuAberto(!menuAberto)}
          className="block lg:hidden text-gray-700 focus:outline-none"
        >
          ☰
        </button>

        <span className="font-bold text-xl text-blue-700">DataCoreHS</span>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-700 max-w-[160px] truncate">
          {user?.username} <span className="text-xs text-gray-400">({user?.role})</span>
        </span>
        <button
          onClick={handleLogout}
          className="bg-blue-600 text-white px-3 py-1 rounded-lg font-semibold hover:bg-blue-700"
        >
          Sair
        </button>
      </div>

      {/* Sidebar mobile flutuante */}
      {menuAberto && (
        <div className="absolute top-16 left-0 w-64 bg-white shadow-lg z-50 p-4 lg:hidden">
          <nav className="flex flex-col space-y-2">
            <Link to="/inicio" className="text-gray-700 font-medium">Início</Link>
            <Link to="/dashboard" className="text-gray-700 font-medium">Dashboard</Link>
            <Link to="/vendas" className="text-gray-700 font-medium">Vendas</Link>
            <Link to="/servicos" className="text-gray-700 font-medium">Serviços</Link>
            <Link to="/clientes" className="text-gray-700 font-medium">Clientes</Link>
            <Link to="/vendedores" className="text-gray-700 font-medium">Vendedores</Link>
            <Link to="/estoque" className="text-gray-700 font-medium">Estoque</Link>

            {user?.role === "admin" && (
              <Link to="/configuracoes" className="text-gray-700 font-medium">Configurações</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
