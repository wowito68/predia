# PREDIA — Reporte de Performance y Limpieza

**Fecha:** 2026-06-10
**Rama:** `feat/clinical-frameworks-cdss`
**Alcance:** Optimización de rendimiento (web + móvil), eficiencia de queries y limpieza segura del repositorio.
**Resultado:** First Load JS de las páginas pesadas reducido **~75%**, endpoints de dashboard paralelizados, 34 dependencias sin uso eliminadas, build/typecheck/tests en verde. Sin funcionalidades rotas.

---

## 1. Métricas antes / después (First Load JS)

Medido con `next build`. El bundle de las rutas más pesadas se redujo moviendo `@react-pdf/renderer` y `recharts` a carga diferida (`next/dynamic`, `ssr:false`).

| Ruta | Antes | Después | Reducción |
|---|---|---|---|
| `/pacientes/[id]/predicciones` | **831 kB** | **206 kB** | −75% |
| `/pacientes/[id]/evolucion` | **820 kB** | **195 kB** | −76% |
| `/pacientes/[id]/historial` | **317 kB** | **213 kB** | −33% |
| First Load JS compartido | 101 kB | 101 kB | — |

> Las librerías pesadas (PDF y gráficas) ahora se cargan como *chunks* asíncronos bajo demanda, en lugar de bloquear la carga inicial de la página.

---

## 2. Fase 1 — Auditoría

- **Causa raíz de la lentitud:** `@react-pdf/renderer` (~500 kB) y `recharts` (~400 kB) se importaban de forma **estática** en `evolucion`, `predicciones` e `historial`, inflando el First Load JS a 800+ kB.
- `PDFDownloadButton` ya cargaba `PDFDownloadLink` con `dynamic`, pero el **documento PDF** (`EvolutionReportPDF`, `RiskReportPDF`) se importaba estático → arrastraba `@react-pdf` al bundle igual.
- React Query (web) ya tenía `staleTime`/`refetchOnWindowFocus` razonables.
- Endpoints de dashboard ejecutaban múltiples queries **secuenciales** (round-trips innecesarios).
- `package.json` (web) con muchas dependencias declaradas pero nunca importadas.

---

## 3. Fase 2 — Optimización web aplicada

| Cambio | Archivo |
|---|---|
| `ClinicalEvolution` (recharts) y botón PDF vía `dynamic(ssr:false)` | `app/pacientes/[id]/evolucion/page.tsx` |
| Nuevo wrapper de PDF cargado por `dynamic` (saca `@react-pdf` del bundle) | `components/pdf/EvolutionPDFButton.tsx` (nuevo) |
| `RiskTimeline` (recharts) y botón PDF vía `dynamic(ssr:false)` | `app/pacientes/[id]/predicciones/page.tsx` |
| Nuevo wrapper de PDF de riesgo | `components/pdf/RiskPDFButton.tsx` (nuevo) |
| `VitalSignsChart` (recharts) vía `dynamic(ssr:false)` | `app/pacientes/[id]/historial/page.tsx` |
| React Query: `gcTime` y `retry:1` añadidos (menos esperas en errores) | `app/providers.tsx` |

Cada carga diferida muestra un *skeleton*/loader ("Cargando gráficas…", "PDF…") en lugar de un loader bloqueante.

---

## 4. Fase 3 — Optimización de queries (Prisma/MySQL)

Tres endpoints ejecutaban queries independientes en serie; se paralelizaron con `Promise.all`:

| Endpoint | Antes | Después |
|---|---|---|
| `app/api/dashboard/stats/route.ts` | 9 queries secuenciales | 1 lote paralelo |
| `app/api/pacientes/[id]/expediente/route.ts` | 3 queries secuenciales | 1 lote paralelo |
| `app/api/pacientes/[id]/dashboard/route.ts` | 4 queries secuenciales | 1 lote paralelo |

Hallazgos positivos preexistentes (no requirieron cambios):
- `documentos` e `imagenes` ya usan `select` y **excluyen los `LongBlob`** del listado (se descargan aparte).
- El esquema ya tiene `@@index` sobre `id_paciente` en todas las tablas hijas → sin N+1 ni índices faltantes.
- Los `findMany` sin `take` están acotados por paciente (volumen pequeño); no representan riesgo.

---

## 5. Fase 4 — Optimización app móvil

- **`apps/mobile/App.tsx`:** el `QueryClient` se creaba **sin defaults** (`staleTime:0` → refetch en cada montaje). Se configuraron defaults para móvil: `staleTime 60s`, `gcTime 10min`, `retry:1`, `refetchOnReconnect`. Esto reduce *fetch* repetidos y renders al navegar entre pantallas.
- **Assets:** revisados; sólo `assets/icon.png` (388 kB, icono de app, se empaqueta una vez). Sin imágenes pesadas en runtime.
- **Listas:** las pantallas usan `ScrollView + .map()` sobre datos pequeños por paciente (aceptable). `AlertasScreen` ya usa `FlatList`. Ver recomendaciones (§8).

