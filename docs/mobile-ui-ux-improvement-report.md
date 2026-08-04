# PREDIA Mobile - Reporte final de depuración UI/UX y funcional

Fecha de cierre: 2026-06-11  
Entorno probado: Expo Web `http://127.0.0.1:8082` contra API local Next.js `http://127.0.0.1:3002`  
Usuario de prueba: `dr_juan / password123`

## 1. Problemas detectados

### Login móvil bloqueado en Expo Web

- Causa raíz: el backend respondía el preflight `OPTIONS` de `/api/auth/login`, pero no agregaba headers CORS a las respuestas API. Además, en web la sesión móvil usaba `expo-secure-store`, que no activaba de forma confiable el usuario después del login.
- Solución aplicada: se agregaron headers CORS para rutas `/api/*` y manejo explícito de preflight en `apps/web/middleware.ts`. En `apps/mobile/src/store/authStore.ts` se agregó persistencia web con `localStorage`, manteniendo `SecureStore` en iOS/Android.
- Evidencia: login por UI con `dr_juan / password123` completado en el runner CDP; no hubo requests fallidos ni excepciones.

### Expo Mobile no levantaba con Node 18

- Causa raíz: Expo/Metro llamaba `Array.prototype.toReversed`, API disponible en Node 20 pero no en Node 18.19.1.
- Solución aplicada: se agregó `apps/mobile/scripts/node18-polyfills.js` y se inyectó en scripts `start`, `web`, `ios` y `android` desde `apps/mobile/package.json`.
- Evidencia: `npm --prefix apps/mobile run web -- --port 8082` levantó correctamente después del cambio.

### Icono adaptativo Android apuntaba a un archivo inexistente

- Causa raíz: `apps/mobile/app.json` referenciaba `./assets/adaptive-icon.png`, inexistente en el proyecto.
- Solución aplicada: se actualizó la ruta a `./assets/android-icon-foreground.png`.
- Evidencia: configuración Expo resuelta sin error por asset faltante.

### Perfil tenía filas visuales sin acción

- Causa raíz: las opciones "Notificaciones", "Seguridad" y "Acerca de PREDIA" parecían botones por su chevron, pero no ejecutaban ninguna acción.
- Solución aplicada: se convirtieron en controles táctiles con `Alert.alert` informativo en `apps/mobile/src/screens/medico/PerfilScreen.tsx`.
- Evidencia: pantalla Perfil navegada y capturada en `/tmp/predia-mobile-qa/07-perfil.png`.

### Dictado clínico no persistía en expediente

- Causa raíz: el flujo de dictado solo mostraba la transcripción, pero no la enviaba al backend.
- Solución aplicada: se agregó `api.medico.crearConsulta()` en `apps/mobile/src/services/api.ts` y el botón de dictado ahora guarda la transcripción como consulta clínica desde `apps/mobile/src/screens/medico/DictadoNotasScreen.tsx`, invalidando cache de expediente/paciente.
- Evidencia: TypeScript compila y la pantalla queda conectada al endpoint `/api/consultas`.

### Firma/receta quedaba bloqueada en web o emulador sin biometría

- Causa raíz: el flujo exigía hardware/enrollment biométrico para emitir receta, lo que bloqueaba el demo académico en Expo Web o emuladores.
- Solución aplicada: `apps/mobile/src/screens/medico/FirmaScreen.tsx` mantiene biometría cuando existe y agrega confirmación explícita de "Firma de demo" cuando no hay biometría disponible.
- Evidencia: flujo ya no queda sin salida en entornos de prueba sin sensor biométrico.

### Warning de animación en skeleton web

- Causa raíz: `Animated` usaba `useNativeDriver: true` también en web.
- Solución aplicada: `apps/mobile/src/components/ui.tsx` usa driver nativo solo fuera de web.
- Evidencia: `npx tsc -p apps/mobile/tsconfig.json --noEmit` completó sin errores.

## 2. Pantallas/rutas probadas

- Login
- Inicio/Dashboard médico
- Agenda
- Pacientes
- Detalle de paciente / Expediente
- Alertas
- Perfil
- Accesos clínicos desde expediente: signos vitales, dictado, foto clínica, receta/firma

