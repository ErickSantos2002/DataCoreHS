/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── Camada 1: classes de token do Design System ──────────────
        // Reagem a troca de tema e a mudanca de token. É o que a Fase 1
        // em diante deve usar.
        primary: {
          DEFAULT: "var(--color-primary-500)",
          50: "var(--color-primary-50)",
          100: "var(--color-primary-100)",
          200: "var(--color-primary-200)",
          300: "var(--color-primary-300)",
          400: "var(--color-primary-400)",
          500: "var(--color-primary-500)",
          600: "var(--color-primary-600)",
          700: "var(--color-primary-700)",
          800: "var(--color-primary-800)",
          900: "var(--color-primary-900)",
        },
        action: {
          DEFAULT: "var(--action)",
          hover: "var(--action-hover)",
          tint: "var(--action-tint)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          base: "var(--bg-base)",
          elevated: "var(--surface-elevated)",
        },
        borda: {
          DEFAULT: "var(--border-color)",
          muted: "var(--border-muted)",
          strong: "var(--border-strong)",
        },
        conteudo: {
          DEFAULT: "var(--text-body)",
          heading: "var(--text-heading)",
          muted: "var(--text-muted)",
          faint: "var(--text-faint)",
        },
        success: "var(--color-success-500)",
        danger: "var(--color-danger-500)",
        warning: "var(--color-warning-500)",
        info: "var(--color-info-500)",

        // ── Camada 2: ponte de paleta (TEMPORARIA) ───────────────────
        // O JSX escreve cor literal: 272 classes de azul e 132 de slate.
        // Redefinir a paleta faz todas apontarem para a marca sem editar
        // nenhuma tela. Hexadecimal literal, e nao var(), porque existem
        // classes com modificador de opacidade (dark:bg-blue-900/40) e o
        // Tailwind nao aplica alfa sobre var() que guarda hexadecimal.
        //
        // Cada tela migrada na Fase 3 troca estas classes pelas de token
        // acima. Quando a ultima sair, este bloco inteiro e deletado.
        blue: {
          50: "#f1f9fe",
          100: "#dbeefa",
          200: "#b8ddf5",
          300: "#7bc0ea",
          400: "#47a6e1",
          500: "#1f89ca",
          600: "#1a71a8",
          700: "#155984",
          800: "#104565",
          900: "#0b3047",
        },
        // Usados exclusivamente sob o prefixo dark: (132 ocorrencias, zero
        // soltas), entao apontam direto para as superficies do tema escuro.
        slate: {
          700: "#1a2f4a", // --surface-elevated no escuro
          800: "#132238", // --surface no escuro
          900: "#0d1b2a", // --bg-base no escuro
        },
        // DEPRECIADO. 42 ocorrencias em 15 arquivos. Morre na Fase 3.
        darkBlue: "#132238",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      keyframes: {
        blinkLight: {
          "0%, 100%": { color: "#000000" },
          "50%": { color: "#dc2626" },
        },
        blinkDark: {
          "0%, 100%": { color: "#ffffff" },
          "50%": { color: "#dc2626" },
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
