import React from "react";
import { NavLink, useLocation } from "react-router-dom";

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
];

const Sidebar: React.FC = () => {
  const location = useLocation();

  // Não exibe Sidebar na página de login
  if (location.pathname === "/login") return null;

  return (
    <aside className="w-56 bg-white shadow h-screen sticky top-0 flex flex-col">
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
                      : "text-gray-700 hover:bg-blue-50"
                  }`
                }
                end
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
