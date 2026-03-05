# ── Etapa 1: Dependencias ─────────────────────────────────────────
FROM node:18-alpine AS deps

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar solo archivos de dependencias para cachear la capa
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Instalar dependencias
RUN pnpm install --no-frozen-lockfile


# ── Etapa 2: Build ────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# OpenSSL necesario para Prisma
RUN apk add --no-cache openssl

# Instalar pnpm
RUN npm install -g pnpm

# Copiar dependencias desde la etapa anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar todo el proyecto (respeta .dockerignore)
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Variables de entorno necesarias para el build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Placeholders para que `next build` pueda compilar páginas API
# (los valores reales se inyectan en runtime via env_file)
ENV JWT_SECRET=build-placeholder-not-used-at-runtime
ENV JWT_EXPIRES_IN=7d
ENV DATABASE_URL=mysql://placeholder:placeholder@localhost:3306/placeholder
ENV NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Build de producción (standalone output)
RUN pnpm build


# ── Etapa 3: Producción (imagen mínima) ──────────────────────────
FROM node:18-alpine AS runner

WORKDIR /app

# Create user + install wget for healthcheck
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    apk add --no-cache wget

# Variables de entorno de producción
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copiar archivos públicos
COPY --from=builder /app/public ./public

# Copiar build standalone con permisos correctos
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar Prisma schema (por si se necesita para migraciones)
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
