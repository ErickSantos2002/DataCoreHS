// src/context/ThemeContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

type ThemeContextType = {
  darkMode: boolean;
  toggleDarkMode: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <div
        className={
          darkMode
            ? "dark bg-darkBlue text-white min-h-screen"
            : "bg-gray-100 text-black min-h-screen" // 🔥 trocado de gray-50 para gray-100
        }
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  return context;
};
