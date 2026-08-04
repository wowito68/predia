# Capa de acceso a datos — criterio

El proyecto usa **dos vías** de acceso a la base de datos (MariaDB/MySQL), por diseño:

- **SQL crudo vía `lib/db.ts`** (`query`, `queryOne`, `transaction`, pool `mysql2`).
  Es la vía por defecto de las **rutas de lectura** del API (`app/api/**`), por control
  fino del SQL, joins y rendimiento. Devuelven el shape estándar `{ success, data }` /
  `{ success: false, error }`.
- **Prisma** (`prisma/schema.prisma`) para el **modelo de datos, migraciones y `seed`**
  (`pnpm db:migrate`, `db:seed`). Es la fuente de verdad del esquema.

## Convenciones para rutas nuevas
1. Una sola vía por ruta (no mezclar Prisma y SQL crudo en el mismo handler).
2. Validar el `id`/inputs y responder con `{ success, data? , error? }` y el código HTTP
   adecuado (`400` input, `401/403` auth, `404` no encontrado, `500` error interno).
3. No filtrar detalles internos en los `500` (loguear con `console.error`, responder un
   mensaje genérico).
4. Auth con los wrappers de `lib/auth.ts` (`requireAuth`, `requireRole`,
   `requirePacienteSelf`).

## Capas clínicas desacopladas (reutilizables)
- `lib/risk/` — estratificación de riesgo (FASE 1).
- `lib/evolution/` — evolución temporal y CES (FASE 2).
- `lib/cdss/` — soporte a la decisión: reglas, prioridad, recomendaciones (FASE 3).
  Funciones **puras y testeables** (`assessPatient`); el querying del EHR vive en la ruta
  `app/api/pacientes/[id]/asistente`.
