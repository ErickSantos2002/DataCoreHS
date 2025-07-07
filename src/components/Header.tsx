import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Não exibe Header na página de login
  if (location.pathname === "/login") return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-white shadow flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-2">
        {/* Seu logo ou nome do sistema */}
        <span className="font-bold text-xl text-blue-700 tracking-wide">DataCoreHS</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-gray-700">
          {user?.username} <span className="text-xs text-gray-400">({user?.role})</span>
        </span>
        <button
          onClick={handleLogout}
          className="bg-blue-600 text-white px-3 py-1 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Sair
        </button>
      </div>
    </header>
  );
};

export default Header;
