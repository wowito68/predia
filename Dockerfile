# ── Etapa 1: Dependencias ─────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

RUN npm install -g pnpm

# Copiar archivos de workspace para cachear dependencias
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile --filter @predia/web --filter @predia/shared


# ── Etapa 2: Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl
RUN npm install -g pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

COPY . .

RUN pnpm --filter @predia/web exec prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PREDIA_BUILD_PHASE=true
ENV JWT_EXPIRES_IN=7d
ENV DATABASE_URL=mysql://placeholder:placeholder@localhost:3306/placeholder
ENV NEXT_PUBLIC_API_URL=http://localhost:3000/api

RUN pnpm --filter @predia/web build


# ── Etapa 3: Producción ───────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    apk add --no-cache wget openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
