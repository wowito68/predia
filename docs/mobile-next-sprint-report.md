# PREDIA Mobile Next Sprint - Reporte final de integracion movil

Fecha de cierre: 2026-06-24 (America/Mexico_City)  
Entorno probado: Expo Web `http://127.0.0.1:8082` contra API Next.js local `http://127.0.0.1:3002/api`  
Viewport de prueba: 390 x 844 px  
Roles probados: medico `dr_juan / password123`, enfermero `enf_pedro / password123`, paciente `ROGJ850515HMCRRN08 / 123456`

## 1. Errores encontrados y correcciones aplicadas

### Navegacion movil sin separacion clara por rol

- Causa raiz: medico y enfermeria compartian la misma experiencia base, por lo que las acciones clinicas no estaban alineadas con permisos reales del rol.
- Solucion aplicada: se agrego `EnfermeroNavigator` y se ajusto el enrutamiento raiz para enviar a cada usuario a su flujo. La ficha del paciente ahora muestra acciones por rol: medico puede crear consulta, receta y validar IA; enfermeria solo captura mediciones y consulta historial.
- Evidencia: QA CDP valido que medico ve `Nueva consulta` y `Nueva receta`, mientras enfermeria no las ve y si ve `Nueva medicion`.

### Home medico/enfermeria no respondia "que atiendo hoy"

- Causa raiz: el inicio movil no priorizaba agenda, alertas criticas, pacientes de alto riesgo ni seguimientos accionables.
- Solucion aplicada: se rediseño `HomeScreen` como tablero clinico 2.0 con metricas de jornada, acciones rapidas, citas del dia, alertas y pacientes prioritarios.
- Evidencia: captura `/tmp/predia-mobile-next-sprint-qa/01-medico-inicio.png` y asercion `Inicio medico`.

### Alertas clinicas sin agregacion movil accionable

- Causa raiz: la app movil no tenia un endpoint especifico para consolidar riesgo, alergias, presion, glucosa, citas vencidas, falta de seguimiento y recetas activas por revisar.
- Solucion aplicada: se creo `GET /api/mobile/clinical-alerts`, protegido para Administrador, Medico y Enfermero, agregando datos reales de MySQL y ordenando por prioridad.
- Evidencia: API directa devolvio 57 alertas para medico y 57 para enfermeria. QA valido `Alertas clinicas` y `Accion sugerida` sin requests fallidos.

### Perfil del paciente dependia de multiples lecturas dispersas

- Causa raiz: la ficha clinica movil necesitaba datos de riesgo, alergias, signos, consultas, recetas, documentos y timeline, pero la lectura fragmentada hacia mas facil tener pantallas incompletas o estados inconsistentes.
- Solucion aplicada: se creo `GET /api/pacientes/[id]/clinical-snapshot` con resumen clinico, riesgo, alertas activas, ultimos signos, alergias criticas, recetas, proxima cita y timeline.
- Evidencia: API directa devolvio las llaves `paciente`, `risk`, `alerts`, `summary` y `timeline`. Capturas `03-medico-paciente.png`, `04-medico-historial.png` y `06-enfermeria-paciente.png`.

### Experiencia paciente incompleta para la nueva integracion movil

- Causa raiz: el flujo paciente no separaba claramente inicio, indicadores, recetas y recomendaciones, y algunas vistas mezclaban informacion tecnica con acciones poco claras.
- Solucion aplicada: se rediseño `PacienteNavigator` con tabs `Inicio`, `Indicadores`, `Recetas` y `Consejos`. Se agregaron pantallas de indicadores y recomendaciones con lenguaje claro, recordatorios y lectura desde API real.
- Evidencia: QA navego `07-paciente-inicio.png`, `08-paciente-indicadores.png`, `09-paciente-recetas.png` y `10-paciente-recomendaciones.png`.

### UI movil con detalles genericos e inconsistentes

- Causa raiz: componentes base usaban sombras/radios y estados visuales que no siempre daban una apariencia SaaS clinica sobria; algunos estados vacios/error tenian microcopy o iconografia menos profesional.
- Solucion aplicada: se ajustaron `Card`, `Header`, `QueryState`, tema y pantallas principales para unificar jerarquia, contraste, cards, botones y estados de carga/error.
- Evidencia: inspeccion visual de capturas CDP confirmo fondos solidos, texto legible, acciones primarias claras y sin modales/dropdowns transparentes en las rutas probadas.

### Runner de QA no terminaba limpiamente

- Causa raiz: el script CDP cerraba el WebSocket, pero el proceso quedaba vivo despues de imprimir el JSON.
- Solucion aplicada: se ajusto `scripts/mobile-next-sprint-qa.js` para terminar con `exit 0` cuando no hay errores criticos y `exit 2` si detecta errores de consola, red o excepciones.
- Evidencia: `node scripts/mobile-next-sprint-qa.js` finalizo con codigo `0`.

## 2. Archivos modificados principales

