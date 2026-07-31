# PREDIA - Reporte de fortalecimiento CI/CD

Fecha: 2026-07-30

## Objetivo

Automatizar validaciones de calidad, seguridad, base de datos, builds y despliegue usando GitHub Actions, manteniendo paridad con comandos locales reproducibles.

## Workflows agregados o reforzados

- `.github/workflows/main.yml`: pipeline principal CI/CD.
- `.github/workflows/codeql.yml`: analisis CodeQL semanal, por push y por pull request.
- `.github/dependabot.yml`: actualizaciones semanales de GitHub Actions y dependencias npm/pnpm.

## Jobs del pipeline principal

- `actionlint`: valida sintaxis y expresiones de GitHub Actions.
- `quality`: instala dependencias, genera Prisma, ejecuta lint y typecheck web/movil/shared.
- `tests`: ejecuta Jest, incluyendo pruebas de seguridad JWT, bcrypt y AES-GCM.
- `database`: levanta MySQL 8, valida Prisma, aplica migraciones, revisa status, ejecuta seed y hace smoke query.
- `build-web`: construye Next.js en modo produccion y sube metadata de build.
- `build-mobile-web`: typecheck movil y exporta bundle Expo Web como artefacto.
- `docker`: valida compose dev/rubrica/produccion y construye imagen Docker de produccion.
- `security-audit`: ejecuta `pnpm security:audit`; es informativo en PR/develop y bloqueante en `main`.
- `deploy-production`: despliega por SSH a VPS solo en `push` a `main`, despues de pasar todos los jobs bloqueantes y cuando la variable de repositorio `ENABLE_PRODUCTION_DEPLOY` vale `true`.

## Cambios de soporte

- Se agrego `eslint.config.mjs` con flat config para JS/TS, React Hooks y TypeScript.
- `actionlint` se ejecuta desde la imagen oficial fijada en `rhysd/actionlint:1.7.12`.
- Se reemplazo `next lint` interactivo por `eslint .` en `apps/web`.
- Se agregaron scripts root:
  - `pnpm lint`
  - `pnpm lint:ci`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm prisma:generate`
  - `pnpm prisma:validate`
  - `pnpm prisma:migrate:deploy`
  - `pnpm ci:local`
- Se agrego `build:web` en `apps/mobile` para validar export Expo Web.
- La app movil declara `@expo/vector-icons` como dependencia directa para que el typecheck funcione en instalaciones limpias de pnpm.
- Se agrego `predia-migrator` con profile `tools` en `docker-compose.production.yml`.
- Se optimizo `.dockerignore`; el contexto Docker bajo de aproximadamente 1.6 GB a 3.3 MB.
- Dockerfile ahora usa Node 20, fija `pnpm@10.23.0` con Corepack y permite build sin secreto real mediante `PREDIA_BUILD_PHASE=true`; runtime sigue exigiendo `JWT_SECRET`.
- Jest ignora `.next` para evitar colisiones cuando existe un build local.
- ESLint ignora `next-env.d.ts`, porque Next.js lo genera automaticamente y sus referencias triples no son codigo fuente del proyecto.
- Next.js standalone usa `outputFileTracingRoot` para incluir dependencias del monorepo.
- Se agrego `00000000000000_init` como migracion base para que `prisma migrate deploy` pueda construir una MySQL vacia.
- El smoke query del job `database` usa una funcion async compatible con la salida CommonJS de `tsx -e`.
- Produccion monta certificados reales desde `/etc/letsencrypt` y valida readiness HTTPS contra `/api/ready`.
- Se agrego `apps/web/vercel.json` y la guia `docs/vercel-monorepo-deployment.md` para desplegar Vercel desde `apps/web`.
- Se actualizaron dependencias vulnerables directas/transitivas (`next`, `jsonwebtoken`, `postcss`, `jws`, `sharp`, `fast-uri`, `serialize-javascript`, `lodash`, `js-yaml`, `shell-quote`, Babel) y se agregaron overrides de seguridad en `package.json`.
- Se eliminaron del indice de Git 1219 artefactos generados (`.tmp`, caches Expo/Metro, auxiliares LaTeX, ZIP archivado y service worker/workbox generados por PWA) y se reforzo `.gitignore` para evitar que vuelvan al PR.

## Verificacion local realizada

```bash
pnpm lint:ci
pnpm typecheck
pnpm test
pnpm prisma:validate
pnpm prisma:migrate:deploy
pnpm prisma:migrate:status
pnpm build:web
pnpm build:mobile-web
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest
docker compose config
docker compose -f docker-compose.rubric.yml config
docker compose -f docker-compose.production.yml --profile tools config
docker build --target runner -t predia-web-ci:local .
docker build --target deps -t predia-web-deps-ci:local .
pnpm security:audit
pnpm install --frozen-lockfile
```

## Resultados

- Lint CI: OK.
- Typecheck web/movil/shared: OK.
- Jest: 4 suites, 14 tests OK.
- Prisma validate: OK.
- Prisma migrate deploy/status local: OK.
- Migraciones sobre MySQL 8 vacia: 3 migraciones aplicadas, seed completo, 20 pacientes y 6 usuarios confirmados.
- Next.js production build: OK.
- Expo Web export: OK.
- Compose config dev/rubrica/produccion: OK.
- Docker production image build: OK antes del ajuste final de dependencias; despues se valido la etapa `deps` con Corepack y lockfile actualizado.
- Actionlint: OK.
- Audit CI con allowlist temporal: OK.
- `pnpm install --frozen-lockfile`: OK.

## Nota de seguridad

`pnpm security:audit:strict` todavia reporta advisories altas para `brace-expansion` y `postcss`, pero las versiones parcheadas solicitadas por npm audit no estan publicadas en el registro disponible desde este entorno (`brace-expansion` solicita `1.1.16`, `2.1.2` y `5.0.8`; `postcss` solicita `8.5.18`). Por eso `pnpm security:audit` ignora temporalmente:

- `GHSA-3jxr-9vmj-r5cp`
- `GHSA-r28c-9q8g-f849`
- `GHSA-mh99-v99m-4gvg`

El resto del audit sigue bloqueando despliegues en `main`. Cuando esas versiones existan en npm, eliminar la allowlist y correr `pnpm security:audit:strict`.
