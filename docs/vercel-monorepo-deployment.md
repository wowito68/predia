# PREDIA - Despliegue Vercel en monorepo

Fecha: 2026-07-29

## Configuracion recomendada

El proyecto web Next.js vive en `apps/web`, por lo que Vercel debe configurarse como aplicacion dentro del monorepo:

- Framework Preset: `Next.js`
- Root Directory: `apps/web`
- Install Command: `cd ../.. && pnpm install --frozen-lockfile`
- Build Command: `pnpm build`
- Output Directory: `.next`

Tambien se debe habilitar la opcion de incluir archivos fuera del Root Directory, porque la app web consume el workspace `packages/shared` y el lockfile vive en la raiz del repositorio.

## Archivo de soporte

`apps/web/vercel.json` fija los comandos esperados para evitar que Vercel intente compilar desde la raiz antigua del proyecto.

## Variables requeridas

Configurar en Vercel, al menos:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `PREDIA_ENCRYPTION_KEY`
- `NEXT_PUBLIC_API_URL`

Para produccion, `JWT_SECRET` debe ser largo y aleatorio; no usar valores de demo.
