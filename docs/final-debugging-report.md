# PREDIA — Reporte de Depuración Final

**Fecha:** 2026-06-10
**Rama:** `feat/clinical-frameworks-cdss`
**Alcance:** Depuración integral para demo académica y revisión técnica (web app `apps/web`).
**Resultado:** Sistema navegable de extremo a extremo, `next build` exitoso, BD consistente con datos de prueba ricos, sin errores en consola del navegador.

---

## 1. Estado del entorno verificado

| Componente | Estado |
|---|---|
| Node | v24.15.0 |
| Base de datos | MySQL 8.0 en Docker (`predia-db`, healthy, `127.0.0.1:3306`) |
| `DATABASE_URL` | `mysql://predia_app:***@127.0.0.1:3306/predia` (`apps/web/.env`) |
| Migraciones Prisma | Al día (ver §2) |
| Servidor dev | `next dev` en `http://127.0.0.1:3002` — OK |
| `next build` (producción) | ✅ Exitoso (45 rutas) |
| `tsc --noEmit` (typecheck) | ✅ Sin errores |

> **Datos:** No se ejecutó ningún reset destructivo. La BD ya contenía 2 pacientes y 6 usuarios reales del entorno; se **conservaron** y se ampliaron con datos ficticios idempotentes.

---

## 2. Migración pendiente aplicada

- **Hallazgo:** `prisma migrate status` reportaba `add_cascade_delete_constraints` sin aplicar; `migrate deploy` fallaba con `P3005` (BD creada sin baseline de migraciones).
- **Causa raíz:** La BD se creó originalmente con `db push` / SQL manual, no con el historial de migraciones, por lo que faltaba el baseline en `_prisma_migrations`.
- **Solución:** Se aplicó el SQL de la migración directamente y se marcó como aplicada con `prisma migrate resolve --applied`. Estado final: *Database schema is up to date*.
- **Evidencia:** El borrado en cascada quedó funcional — un `DELETE /api/pacientes/21` de prueba eliminó el paciente y sus dependientes sin violación de FK.

---

## 3. Errores encontrados y corregidos

### 3.1 Lista de pacientes: "Última Consulta" siempre vacía ("Sin consultas")
- **Síntoma:** Los 20 pacientes mostraban "Sin consultas" aunque sí tenían consultas en BD.
- **Causa raíz:** `GET /api/pacientes` nunca devolvía la fecha de última consulta; la tabla (`app/pacientes/page.tsx`) leía `p.ultima_consulta`, campo que la API no incluía.
- **Solución:** `app/api/pacientes/route.ts` — se agregó un `LEFT JOIN` con `MAX(fecha_consulta)` por paciente.
- **Evidencia:** La API ahora devuelve `ultima_consulta` y la columna muestra fechas reales (9/6/2026, 21/5/2026, …).

### 3.2 Expediente: tarjeta "Estado Actual" hardcodeada ("Estable / Riesgo Bajo")
- **Síntoma:** El expediente de un paciente de riesgo **Muy Alto** mostraba "Estable / Riesgo Predicho: Bajo".
- **Causa raíz:** `components/patient-critical-summary.tsx` tenía el riesgo escrito a mano (placeholder), ignorando la predicción real.
- **Solución:** El componente ahora recibe `prediccion` y deriva estado + color del `nivel_riesgo` real (Bajo→Estable verde … Muy Alto→Requiere atención rojo). Se cableó `historial?.predicciones?.[0]` desde `app/pacientes/[id]/historial/page.tsx`.
- **Evidencia:** El expediente del paciente 1 ahora muestra "Requiere atención / Riesgo Predicho: Muy Alto" (rojo), coherente con `GET /api/pacientes/1/dashboard`.

### 3.3 Expediente: alertas de alergia grave nunca disparaban
- **Causa raíz:** El filtro de alergias graves solo consideraba severidad `'Grave'`/`'Moderada'`, pero el sistema también usa `'Severa'`/`'Alta'`.
- **Solución:** Se amplió el filtro (case-insensitive) en `patient-critical-summary.tsx`.

