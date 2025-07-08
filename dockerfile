# Etapa de build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

RUN npm install

COPY . .

RUN find node_modules/.bin -type f -exec chmod +x {} \;

RUN npm run build

# Etapa final: container leve para servir arquivos estáticos
FROM node:20-alpine

WORKDIR /app

RUN npm install -g http-server

COPY --from=builder /app/dist .

EXPOSE 80

CMD ["http-server", "-p", "80"]