---

## 6. Fase 5–6 — Limpieza de repo y dependencias

### Archivos movidos a `_archive_unused/` (no eliminados)
| Archivo | Motivo |
|---|---|
| `predia.zip` (2.4 MB) | Backup/snapshot antiguo, sin referencias en código ni scripts |
| `server.log` | Log de ejecución antiguo |

> No se tocaron: `diabetes_dataset.csv` (asset de ML), `*.pem` (claves privadas, ya gitignored), migraciones, seed ni modelos ML.

### Dependencias eliminadas (web) — 34 paquetes
Todas verificadas con `grep` (0 imports en todo el árbol `app/components/lib/hooks/store`, no referenciadas en configs):

- **Radix UI individuales sin uso (20):** accordion, alert-dialog, aspect-ratio, avatar, checkbox, collapsible, context-menu, dropdown-menu*, hover-card, menubar, navigation-menu, popover, radio-group, scroll-area, separator, slider, switch, toast, toggle, toggle-group.
  *(`dropdown-menu` se usa vía el paquete paraguas `radix-ui`, no el individual).*
- **Otras (14):** `@hookform/resolvers`, `react-hook-form`, `@tanstack/react-query-devtools`, `cmdk`, `date-fns`, `embla-carousel-react`, `input-otp`, `jspdf`, `jspdf-autotable`, `react-day-picker`, `react-resizable-panels`, `react-to-print`, `tailwindcss-animate`, `tw-animate-css`.

Se ejecutó `pnpm install` (lockfile actualizado) y el build siguió pasando.

**Conservadas pese a flag de depcheck** (falsos positivos verificados): `@tailwindcss/postcss`, `postcss`, `autoprefixer` (config de build), `@types/jest`/`jest`/`ts-jest` (hay tests en `__tests__/`), `@predia/shared` (workspace, type-only), y los Radix realmente usados (slot, dialog, label, progress, select, tabs, tooltip).

---

## 7. Fase 7 — Validación

| Verificación | Resultado |
|---|---|
| `tsc --noEmit` (typecheck) | ✅ Sin errores |
| `next build` (clean) | ✅ 45 rutas, compila OK |
| `jest` | ✅ 2 suites, 8/8 tests |
| Endpoints (login, dashboard/stats, pacientes, agenda, expediente, historial, patient dashboard) | ✅ 200, datos correctos |
| `/pacientes/1/predicciones` | ✅ Gauge de riesgo + timeline (recharts dinámico) + botón "Descargar PDF" funcional |
| `/pacientes/1/evolucion` | ✅ Asistente Clínico + Clinical Evolution Score + gráficas + "Descargar PDF" |
| PDFs | ✅ Botones cargan su *chunk* y funcionan tras la carga diferida |

---

## 8. Riesgos restantes y recomendaciones futuras

1. **Listas móviles:** migrar `ScrollView + .map()` a `FlatList`/`SectionList` en `medico/AgendaScreen` y `paciente/AutomonitoreoScreen` si el volumen de datos crece (virtualización). No se hizo ahora por no poder validar el layout RN en este entorno.
2. **`next-pwa@5.6.0`:** desactualizado (pensado para Next 12); funciona pero conviene migrar a una alternativa moderna.
3. **Consolidar fetches del expediente web:** `app/pacientes/[id]/historial` dispara ~12 llamadas paralelas; existe `/api/pacientes/[id]/expediente` que podría agregarlas. No se refactorizó por riesgo (cada módulo tiene su propio estado/forma de datos).
4. **`_archive_unused/`:** revisar y eliminar definitivamente tras confirmar que no se necesita (especialmente `predia.zip`).
5. **`.pem` en `apps/web`:** son claves privadas (ya gitignored); conviene rotarlas/sacarlas del árbol del proyecto.

---

## 9. Estado final

✅ Web más rápida (bundle de páginas pesadas −75%) · ✅ Móvil con cache de datos eficiente · ✅ Queries de dashboard paralelizadas · ✅ 34 dependencias muertas eliminadas · ✅ 2.4 MB de basura archivada · ✅ build/typecheck/tests en verde · ✅ Sin rutas ni funcionalidades rotas. **Listo para demo académica fluida.**

### Archivos modificados (resumen)
- `app/pacientes/[id]/{evolucion,predicciones,historial}/page.tsx` — carga diferida de PDF/charts
- `components/pdf/EvolutionPDFButton.tsx`, `components/pdf/RiskPDFButton.tsx` — wrappers dinámicos (nuevos)
- `app/providers.tsx` — defaults React Query (web)
- `app/api/dashboard/stats/route.ts`, `app/api/pacientes/[id]/{expediente,dashboard}/route.ts` — `Promise.all`
- `apps/mobile/App.tsx` — defaults React Query (móvil)
- `apps/web/package.json` — 34 dependencias eliminadas
- `_archive_unused/` — `predia.zip`, `server.log` (movidos)
