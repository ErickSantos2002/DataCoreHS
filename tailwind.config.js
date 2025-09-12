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
    },
  },
  plugins: [],
};
