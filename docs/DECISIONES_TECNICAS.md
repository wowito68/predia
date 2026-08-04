# PREDIA - Decisiones tecnicas de rubrica

## DT-001: Mantener arquitectura monorepo Next.js + Expo

- Decision: mejorar incrementalmente la arquitectura actual en lugar de reescribir.
- Alternativas: separar API en servicio Express/Nest, crear backend nuevo, cambiar DB.
- Motivo: el proyecto ya tiene flujos web/movil funcionales, Prisma/MySQL y rutas API integradas.
- Consecuencias: algunas rutas legacy se mantienen y se endurecen por prioridad.
- Archivos afectados: `apps/web`, `apps/mobile`, `packages/shared`, `infra`, `monitoring`.

## DT-002: Usar bcrypt para hash y AES-256-GCM para cifrado reversible

- Decision: conservar bcrypt para contrasenas/PIN y agregar utilitario AES-256-GCM para datos recuperables.
- Alternativas: Argon2id, libsodium.
- Motivo: bcrypt ya esta instalado y usado; AES-GCM esta disponible en `crypto` sin dependencia extra.
- Consecuencias: no se guardan llaves en codigo; se exige `PREDIA_ENCRYPTION_KEY`.
- Archivos afectados: `apps/web/lib/auth.ts`, `apps/web/lib/crypto.ts`, pruebas y documentacion.

## DT-003: Refresh tokens revocables en base de datos

- Decision: implementar refresh token opaco, hasheado en BD y rotado en `/api/auth/refresh`.
- Alternativas: refresh JWT sin estado, sesiones en memoria.
- Motivo: permite revocacion al cerrar sesion y evidencia clara de seguridad.
- Consecuencias: requiere migracion de tabla `refresh_token`.
- Archivos afectados: Prisma schema, migracion, rutas auth.

## DT-004: Infraestructura demo con Nginx como frontera publica

- Decision: preparar Nginx como reverse proxy, TLS y balanceador hacia dos instancias privadas.
- Alternativas: Traefik, Caddy, balanceador cloud.
- Motivo: Nginx es facil de auditar, demostrar y adaptar a VPS.
- Consecuencias: la nube real aun requiere DNS/certificado real.
- Archivos afectados: `infra/reverse-proxy`, `docker-compose.production.yml`, docs.