- `apps/web/app/api/mobile/clinical-alerts/route.ts`
- `apps/web/app/api/pacientes/[id]/clinical-snapshot/route.ts`
- `apps/mobile/src/services/api.ts`
- `apps/mobile/src/navigation/index.tsx`
- `apps/mobile/src/navigation/MedicoNavigator.tsx`
- `apps/mobile/src/navigation/EnfermeroNavigator.tsx`
- `apps/mobile/src/navigation/PacienteNavigator.tsx`
- `apps/mobile/src/screens/medico/HomeScreen.tsx`
- `apps/mobile/src/screens/medico/AlertasScreen.tsx`
- `apps/mobile/src/screens/medico/PacienteDetalleScreen.tsx`
- `apps/mobile/src/screens/medico/HistorialClinicoScreen.tsx`
- `apps/mobile/src/screens/medico/PacientesScreen.tsx`
- `apps/mobile/src/screens/paciente/DashboardScreen.tsx`
- `apps/mobile/src/screens/paciente/IndicadoresScreen.tsx`
- `apps/mobile/src/screens/paciente/RecetasScreen.tsx`
- `apps/mobile/src/screens/paciente/RecomendacionesScreen.tsx`
- `apps/mobile/src/components/Card.tsx`
- `apps/mobile/src/components/Header.tsx`
- `apps/mobile/src/components/QueryState.tsx`
- `apps/mobile/src/theme/index.ts`
- `scripts/mobile-next-sprint-qa.js`

## 3. Performance y estabilidad

- Se redujeron lecturas fragmentadas de ficha clinica mediante `clinical-snapshot`.
- La lista de pacientes movil usa paginacion, busqueda con debounce y `FlatList` afinado para evitar cargas grandes en una sola vista.
- Las pantallas nuevas usan React Query con cache/invalidation local donde corresponde.
- Las alertas clinicas se calculan en un endpoint dedicado con consultas agrupadas y limite de salida.
- No se detectaron requests HTTP fallidos ni excepciones JavaScript durante el recorrido automatizado.

## 4. Evidencia de prueba

Comandos ejecutados:

```bash
npx tsc -p apps/mobile/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
npm exec -- prisma validate --schema prisma/schema.prisma
npm exec -- prisma migrate status --schema prisma/schema.prisma
node scripts/mobile-next-sprint-qa.js
```

Resultados:

- TypeScript movil: OK.
- TypeScript web: OK.
- Prisma schema: valido.
- Migraciones Prisma: base MySQL `predia` en `127.0.0.1:3306` al dia.
- QA navegador CDP: OK, codigo `0`.
- Aserciones QA: 9/9.
- Capturas QA: 10.
- Errores de consola: 0.
- Requests fallidos: 0.
- Excepciones JavaScript: 0.
- Warnings residuales: 2 warnings no criticos de React Native Web por `shadow*` y `pointerEvents`.

Validacion API directa:

```json
{
  "medico": { "rol": "Medico", "token": true },
  "enfermero": { "rol": "Enfermero", "token": true },
  "paciente": { "rol": "PACIENTE", "id_paciente": 1, "token": true },
  "alertasMedico": 57,
  "alertasEnfermero": 57,
  "snapshotKeys": ["paciente", "risk", "alerts", "summary", "timeline"],
  "automonitoreo": 26
}
```

Capturas generadas:

- `/tmp/predia-mobile-next-sprint-qa/01-medico-inicio.png`
- `/tmp/predia-mobile-next-sprint-qa/02-medico-alertas.png`
- `/tmp/predia-mobile-next-sprint-qa/03-medico-paciente.png`
- `/tmp/predia-mobile-next-sprint-qa/04-medico-historial.png`
- `/tmp/predia-mobile-next-sprint-qa/05-enfermeria-inicio.png`
- `/tmp/predia-mobile-next-sprint-qa/06-enfermeria-paciente.png`
- `/tmp/predia-mobile-next-sprint-qa/07-paciente-inicio.png`
- `/tmp/predia-mobile-next-sprint-qa/08-paciente-indicadores.png`
- `/tmp/predia-mobile-next-sprint-qa/09-paciente-recetas.png`
- `/tmp/predia-mobile-next-sprint-qa/10-paciente-recomendaciones.png`

## 5. Pendientes y restricciones

- No habia dispositivo fisico ni AVD disponible en este entorno; `adb devices` y `emulator -list-avds` no devolvieron dispositivos. La validacion nativa Android/iOS queda pendiente para un equipo con emulador o telefono.
- Los warnings `shadow*` y `pointerEvents` vienen de React Native Web/dependencias y no bloquearon navegacion, datos ni render.
- Funciones sensibles a hardware nativo, como biometria real, camara/audio en dispositivo y notificaciones push, deben validarse en build nativa.

## 6. Estado final

Estado final movil: funcional para demo academica en Expo Web, conectado a API local y base MySQL real, con flujos separados para Medico, Enfermero y Paciente, alertas clinicas accionables, ficha clinica consolidada, historial, indicadores, recetas y recomendaciones navegables sin errores criticos.
