# Funciones y objetivos por interfaz

Este documento describe únicamente comportamientos presentes en `apps/mobile/src` al momento del inventario.

## Acceso

### Objetivo
Autenticar al usuario y dirigirlo al navegador correspondiente a su rol.

### Funciones
- Login de paciente con CURP/PIN y de personal con usuario/contraseña.
- Validación de campos requeridos, normalización de CURP y manejo de error de API.
- Persistencia segura; biometría en dispositivo y restauración web.
- Estado de envío y sesión bloqueada.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Selector de rol | `Pressable` segmentado | Alternar credenciales | `onPress` / `setRole` |
| Credenciales | `TextInput` | Capturar identidad y secreto | `onChangeText` |
| Ingresar | `Pressable` | Ejecutar autenticación | `handleLogin` |
| Biometría | `Pressable` | Desbloquear sesión guardada | `handleBiometric` |

## Inicio clínico

### Objetivo
Concentrar prioridades operativas y accesos frecuentes del personal clínico.

### Funciones
- Consulta paralela de agenda, predicciones, pacientes y alertas con React Query.
- Métricas y distribución real de riesgo; refresh manual.
- Navegación contextual a alertas, agenda, pacientes y expedientes.
- Skeletons y estados vacíos; oculta acciones médicas para enfermería.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| CTA de jornada | `Pressable` | Abrir prioridad actual | `navigate(mainTarget)` |
| Accesos rápidos | `Shortcut` | Abrir módulos | `onPress` |
| Alertas | Lista agrupada | Abrir paciente | `goPatient` |
| Pull to refresh | `RefreshControl` | Recargar queries | `refetchAll` |

## Agenda clínica

### Objetivo
Consultar próximas citas agrupadas cronológicamente.

### Funciones
- Lectura de `/agenda`, agrupación por Hoy/Mañana/fecha y orden del backend.
- Apertura del resumen del paciente.
- Refresh, loading, error y agenda vacía.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Agenda | `SectionList` | Renderizar citas por día | `renderItem` |
| Cita | `Pressable` | Abrir paciente | `navigate('PacienteDetalle')` |
| Actualizar | Pull to refresh | Volver a consultar | `q.refetch` |

## Directorio de pacientes

### Objetivo
Buscar y filtrar pacientes con acceso rápido al expediente.

### Funciones
- Búsqueda con debounce de 350 ms y paginación infinita.
- Filtros Todos, Alto riesgo y Recientes.
- Refresco, carga incremental, cero resultados y error.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Buscar | `TextInput` | Actualizar consulta | `setQ` |
| Limpiar | Botón icono | Vaciar consulta | `setQ('')` |
| Filtros | `Pressable` chips | Filtrar localmente | `setFiltro` |
| Paciente | `Pressable` | Abrir detalle | `navigate('PacienteDetalle')` |

## Alertas clínicas

### Objetivo
Gestionar visualmente una cola clínica por prioridad.

### Funciones
- Obtención de alertas y cálculo de críticas.
- Filtro local Todas/Crítica/Alta/Media.
- Apertura del paciente y refresh.
- Skeletons, error y filtro vacío.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Filtro | `Pressable` | Cambiar prioridad | `setFilter` |
| Tarjeta | `Pressable` | Abrir paciente | `navigate('PacienteDetalle')` |
| Lista | `FlatList` | Virtualizar alertas | `renderItem` |

## Perfil clínico

### Objetivo
Mostrar información de cuenta y controles de sesión.

### Funciones
- Lectura de usuario desde Zustand.
- Diálogos informativos sobre notificaciones, seguridad y aplicación.
- Confirmación y cierre de sesión.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Opciones | `TouchableOpacity` | Mostrar información | `Alert.alert` |
| Cerrar sesión | `TouchableOpacity` | Confirmar salida | `confirmLogout` |

## Resumen clínico del paciente

### Objetivo
Dar al profesional una vista accionable del estado clínico del paciente.

