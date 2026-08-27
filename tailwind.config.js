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
        // Texto que vai sobre um fundo de acao solido (bg-action, e as
        // variantes cheias de Button). Adicionado na Task 2: o Button
        // precisa de "text-on-primary" e o token ja existe em colors.css
        // (--text-on-primary), so nao estava mapeado ainda.
        "on-primary": "var(--text-on-primary)",
        // Idem para danger/success: o Button original usa branco solido
        // (#fff) como texto sobre esses dois fundos. "white" do Tailwind e
        // hexadecimal embutido (nao var()), entao nao e classe de token -
        // ficaria preso caso o tema mude essa cor um dia. --color-white ja
        // existe em colors.css desde a Fase 0; so faltava a classe.
        "on-danger": "var(--color-white)",
        "on-success": "var(--color-white)",
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
        // success e danger ganham "hover" na Task 2: o Button escurece um
        // degrau (500 -> 600) no hover, igual ao primary faz com
        // action/action-hover. bg-success e text-danger etc. continuam
        // funcionando: DEFAULT resolve exatamente como a string resolvia.
        success: {
          DEFAULT: "var(--color-success-500)",
          hover: "var(--color-success-600)",
        },
        danger: {
          DEFAULT: "var(--color-danger-500)",
          hover: "var(--color-danger-600)",
        },
        warning: "var(--color-warning-500)",
        info: "var(--color-info-500)",
        focus: "var(--focus-ring)",
        overlay: "var(--overlay)",
        // Balao de tooltip: escuro nos DOIS temas, de proposito. Ele flutua
        // acima de qualquer superficie e precisa se destacar tanto sobre card
        // branco quanto sobre navy. --color-slate-900 e --color-white ja
        // existem em colors.css desde a Fase 0; so faltava a classe.
        tooltip: {
          DEFAULT: "var(--color-slate-900)",
          fg: "var(--color-white)",
        },
        // Painel de login: escuro nos DOIS temas, de proposito (excecao
        // documentada do design system - a tela aparece antes de qualquer
        // preferencia de tema ser aplicada, entao nao pode reagir a ela).
        // #0a192f nao existe em nenhum var() de colors.css (nao e o mesmo
        // tom de --bg-base nem de --color-slate-900), e colors.css nao e
        // editado aqui (Fase 1). Por isso e hex literal, como o resto da
        // ponte de paleta - so que fora dela, porque nao e andaime
        // temporario: e a cor final do login, para ficar.
        login: "#0a192f",
        // Retorno efemero (Toast): os tres tokens ja existem em colors.css
        // desde a Fase 0, pensados para uma biblioteca em JS (react-hot-toast/
        // sonner) que recebe objeto de estilo. Aqui o port usa Tailwind, entao
        // so faltava a classe - nao um token novo.
        toast: {
          DEFAULT: "var(--toast-bg)",
          fg: "var(--toast-color)",
          border: "var(--toast-border)",
        },
        // Tinta semantica: a cor de significado a 15% de opacidade, ja embutida
        // no token. Fundo de badge, chip e aviso. NAO use o degrau 50 da rampa:
        // um degrau fixo vira retangulo quase branco no meio do navy.
        tint: {
          primary: "var(--tint-primary)",
          success: "var(--tint-success)",
          danger: "var(--tint-danger)",
          warning: "var(--tint-warning)",
          info: "var(--tint-info)",
          neutral: "var(--tint-neutral)",
        },
        // O texto que vai por cima de cada tinta. Este sim troca por tema.
        "on-tint": {
          primary: "var(--on-tint-primary)",
          success: "var(--on-tint-success)",
          danger: "var(--on-tint-danger)",
          warning: "var(--on-tint-warning)",
          info: "var(--on-tint-info)",
          neutral: "var(--on-tint-neutral)",
        },

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
        //
        // A rampa so e redefinida nestes tres degraus (700/800/900). 50-600
        // e 950 NAO estao aqui: continuam o cinza-frio nativo do Tailwind.
        // Ou seja, bg-slate-600 sai cinza e bg-slate-700 sai navy — os dois
        // no mesmo arquivo, degraus vizinhos, cores de familia diferente.
        slate: {
          700: "#1a2f4a", // --surface-elevated no escuro
          800: "#132238", // --surface no escuro
          900: "#0d1b2a", // --bg-base no escuro
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      width: {
        sidebar: "var(--sidebar-width)",
        "sidebar-collapsed": "var(--sidebar-width-collapsed)",
      },
      height: {
        topbar: "var(--topbar-height)",
      },
      zIndex: {
        // Escala unica de sobreposicao. O numero nao importa; a ORDEM importa,
        // e ela e: o que flutua junto do conteudo < o que cobre a tela < o que
        // avisa por cima de tudo. Tooltip vem por ultimo entre os flutuantes
        // porque ele pode aparecer DENTRO de um modal.
        dropdown: "50",
        overlay: "200",
        tooltip: "300",
        toast: "400",
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
