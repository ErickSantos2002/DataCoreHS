import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu, Moon, Sun } from "lucide-react";

import { Button } from "../design-system/ui/core/Button";
import { Switch } from "../design-system/ui/forms/Switch";
import { Tooltip } from "../design-system/ui/feedback/Tooltip";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";

interface HeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  /** No celular a sidebar fixa não existe; o botão de menu abre a gaveta. */
  onOpenMobileMenu: () => void;
}

/**
 * Conteúdo da topbar do `AppShell`. O `AppShell` não sabe recolher menu,
 * trocar tema nem sair — essas ações são do app, e chegam pela prop
 * `topbarActions`. É também o único lugar que ainda monta o `Switch` de
 * tema: antes ele estava duplicado aqui e na `Sidebar`.
 */
const Header: React.FC<HeaderProps> = ({ collapsed, onToggleSidebar, onOpenMobileMenu }) => {
  const { logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Recolher uma sidebar que o celular nem mostra (`hidden sm:flex` no
  // AppShell) deixaria a pessoa sem caminho para a navegação.
  const rotuloDoMenu = isMobile ? "Abrir menu" : collapsed ? "Expandir menu" : "Recolher menu";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex items-center gap-3">
      <Tooltip label={rotuloDoMenu}>
        <Button
          variant="ghost"
          size="sm"
          aria-label={rotuloDoMenu}
          onClick={isMobile ? onOpenMobileMenu : onToggleSidebar}
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
        {/* Só o ícone no celular; o texto continua dentro do botão e dá o
            nome acessível. */}
        <span className="hidden sm:inline">Sair</span>
      </Button>
    </div>
  );
};

export default Header;