### Funciones
- Lectura de snapshot clínico con riesgo, alertas, signos, tratamiento y timeline.
- Contacto por teléfono/WhatsApp con validación de número.
- Navegación por rol a signos, nota, receta, historial y validación IA.
- Refresh, skeletons, error y datos ausentes.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Contacto | `Pressable` | Abrir `tel:` o WhatsApp | `Linking.openURL` |
| Acciones clínicas | `QuickAction` | Abrir captura clínica | `navigate` |
| Validar riesgo | `PrimaryButton` | Abrir validación | `navigate('ValidacionIA')` |
| Timeline | Lista visual | Mostrar eventos | Render de `data.timeline` |

## Signos vitales

### Objetivo
Registrar mediciones antropométricas y vitales en el expediente.

### Funciones
- Captura numérica, conversión y validación positiva.
- Exige paciente y al menos una medición.
- POST de mediciones e invalidación de snapshot/expediente.
- Éxito, error y estado de envío.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Medición | `TextInput` | Capturar valor | `onChangeText` |
| Guardar | `PrimaryButton` | Validar y enviar | `guardar` |
| Volver | Botón de header | Regresar | `nav.goBack` |

## Dictado de notas

### Objetivo
Convertir audio en una nota clínica persistente.

### Funciones
- Solicitud de micrófono y grabación con Expo Audio.
- Transcripción multipart, edición y creación de consulta.
- Validación de paciente/transcripción, invalidación de cache y errores.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Grabador | `TouchableOpacity` | Iniciar/detener audio | `iniciar` / `detener` |
| Transcripción | `TextInput` | Revisar nota | `setTexto` |
| Guardar | `PrimaryButton` | Persistir consulta | `guardarNota.mutate` |

## Cámara clínica

### Objetivo
Adjuntar evidencia fotográfica al expediente.

### Funciones
- Verificación/solicitud de permiso de cámara.
- Captura, armado de `FormData` y subida.
- Validación de paciente, éxito, error y estado pendiente.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Visor | `CameraView` | Mostrar cámara | Permiso concedido |
| Permiso | `TouchableOpacity` | Solicitar acceso | `requestPermission` |
| Disparador | `TouchableOpacity` | Capturar y subir | `tomar` |

## Validación de IA

### Objetivo
Permitir al médico registrar su decisión sobre una predicción.

### Funciones
- Consulta de predicciones y filtro de no validadas.
- Confirmación o descarte con observaciones.
- Mutación, invalidación de cache, éxito, error y cola vacía.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Observación | `TextInput` | Capturar nota | `setObs` |
| Confirmar | `TouchableOpacity` | Validar diagnóstico | `decidir(..., true)` |
| Descartar | `TouchableOpacity` | Rechazar predicción | `decidir(..., false)` |

## Firma y emisión de receta

### Objetivo
Crear una receta y confirmar su emisión mediante biometría o modo demo explícito.

### Funciones
- Agregar y eliminar medicamentos con dosis/frecuencia/duración.
- Validar paciente, medicamento y lista no vacía.
- Autenticación biométrica; fallback confirmado cuando no hay hardware.
- POST, loading, éxito y error.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Campos | `TextInput` | Construir medicamento | `setDraft` |
| Agregar/quitar | `TouchableOpacity` | Gestionar lista | `addMed` / `filter` |
| Firmar | `PrimaryButton` | Autenticar y emitir | `firmar` |

## Historial clínico

### Objetivo
Presentar el timeline clínico completo del paciente.

### Funciones
- Consulta de snapshot y render cronológico.
- Refresh y navegación de regreso.
- Loading, error y timeline vacío.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Timeline | `FlatList` | Mostrar eventos | `renderItem` |
| Actualizar | Pull to refresh | Recargar snapshot | `q.refetch` |

## Inicio del paciente

### Objetivo
Resumir el estado de salud y orientar las siguientes acciones del paciente.

### Funciones
- Queries de dashboard, predicción y recetas.
- Anillo de riesgo, curva de glucosa y recordatorios derivados.
- Navegación a siete módulos, refresh y cierre de sesión.
- Skeletons, error, sin datos y todo al día.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Resultado | `Pressable` | Abrir explicación | `navigate('Resultados')` |
| Glucosa | `Sparkline`/`Pressable` | Abrir tendencias | `navigate('Tendencias')` |
| Recordatorio | `ReminderRow` | Abrir módulo | Acción derivada |
| Salir | Botón icono | Cerrar sesión | `confirmLogout` |

