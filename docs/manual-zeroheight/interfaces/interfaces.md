# Inventario de interfaces móviles

Se identificaron **22 pantallas** registradas o alcanzables mediante React Navigation. Las rutas son nombres internos del Stack/Tab; no implican una URL nativa.

## Acceso

- Archivo: `apps/mobile/src/screens/LoginScreen.tsx`
- Ruta de navegación: `Root/Login`
- Componente principal: `LoginScreen`
- Propósito: autenticar pacientes por CURP/PIN o personal clínico por usuario/contraseña.
- Componentes visuales: marca, selector de rol, campos, botón principal, acceso biométrico.
- Acciones disponibles: cambiar rol, iniciar sesión, desbloquear sesión almacenada y usar otra cuenta.
- Pantallas de origen: arranque sin sesión o cierre automático/manual.
- Pantallas de destino: navegadores `Paciente`, `Medico` o `Enfermero` según rol.
- Estados especiales: carga, campos incompletos, error de autenticación, sesión bloqueada y biometría no disponible.

## Inicio clínico

- Archivo: `apps/mobile/src/screens/medico/HomeScreen.tsx`
- Ruta de navegación: `Medico/Tabs/Inicio` y `Enfermero/Tabs/Inicio`
- Componente principal: `HomeScreen`
- Propósito: priorizar jornada, alertas, agenda y cartera de riesgo.
- Componentes visuales: hero operativo, métricas, accesos rápidos, distribución de riesgo, listas prioritarias.
- Acciones disponibles: refrescar; abrir Pacientes, Agenda, Alertas y expedientes.
- Pantallas de origen: acceso clínico y tab bar.
- Pantallas de destino: `Agenda`, `Pacientes`, `Alertas`, `PacienteDetalle`.
- Estados especiales: skeletons, agenda vacía, sin alertas y diferencias por rol enfermero.

## Agenda clínica

- Archivo: `apps/mobile/src/screens/medico/AgendaScreen.tsx`
- Ruta de navegación: `Medico/Tabs/Agenda` y `Enfermero/Tabs/Agenda`
- Componente principal: `AgendaScreen`
- Propósito: consultar citas futuras agrupadas por día.
- Componentes visuales: encabezado, `SectionList`, hora, avatar y motivo.
- Acciones disponibles: refrescar y abrir el resumen del paciente.
- Pantallas de origen: Home y tab bar.
- Pantallas de destino: `PacienteDetalle`.
- Estados especiales: loading, error de red y agenda vacía.

## Directorio de pacientes

- Archivo: `apps/mobile/src/screens/medico/PacientesScreen.tsx`
- Ruta de navegación: `Medico/Tabs/Pacientes` y `Enfermero/Tabs/Pacientes`
- Componente principal: `PacientesScreen`
- Propósito: localizar pacientes y consultar riesgo/última consulta.
- Componentes visuales: búsqueda, filtros, lista virtualizada, avatar y nivel de riesgo.
- Acciones disponibles: buscar con debounce, limpiar búsqueda, filtrar, paginar, refrescar y abrir paciente.
- Pantallas de origen: Home y tab bar.
- Pantallas de destino: `PacienteDetalle`.
- Estados especiales: carga inicial, siguiente página, error y cero resultados.

## Alertas clínicas

- Archivo: `apps/mobile/src/screens/medico/AlertasScreen.tsx`
- Ruta de navegación: `Medico/Tabs/Alertas` y `Enfermero/Tabs/Alertas`
- Componente principal: `AlertasScreen`
- Propósito: revisar alertas priorizadas y acciones sugeridas.
- Componentes visuales: filtros de prioridad, tarjetas, badges y razón clínica.
- Acciones disponibles: filtrar, refrescar y abrir paciente.
- Pantallas de origen: Home y tab bar.
- Pantallas de destino: `PacienteDetalle`.
- Estados especiales: carga, error y ausencia de alertas para el filtro.

## Perfil clínico

