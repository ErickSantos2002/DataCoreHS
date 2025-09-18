module.exports = {
  darkMode: "class", // 🔥 habilita suporte ao modo escuro baseado em classe
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "bg-white",
    "bg-red-500",
    "bg-blue-500",
    "dark:bg-darkBlue",
    "dark:text-gray-200",
    "dark:hover:bg-blue-700",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563eb",
        },
        darkBlue: "#1e3a8a", // 🔥 cor principal do modo noturno
      },
      keyframes: {
        blinkLight: {
          "0%, 100%": { color: "#000000" }, // preto
          "50%": { color: "#dc2626" }, // vermelho
        },
        blinkDark: {
          "0%, 100%": { color: "#ffffff" }, // branco
          "50%": { color: "#dc2626" }, // vermelho
        },
      },
      animation: {
        blinkLight: "blinkLight 1s infinite",
        blinkDark: "blinkDark 1s infinite",
      },
    },
  },
  plugins: [],
};
