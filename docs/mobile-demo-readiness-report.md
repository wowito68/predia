# PREDIA Mobile - Checklist de preparacion para calificacion

Fecha: 2026-07-10 13:31 CST  
Entorno probado: Expo Web `http://127.0.0.1:8082` contra API local Next.js `http://127.0.0.1:3002` / `http://192.168.0.13:3002`

## Estado final

- Perfil medico funcional: login, dashboard, agenda, pacientes, detalle clinico, alertas y perfil.
- Perfil paciente funcional: login CURP/PIN, dashboard, indicadores, recetas y recomendaciones.
- Agenda movil funcional con 12 citas demo activas.
- Ciclo de agenda probado por API real: crear cita, iniciar cita y finalizar cita.
- TypeScript movil y web sin errores.
- QA navegador: 0 requests fallidos y 0 excepciones JavaScript.

## Correcciones aplicadas hoy

### Agenda demo sin datos

- Causa raiz: la tabla nueva `cita` no tenia datos demo cuando las consultas historicas ya no tenian `proxima_cita` vigente.
- Solucion: `apps/web/prisma/seed.ts` ahora crea agenda demo directa si no hay citas heredadas.
- Evidencia: seed termino con `Citas futuras: 12`.

### Perfil paciente no veia las mismas citas que el medico

- Causa raiz: el medico leia la agenda desde `cita`, pero el paciente seguia leyendo citas desde `consulta_medica.proxima_cita`.
- Solucion:
  - `apps/web/app/api/pacientes/[id]/citas/route.ts` ahora lee desde `cita`.
  - `apps/web/app/api/pacientes/[id]/dashboard/route.ts` ahora usa `cita` para proxima cita.
  - `apps/web/app/api/pacientes/[id]/clinical-snapshot/route.ts` ahora usa `cita` para el resumen clinico.
- Evidencia: dashboard paciente muestra proxima cita y `Mis citas` devuelve la cita del paciente.

### Hora de agenda partida en dos lineas

- Causa raiz: `AgendaScreen` mostraba hora local con `a.m./p.m.` en una columna estrecha.
- Solucion: formato 24h (`09:00`) y columna de tiempo mas amplia.
- Archivo: `apps/mobile/src/screens/medico/AgendaScreen.tsx`.

### QA movil incompleto

- Causa raiz: el runner esperaba cambio de pathname, pero Expo Web mantiene la URL `/` en tabs.
- Solucion: `scripts/mobile-cdp-qa.js` ahora espera contenido visible y cubre perfil medico + paciente.

## Pruebas ejecutadas

```bash
pnpm --filter @predia/web exec prisma db push
pnpm --filter @predia/web db:seed
npx tsc -p apps/mobile/tsconfig.json --noEmit
pnpm --filter @predia/web exec tsc --noEmit
node scripts/mobile-cdp-qa.js
```

Prueba funcional de agenda:

- Crear cita: OK.
- Iniciar cita: OK.
- Finalizar cita: OK.

## Credenciales demo

- Medico: `dr_juan` / `password123`
- Paciente: `ROGJ850515HMCRRN08` / `123456`

## Evidencia visual

Capturas generadas en:

- `/tmp/predia-mobile-qa/01-login.png`
- `/tmp/predia-mobile-qa/02-inicio.png`
- `/tmp/predia-mobile-qa/03-agenda.png`
- `/tmp/predia-mobile-qa/05-paciente-detalle.png`
- `/tmp/predia-mobile-qa/08-paciente-inicio.png`
- `/tmp/predia-mobile-qa/09-paciente-indicadores.png`
- `/tmp/predia-mobile-qa/10-paciente-recetas.png`
- `/tmp/predia-mobile-qa/11-paciente-consejos.png`

## Observaciones residuales

- React Native Web mantiene warnings no criticos: `pointerEvents` deprecado y `transform-origin`/`transformOrigin`. No generan requests fallidos ni excepciones.
- Los servidores locales quedaron corriendo para revision:
  - API: `http://127.0.0.1:3002`
  - Expo Web: `http://127.0.0.1:8082`