- Archivo: `apps/mobile/src/screens/medico/PerfilScreen.tsx`
- Ruta de navegación: `Medico/Tabs/Perfil` y `Enfermero/Tabs/Perfil`
- Componente principal: `PerfilScreen`
- Propósito: mostrar identidad del usuario, información de seguridad y cierre de sesión.
- Componentes visuales: avatar, rol, correo, filas de opción y botón de salida.
- Acciones disponibles: consultar alertas informativas y cerrar sesión con confirmación.
- Pantallas de origen: tab bar clínico.
- Pantallas de destino: `Root/Login` después de cerrar sesión.
- Estados especiales: diálogos nativos de información y confirmación.

## Resumen clínico del paciente

- Archivo: `apps/mobile/src/screens/medico/PacienteDetalleScreen.tsx`
- Ruta de navegación: `Medico/PacienteDetalle` y `Enfermero/PacienteDetalle`
- Componente principal: `PacienteDetalleScreen`
- Propósito: centralizar identidad, alertas, indicadores, riesgo, tratamiento y timeline.
- Componentes visuales: cabecera clínica, contacto, acciones, vitales, alertas, riesgo y línea de tiempo.
- Acciones disponibles: llamar, abrir WhatsApp, registrar signos, dictar consulta, emitir receta, ver historial y validar IA.
- Pantallas de origen: Home, Agenda, Pacientes y Alertas.
- Pantallas de destino: `SignosVitales`, `DictadoNotas`, `Firma`, `HistorialClinico`, `ValidacionIA` y apps externas.
- Estados especiales: skeletons, error de snapshot, ausencia de evaluación o timeline.

## Signos vitales

- Archivo: `apps/mobile/src/screens/medico/SignosVitalesScreen.tsx`
- Ruta de navegación: `Medico/SignosVitales` y `Enfermero/SignosVitales`
- Componente principal: `SignosVitalesScreen`
- Propósito: registrar peso, talla, presión, glucosa y temperatura.
- Componentes visuales: campos numéricos con unidades y botón Guardar.
- Acciones disponibles: validar, guardar e invalidar cache clínica.
- Pantallas de origen: `PacienteDetalle`.
- Pantallas de destino: regreso a `PacienteDetalle`.
- Estados especiales: sin paciente, sin datos, valor inválido, envío y error.

## Dictado de notas

- Archivo: `apps/mobile/src/screens/medico/DictadoNotasScreen.tsx`
- Ruta de navegación: `Medico/DictadoNotas`
- Componente principal: `DictadoNotasScreen`
- Propósito: grabar, transcribir y guardar una nota como consulta clínica.
- Componentes visuales: control de grabación, estado, transcripción editable y botón Guardar.
- Acciones disponibles: solicitar micrófono, grabar, detener, transcribir y persistir.
- Pantallas de origen: `PacienteDetalle` médico.
- Pantallas de destino: regreso al detalle.
- Estados especiales: permiso denegado, grabando, procesando, transcripción vacía y error.

## Cámara clínica

- Archivo: `apps/mobile/src/screens/medico/CamaraClinicaScreen.tsx`
- Ruta de navegación: `Medico/CamaraClinica`
- Componente principal: `CamaraClinicaScreen`
- Propósito: capturar y adjuntar una fotografía al expediente.
- Componentes visuales: visor de cámara, guía de encuadre y disparador.
- Acciones disponibles: solicitar permiso, capturar y subir imagen.
- Pantallas de origen: ruta clínica con `idPaciente`.
- Pantallas de destino: regreso al expediente.
- Estados especiales: permiso pendiente/denegado, subida, sin paciente y error.

## Validación de IA

- Archivo: `apps/mobile/src/screens/medico/ValidacionIAScreen.tsx`
- Ruta de navegación: `Medico/ValidacionIA`
- Componente principal: `ValidacionIAScreen`
- Propósito: confirmar o descartar predicciones pendientes.
- Componentes visuales: paciente, riesgo, factores, observaciones y acciones.
- Acciones disponibles: confirmar diagnóstico o descartar predicción.
- Pantallas de origen: `PacienteDetalle`; también se referencia desde Home mediante Alertas.
- Pantallas de destino: permanece en la cola actualizada.
- Estados especiales: loading, mutación, error y cola vacía.