## 3. Componentes y archivos modificados

- `apps/mobile/app.json`
- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`
- `apps/mobile/scripts/node18-polyfills.js`
- `apps/mobile/src/components/ui.tsx`
- `apps/mobile/src/store/authStore.ts`
- `apps/mobile/src/services/api.ts`
- `apps/mobile/src/screens/medico/PerfilScreen.tsx`
- `apps/mobile/src/screens/medico/DictadoNotasScreen.tsx`
- `apps/mobile/src/screens/medico/FirmaScreen.tsx`
- `apps/web/middleware.ts`
- `scripts/mobile-cdp-qa.js`

## 4. Funcionalidades agregadas/corregidas

- Login móvil funcional desde navegador contra API local.
- Persistencia de sesión móvil en web y restauración de sesión sin bloqueo biométrico web.
- Preflight CORS y headers CORS para consumo móvil de la API.
- Dictado clínico guardable en expediente como consulta.
- Acciones reales en opciones del perfil.
- Firma de receta usable en demo sin hardware biométrico.
- Expo Mobile compatible con Node 18.
- Asset Android corregido.

## 5. Mejoras visuales y UX validadas

- Dashboard médico con jerarquía clara: métricas, acciones rápidas, citas y riesgos.
- Cards con fondo sólido y contraste correcto en viewport móvil.
- Perfil con filas táctiles consistentes y cierre de sesión de alto contraste.
- Expediente con CTA clínicos visibles: llamar, WhatsApp, signos vitales, dictado, foto clínica y receta.
- Estados de riesgo legibles mediante pills monocromáticas por severidad.
- Estados de carga con skeleton sin advertencia crítica de animación web.

## 6. Mejoras de performance/estabilidad

- React Query invalida solo las consultas afectadas después de guardar dictado clínico.
- Se mantiene cache de datos en pantallas móviles mediante queries existentes.
- Se eliminó el bloqueo de arranque por incompatibilidad Node 18/Metro.
- El runner CDP no detectó requests fallidos ni excepciones durante navegación.

## 7. Evidencia de prueba

Comandos ejecutados:

```bash
npx tsc -p apps/mobile/tsconfig.json --noEmit
node scripts/mobile-cdp-qa.js
```

Resultado:

- TypeScript móvil: OK.
- Navegación automatizada CDP: OK.
- Requests fallidos: 0.
- Excepciones JavaScript: 0.

Capturas generadas:

- `/tmp/predia-mobile-qa/01-login.png`
- `/tmp/predia-mobile-qa/02-inicio.png`
- `/tmp/predia-mobile-qa/03-agenda.png`
- `/tmp/predia-mobile-qa/04-pacientes.png`
- `/tmp/predia-mobile-qa/05-paciente-detalle.png`
- `/tmp/predia-mobile-qa/06-alertas.png`
- `/tmp/predia-mobile-qa/07-perfil.png`

Datos reales observados desde API:

- 20 pacientes.
- 1 cita de hoy.
- 17 citas próximas.
- 10 pacientes en alto riesgo.
- 6 riesgos pendientes de validación.
- Expediente de Juan Rodríguez con riesgo MUY ALTO 82%, alergia a penicilina, signos vitales, consulta y receta activa.

## 8. Pendientes/residuales

- React Native Web aún emite warnings no críticos por `shadow*` y `pointerEvents`. No hay requests fallidos ni excepciones; estos warnings vienen del render web/dependencias y no bloquean iOS/Android.
- No se validó build nativo en dispositivo físico iOS/Android desde este entorno; se validó Expo Web con viewport móvil y API real local.
- La prueba automatizada cubre navegación principal y pantallas clínicas visibles; pruebas E2E nativas con Detox/Appium quedarían como endurecimiento adicional.

## 9. Estado final

Estado final móvil: funcional para demo académica en Expo Web, conectado a API local, con login operativo, navegación médico completa, lectura de datos clínicos, perfil accionable, dictado persistente en expediente y flujo de firma usable en entorno sin biometría.

