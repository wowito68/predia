# PREDIA - Baseline de migraciones Prisma

## Bases nuevas

La migracion `00000000000000_init` contiene el esquema clinico completo. En una base vacia basta ejecutar:

```bash
pnpm prisma:migrate:deploy
pnpm db:seed
```

Este es el flujo usado por GitHub Actions y por el contenedor `predia-migrator`.

## Bases existentes

Algunas instalaciones antiguas fueron creadas con `prisma db push` o SQL manual y ya contienen las tablas, pero no registran la migracion inicial en `_prisma_migrations`.

Antes del primer despliegue de esta version:

1. Crear un respaldo verificable de MySQL.
2. Confirmar que el esquema existente corresponde a `apps/web/prisma/schema.prisma`.
3. Marcar solo la migracion inicial como aplicada:

```bash
pnpm --filter @predia/web exec prisma migrate resolve --applied 00000000000000_init
pnpm prisma:migrate:deploy
pnpm prisma:migrate:status
```

No se debe ejecutar `migrate resolve` sobre una base vacia ni usarlo para ocultar una migracion fallida. La resolucion es exclusivamente el baseline de una base existente cuyo esquema ya fue creado fuera de Prisma Migrate.