## Firma y emisión de receta

- Archivo: `apps/mobile/src/screens/medico/FirmaScreen.tsx`
- Ruta de navegación: `Medico/Firma`
- Componente principal: `FirmaScreen`
- Propósito: construir, firmar y registrar una receta estructurada.
- Componentes visuales: lista de medicamentos, formulario, instrucciones y botón biométrico.
- Acciones disponibles: agregar/quitar medicamentos, firmar y emitir.
- Pantallas de origen: `PacienteDetalle` médico.
- Pantallas de destino: regreso al detalle.
- Estados especiales: medicamento incompleto, lista vacía, biometría disponible o confirmación de demo, envío y error.

## Historial clínico

- Archivo: `apps/mobile/src/screens/medico/HistorialClinicoScreen.tsx`
- Ruta de navegación: `Medico/HistorialClinico` y `Enfermero/HistorialClinico`
- Componente principal: `HistorialClinicoScreen`
- Propósito: presentar eventos clínicos cronológicos del paciente.
- Componentes visuales: timeline con tipo, fecha, título y detalle.
- Acciones disponibles: refrescar y volver.
- Pantallas de origen: `PacienteDetalle`.
- Pantallas de destino: regreso al detalle.
- Estados especiales: carga, error y timeline vacío.

## Inicio del paciente

- Archivo: `apps/mobile/src/screens/paciente/DashboardScreen.tsx`
- Ruta de navegación: `Paciente/Tabs/Inicio`
- Componente principal: `DashboardScreen`
- Propósito: resumir riesgo, glucosa, próximas acciones y recordatorios personales.
- Componentes visuales: anillo de riesgo, sparkline, recordatorios, resumen y accesos.
- Acciones disponibles: refrescar, cerrar sesión y navegar a resultados, citas, recetas, tendencias, indicadores, expediente o registro.
- Pantallas de origen: autenticación paciente y tab bar.
- Pantallas de destino: `Resultados`, `Citas`, `Recetas`, `Tendencias`, `Indicadores`, `Expediente`, `Automonitoreo`.
- Estados especiales: skeletons, error, sin glucosa y sin recordatorios.

## Indicadores del paciente

- Archivo: `apps/mobile/src/screens/paciente/IndicadoresScreen.tsx`
- Ruta de navegación: `Paciente/Tabs/Indicadores`
- Componente principal: `IndicadoresScreen`
- Propósito: mostrar últimas mediciones y tendencia de glucosa, peso y presión.
- Componentes visuales: cobertura, tarjetas con sparkline, valor, unidad y tendencia.
- Acciones disponibles: refrescar, registrar medición y abrir tendencias.
- Pantallas de origen: tab bar y Dashboard.
- Pantallas de destino: `Automonitoreo`, `Tendencias`.
- Estados especiales: carga, error y ausencia de mediciones.

## Recetas del paciente

- Archivo: `apps/mobile/src/screens/paciente/RecetasScreen.tsx`
- Ruta de navegación: `Paciente/Tabs/Recetas`
- Componente principal: `RecetasScreen`
- Propósito: consultar recetas, medicamentos e instrucciones.
- Componentes visuales: tarjetas de receta, estado, médico y lista de medicamentos.
- Acciones disponibles: refrescar y consultar contenido.
- Pantallas de origen: tab bar y Dashboard.
- Pantallas de destino: ninguna ruta adicional confirmada.
- Estados especiales: loading, error y sin recetas.

## Recomendaciones

- Archivo: `apps/mobile/src/screens/paciente/RecomendacionesScreen.tsx`
- Ruta de navegación: `Paciente/Tabs/Recomendaciones` (etiqueta visible `Consejos`)
- Componente principal: `RecomendacionesScreen`
- Propósito: traducir la evaluación de riesgo en acciones y factores comprensibles.
- Componentes visuales: recomendaciones, factores, validación y accesos.
- Acciones disponibles: abrir citas, automonitoreo y explicación de resultados.
- Pantallas de origen: tab bar paciente.
- Pantallas de destino: `Citas`, `Automonitoreo`, `Resultados`.
- Estados especiales: loading, error y ausencia de predicción.

