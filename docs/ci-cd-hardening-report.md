# PREDIA - Reporte de fortalecimiento CI/CD

Fecha: 2026-07-29

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
- `security-audit`: ejecuta `pnpm audit --audit-level high` como job no bloqueante por deuda existente de dependencias.
- `deploy-production`: despliega por SSH a VPS solo en `push` a `main`, despues de pasar todos los jobs bloqueantes.

## Cambios de soporte

- Se agrego `eslint.config.mjs` con flat config para JS/TS, React Hooks y TypeScript.
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
- Se agrego `predia-migrator` con profile `tools` en `docker-compose.production.yml`.
- Se optimizo `.dockerignore`; el contexto Docker bajo de aproximadamente 1.6 GB a 3.3 MB.
- Dockerfile ahora usa Node 20 y permite build sin secreto real mediante `PREDIA_BUILD_PHASE=true`; runtime sigue exigiendo `JWT_SECRET`.
- Jest ignora `.next` para evitar colisiones cuando existe un build local.

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
```

## Resultados

- Lint CI: OK.
- Typecheck web/movil/shared: OK.
- Jest: 4 suites, 14 tests OK.
- Prisma validate: OK.
- Prisma migrate deploy/status local: OK.
- Next.js production build: OK.
- Expo Web export: OK.
- Compose config dev/rubrica/produccion: OK.
- Docker production image build: OK.
- Actionlint: OK.

## Nota de seguridad

`pnpm audit --audit-level high` detecta vulnerabilidades heredadas en dependencias como Next.js/next-pwa y paquetes transitivos. Por eso el job `security-audit` queda no bloqueante: reporta el riesgo sin impedir demo/despliegue. La siguiente iteracion recomendada es actualizar Next.js y revisar reemplazo o upgrade de `next-pwa`.
