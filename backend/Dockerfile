# ─── Etapa 1: build (compila TypeScript a JavaScript) ───
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Etapa 2: runtime (imagen final, solo lo necesario) ───
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
# Solo dependencias de producción → imagen más pequeña y segura.
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

# Carpeta de subidas (se montará un volumen encima) con propietario "node".
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Ejecutar como usuario no root (buena práctica de seguridad).
USER node

# El puerto real lo define la variable de entorno PORT.
CMD ["node", "dist/index.js"]