## Citas del paciente

- Archivo: `apps/mobile/src/screens/paciente/CitasScreen.tsx`
- Ruta de navegación: `Paciente/Citas`
- Componente principal: `CitasScreen`
- Propósito: mostrar próxima cita e historial.
- Componentes visuales: tarjeta de próxima cita, botones y lista histórica.
- Acciones disponibles: confirmar o solicitar cancelación mediante alertas locales.
- Pantallas de origen: Dashboard y Recomendaciones.
- Pantallas de destino: regreso mediante Stack.
- Estados especiales: loading, error, sin cita futura y sin historial.

> La confirmación/cancelación no llama a un endpoint en el código inspeccionado; actualmente solo muestra `Alert.alert`.

## Expediente del paciente

- Archivo: `apps/mobile/src/screens/paciente/ExpedienteScreen.tsx`
- Ruta de navegación: `Paciente/Expediente`
- Componente principal: `ExpedienteScreen`
- Propósito: consulta de solo lectura de información clínica propia.
- Componentes visuales: identidad, tabs de consultas/alergias/patologías y listas.
- Acciones disponibles: cambiar sección y refrescar.
- Pantallas de origen: Dashboard.
- Pantallas de destino: regreso mediante Stack.
- Estados especiales: loading, error y secciones vacías.

## Automonitoreo

- Archivo: `apps/mobile/src/screens/paciente/AutomonitoreoScreen.tsx`
- Ruta de navegación: `Paciente/Automonitoreo`
- Componente principal: `AutomonitoreoScreen`
- Propósito: capturar glucosa, peso o presión desde casa.
- Componentes visuales: fecha, filas por indicador, último valor, input y registrar.
- Acciones disponibles: validar formato, guardar e invalidar consultas relacionadas.
- Pantallas de origen: Dashboard, Indicadores y Recomendaciones.
- Pantallas de destino: permanece en la pantalla actualizada.
- Estados especiales: campo vacío, formato/valor inválido, envío, éxito y error.

## Tendencias

- Archivo: `apps/mobile/src/screens/paciente/TendenciasScreen.tsx`
- Ruta de navegación: `Paciente/Tendencias`
- Componente principal: `TendenciasScreen`
- Propósito: comparar la evolución temporal de glucosa, peso y presión.
- Componentes visuales: selector 7/30/90 días, gráficas SVG y estadísticas.
- Acciones disponibles: cambiar periodo, refrescar y volver.
- Pantallas de origen: Dashboard e Indicadores.
- Pantallas de destino: regreso mediante Stack.
- Estados especiales: loading, error, periodo sin datos y serie con un solo punto.

## Resultados de riesgo

- Archivo: `apps/mobile/src/screens/paciente/ResultadosScreen.tsx`
- Ruta de navegación: `Paciente/Resultados`
- Componente principal: `ResultadosScreen`
- Propósito: explicar la última predicción y su validación clínica.
- Componentes visuales: indicador de riesgo, nivel, explicación, recomendaciones y disclaimer.
- Acciones disponibles: refrescar y volver.
- Pantallas de origen: Dashboard y Recomendaciones.
- Pantallas de destino: regreso mediante Stack.
- Estados especiales: loading, error y sin predicción.

## Mapa de navegación resumido

```text
Login
├── Paciente/Tabs: Inicio · Indicadores · Recetas · Consejos
│   └── Stack: Citas · Expediente · Automonitoreo · Tendencias · Resultados
├── Medico/Tabs: Inicio · Agenda · Pacientes · Alertas · Perfil
│   └── Stack: PacienteDetalle · SignosVitales · DictadoNotas · CamaraClinica
│              ValidacionIA · Firma · HistorialClinico
└── Enfermero/Tabs: Inicio · Agenda · Pacientes · Alertas · Perfil
    └── Stack: PacienteDetalle · SignosVitales · HistorialClinico
```