### 3.4 Expediente: "DATOS BIO: --" en pacientes preexistentes
- **Causa raíz:** Los 2 pacientes originales no tenían `tipo_sangre` ni datos Fase 2 (seguro, contacto de emergencia).
- **Solución:** `prisma/seed.ts` ahora **rellena (no sobrescribe)** esos campos en pacientes existentes.
- **Evidencia:** El expediente del paciente 1 muestra "DATOS BIO: O+ | IMC 26.1" y "Seguro: IMSS (#IMSS-0001)".

### 3.5 Configuración: "Nombre completo" vacío
- **Causa raíz:** `app/configuracion/page.tsx` construía el nombre desde `nombre`/`apellido_*`, pero el objeto `user` del login solo trae `nombre_completo`.
- **Solución:** Se usa `user.nombre_completo` como fuente principal (con fallbacks) y se añadió el campo a la interfaz `UserData`.
- **Evidencia:** Configuración muestra "Nombre completo: Juan Pérez".

### 3.6 `next build` fallaba en prerender ("Cannot read properties of undefined (reading 'call')")
- **Síntoma:** El build de producción abortaba al prerenderizar páginas cliente (`/configuracion/plantillas`, luego `/ayuda`, …).
- **Causa raíz:** `next.config.mjs` declaraba **dos** optimizadores de imports para `lucide-react` a la vez: `experimental.optimizePackageImports` **y** `modularizeImports` (ruta `lucide-react/dist/esm/icons/...`). La combinación rompe la resolución de módulos en el prerender. Adicionalmente, una caché `.next` corrupta por tener el servidor dev escribiendo en paralelo durante el build.
- **Solución:** Se eliminó el bloque redundante `modularizeImports` (el tree-shaking lo cubre `optimizePackageImports`). Se reconstruyó con `.next` limpio y sin dev server concurrente.
- **Evidencia:** `next build` completa las 45 rutas sin error.

---

## 4. Verificación funcional (sin errores)

- **QA de navegador (CDP/headless Chrome):** Recorrido de 12 rutas autenticadas (`/dashboard`, `/agenda`, `/pacientes`, `/nuevo-paciente`, `/pacientes/1/{historial,evolucion,predicciones,editar}`, `/historial`, `/configuracion`, `/configuracion/plantillas`, `/ayuda`). **0 errores de consola, 0 requests fallidos, 0 excepciones.**
- **Smoke de endpoints (con JWT):** 34 endpoints `GET` probados → todos `200`. (`/api/catalogos/medicamento` da 404 sólo por nombre: el tipo válido es plural `medicamentos`.)
- **Escritura/persistencia:** `POST /api/pacientes` crea y persiste; `DELETE /api/pacientes/:id` elimina en cascada. Verificado en BD.
- **Modo claro / oscuro:** Ambos consistentes (sidebar, tarjetas y texto con buen contraste; sin colores fosforescentes).
- **UI/UX:** Dashboard, agenda (kanban por fecha), lista de pacientes, expediente (hub & spoke), wizard de nuevo paciente, evolución clínica (gráficas + score), configuración — todos renderizan con datos.

---

## 5. Datos de prueba (seed idempotente)

`apps/web/prisma/seed.ts` reescrito: **idempotente** (re-ejecutable sin duplicar) y **no destructivo**. Datos marcados como ficticios (etiqueta `[DEMO]` en observaciones). Ejecutar con `pnpm db:seed` (o `npx tsx prisma/seed.ts`).