## Indicadores del paciente

### Objetivo
Mostrar última medición y dirección de cambio por indicador.

### Funciones
- Lectura de 90 días y cálculo local de última medición/tendencia.
- Sparkline de hasta 12 valores y cobertura 0-100%.
- Navegación a captura y tendencias; refresh y errores.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Indicador | `PremiumCard` | Mostrar valor/tendencia | Render calculado |
| Registrar | `PrimaryButton` | Abrir automonitoreo | `navigate('Automonitoreo')` |
| Tendencias | `PrimaryButton` | Abrir gráficas | `navigate('Tendencias')` |

## Recetas del paciente

### Objetivo
Consultar tratamiento prescrito e instrucciones.

### Funciones
- Lectura de recetas del paciente.
- Normalización de medicamentos cuando llegan como JSON o arreglo.
- Refresh, loading, error y lista vacía.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Receta | Tarjeta | Mostrar estado y médico | Render de query |
| Medicamento | Fila | Mostrar dosis y frecuencia | Render normalizado |

## Recomendaciones

### Objetivo
Presentar recomendaciones y factores asociados a la evaluación de riesgo.

### Funciones
- Lectura de la última predicción y parseo de arreglos/string.
- Diferencia visual entre validada y pendiente.
- Accesos a citas, registro y resultados; estados de query.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Recomendación | Fila | Mostrar acción sugerida | Render |
| Accesos | `ActionRow` | Abrir módulo | `navigate` |

## Citas del paciente

### Objetivo
Consultar próxima cita e historial de consultas.

### Funciones
- Lectura y separación de próxima cita/historial.
- Confirmar y cancelar muestran alertas locales.
- Loading, error y ausencia de registros.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Confirmar | `TouchableOpacity` | Mostrar confirmación local | `Alert.alert` |
| Cancelar | `TouchableOpacity` | Solicitar confirmación local | `Alert.alert` |
| Historial | Tarjetas | Mostrar fecha/médico | Render de query |

## Expediente del paciente

### Objetivo
Permitir al paciente consultar su expediente sin edición.

### Funciones
- Lectura de expediente y selección local de consultas/alergias/patologías.
- Refresh, loading, error y secciones vacías.
- No se encontraron mutaciones en esta pantalla.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Tabs | `TouchableOpacity` | Cambiar categoría | `setTab` |
| Contenido | Lista/tarjetas | Mostrar registros | Render por tab |

## Automonitoreo

### Objetivo
Registrar mediciones domiciliarias del paciente.

### Funciones
- Lectura de últimos 30 días y escritura de glucosa, peso o presión.
- Valida campo, número positivo y formato sistólica/diastólica.
- Invalida dashboard, automonitoreo e indicadores tras guardar.
- Éxito, error y mutación pendiente.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Valor | `TextInput` | Capturar medición | `setValues` |
| Registrar | `TouchableOpacity` | Validar y enviar | `registrar` |

## Tendencias

### Objetivo
Visualizar la evolución de mediciones en distintos periodos.

### Funciones
- Query dependiente de 7/30/90 días.
- Orden cronológico, mínimo, promedio y máximo.
- Curvas SVG, referencia de glucosa y doble serie de presión.
- Refresh, error, sin datos y un solo punto.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Periodo | `Pressable` segmentado | Cambiar ventana | `setPeriod` |
| Gráfica | `TrendChart` SVG | Mostrar evolución | Render de datos |
| Volver | Header | Regresar | `navigation.goBack` |

## Resultados de riesgo

### Objetivo
Explicar al paciente el resultado de la predicción de diabetes.

### Funciones
- Lectura de última predicción e histórico.
- Presentación de nivel, probabilidades, recomendaciones y validación.
- Refresh, loading, error y sin predicción.

### Elementos

| Elemento | Tipo de componente | Función | Evento asociado |
|---|---|---|---|
| Indicador | Gauge visual | Comunicar nivel | Render de probabilidad |
| Recomendaciones | Texto/lista | Explicar acciones | Render normalizado |
| Volver | Header | Regresar | Navegación Stack |
