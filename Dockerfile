# Etapa 1: Construcción
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Instalar pnpm (si existe lockfile)
RUN npm install -g pnpm

# Instalar dependencias
RUN pnpm install --no-frozen-lockfile

# Copiar todo el proyecto
COPY . .

# Build de producción
RUN pnpm build || npm run build


# Etapa 2: Servidor de producción
FROM node:18-alpine

WORKDIR /app

# Instalar pnpm también en esta etapa
RUN npm install -g pnpm

# Copiar dependencias del builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar build, public, config
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["pnpm", "start"]
