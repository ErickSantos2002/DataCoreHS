import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu, Moon, Sun } from "lucide-react";

import { Button } from "../design-system/ui/core/Button";
import { Switch } from "../design-system/ui/forms/Switch";
import { Tooltip } from "../design-system/ui/feedback/Tooltip";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";

interface HeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

/**
 * Conteúdo da topbar do `AppShell`. O `AppShell` não sabe recolher menu,
 * trocar tema nem sair — essas ações são do app, e chegam pela prop
 * `topbarActions`. É também o único lugar que ainda monta o `Switch` de
 * tema: antes ele estava duplicado aqui e na `Sidebar`.
 */
const Header: React.FC<HeaderProps> = ({ collapsed, onToggleSidebar }) => {
  const { logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex items-center gap-3">
      <Tooltip label={collapsed ? "Expandir menu" : "Recolher menu"}>
        <Button
          variant="ghost"
          size="sm"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          onClick={onToggleSidebar}
          icon={<Menu size={16} strokeWidth={2} aria-hidden="true" />}
        />
      </Tooltip>

      <div className="flex items-center gap-2">
        {darkMode ? (
          <Sun size={16} strokeWidth={1.75} aria-hidden="true" className="text-conteudo-muted" />
        ) : (
          <Moon size={16} strokeWidth={1.75} aria-hidden="true" className="text-conteudo-muted" />
        )}
        <Switch checked={darkMode} onChange={toggleDarkMode} size="sm" label="Tema escuro" />
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleLogout}
        icon={<LogOut size={16} strokeWidth={2} aria-hidden="true" />}
      >
        Sair
      </Button>
    </div>
  );
};

export default Header;
