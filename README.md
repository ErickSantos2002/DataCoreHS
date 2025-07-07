# DataCoreHS

**DataCoreHS** é um sistema web moderno desenvolvido com **React + TypeScript**, que se conecta a uma **API** responsável por intermediar o acesso a um banco de dados repleto de **notas fiscais**. A proposta central do sistema é **apresentar dashboards, gráficos e visualizações claras** sobre os dados da empresa, permitindo uma análise eficiente, rápida e intuitiva.

---

## 🚀 Funcionalidades Principais

- 📊 Exibição de **dashboards dinâmicos** com base nas notas fiscais.
- 📈 Visualização de **gráficos** de desempenho, faturamento e outros KPIs.
- 🔍 Navegação rápida e segura entre diferentes páginas.
- 🔐 Autenticação de usuários com rotas protegidas.
- 🌐 Comunicação com a API REST para consulta de dados em tempo real.

---

## 📁 Estrutura do Projeto

```
src/
├── assets/                # Imagens e ícones
│   ├── fundo.png
│   ├── HS2.ico
│   └── logo.png
├── components/            # Componentes reutilizáveis da interface
│   ├── Header.tsx
│   ├── ProtectedRoute.tsx
│   └── Sidebar.tsx
├── context/               # Contexto global (ex: autenticação)
│   └── AuthContext.tsx
├── hooks/                 # Hooks personalizados
│   └── useAuth.ts
├── pages/                 # Páginas principais do sistema
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   └── NotFound.tsx
├── services/              # Comunicação com a API
│   └── api.ts
├── styles/                # Estilização global
│   ├── index.css
│   └── ...
├── App.tsx                # Componente raiz da aplicação
├── main.tsx               # Ponto de entrada da aplicação
├── router.tsx             # Gerenciamento de rotas
```

Arquivos de configuração principais:

- `.dockerignore`, `Dockerfile`: Contêiner Docker.
- `nginx.conf`: Configuração do servidor web.
- `tailwind.config.js`, `postcss.config.js`: Configuração de estilos com Tailwind CSS.
- `vite.config.ts`: Configuração do bundler Vite.
- `tsconfig.json`: Configuração do TypeScript.
- `vite-env.d.ts`: Tipagens globais.

---

## 🧩 Tecnologias Utilizadas

- **React + TypeScript**
- **Vite** – build rápido e eficiente
- **Tailwind CSS** – estilização moderna e responsiva
- **Axios** – requisições HTTP para a API
- **React Router** – gerenciamento de rotas
- **Context API + Hooks** – controle de estado e autenticação

---

## ⚙️ Como Executar o Projeto

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Execute o projeto em ambiente de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Acesse em `http://localhost:5173`

---

## 📦 Build para Produção

```bash
npm run build
```

---

## 📝 Licença

Este projeto é licenciado sob os termos da **MIT License**.