| Entidad | Total en BD |
|---|---|
| Pacientes | 20 |
| Consultas | 26 |
| Citas futuras (agenda) | 17 |
| Recetas | 20 |
| Predicciones IA | 20 |
| Alergias | 10 |
| Vacunas aplicadas | 40 |
| Patologías diagnosticadas | 30 |
| Fracturas | 4 |
| Antecedentes familiares | 40 |
| Documentos adjuntos | 20 |
| Imágenes diagnósticas | 13 |
| Signos vitales (mediciones) | 57 |
| Estudios de laboratorio | 39 |
| Automonitoreo | 520 |

También siembra catálogos: 6 vacunas, 10 patologías (CIE-10), 15 medicamentos, 10 alergias.

### Credenciales de prueba

**Web (usuario / contraseña):**

| Rol | Usuario | Contraseña |
|---|---|---|
| Administrador | `admin_luis` | `password123` |
| Médico | `dr_juan` (también `dr_maria`, `dr_carlos`) | `password123` |
| Enfermero | `enf_pedro` (también `enf_ana`) | `password123` |

**Móvil (paciente — CURP / PIN):** todos los pacientes usan PIN `123456`. Ej.: Juan Rodríguez → `ROGJ850515HMCRRN08` / `123456`.

---

## 6. Archivos modificados

| Archivo | Cambio |
|---|---|
| `apps/web/prisma/seed.ts` | Reescrito: idempotente, 20 pacientes, catálogos y datos clínicos completos; rellena Fase 2 en pacientes existentes |
| `apps/web/app/api/pacientes/route.ts` | `LEFT JOIN` para devolver `ultima_consulta` |
| `apps/web/components/patient-critical-summary.tsx` | Riesgo real (no hardcodeado) + filtro de alergias graves ampliado |
| `apps/web/app/pacientes/[id]/historial/page.tsx` | Pasa la predicción al resumen crítico |
| `apps/web/app/configuracion/page.tsx` | `nombre_completo` como fuente del nombre; campo añadido a `UserData` |
| `apps/web/next.config.mjs` | Eliminado `modularizeImports` de lucide-react (rompía el prerender) |
| `scripts/cdp-qa.mjs`, `scripts/cdp-shot.mjs` | Utilidades de QA de navegador vía CDP (nuevas) |

---

## 7. Cómo levantar el proyecto

```bash
# 1. BD (Docker) ya corriendo: contenedor predia-db (MySQL 8.0)
cd apps/web
npx prisma migrate deploy        # esquema al día
npx prisma generate              # cliente Prisma
npx tsx prisma/seed.ts           # datos de prueba (idempotente)
npx next dev -p 3002             # http://127.0.0.1:3002
# Producción: npx next build && npx next start -p 3002
```

---

## 8. Pendientes / notas (no bloqueantes para demo)

1. **Estado de cita (cancelada/completada):** El esquema modela citas como `ConsultaMedica.proxima_cita` y **no** tiene un campo de estado. La agenda muestra citas futuras correctamente; un flujo explícito de "cancelada/completada" requeriría un campo nuevo (`estado_cita`) — fuera de alcance de esta depuración (cambio estructural).
2. **`edad` al crear paciente:** `POST /api/pacientes` no calcula `edad` desde `fecha_nacimiento` (queda `null`); la UI la deriva de la fecha al mostrar. Mejora menor sugerida.
3. **PDF / impresión:** La generación de PDF es del lado del cliente (`jspdf` / `@react-pdf/renderer`); existen botones "Descargar PDF" en evolución y expediente. No se validó descarga binaria por automatización; recomendado verificar manualmente en navegador.
4. **`next-pwa@5.6.0`:** Es antiguo (pensado para Next 12). Funciona, pero conviene migrar a una alternativa moderna a futuro para evitar fricción de build.

---

## 9. Estado final

✅ App navegable de extremo a extremo · ✅ `next build` y typecheck limpios · ✅ BD consistente con datos ficticios suficientes para demo · ✅ Formularios de alta/baja funcionando y persistiendo · ✅ Modo claro/oscuro consistente · ✅ Sin errores críticos en consola. **Listo para demo académica y revisión técnica.**
