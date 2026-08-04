# Iconografía

## Sistema utilizado

La interfaz utiliza una sola fuente de iconos: **Feather**, expuesta por `@expo/vector-icons`. El componente de compatibilidad `src/components/icons.tsx` conserva nombres heredados de Ionicons y los traduce a Feather. No se encontraron SVG locales de iconos.

| Icono | Biblioteca o archivo | Nombre técnico | Tamaño habitual | Color | Función | Interfaz donde aparece |
|---|---|---|---:|---|---|---|
| Inicio | Feather | `home` | 21 px | `accent`/`textMuted` | Abrir inicio | Tabs de todos los roles |
| Agenda | Feather | `calendar` | 18-21 px | `info`, `accent` | Agenda y próxima cita | Home, Agenda, Dashboard paciente |
| Pacientes | Feather | `users` | 21 px | `accent`/`textMuted` | Abrir directorio | Tabs clínicos |
| Alertas | Feather | `alert-circle`, `alert-triangle` | 16-21 px | `error`, `warning` | Prioridad clínica | Home y Alertas |
| Perfil | Feather | `user` | 18-21 px | Semántico | Perfil y paciente | Tabs, Perfil, indicadores |
| Buscar | Feather | `search` | 18-19 px | `textMuted`, `accent` | Buscar pacientes | Home y Pacientes |
| Cerrar búsqueda | Feather | `x-circle` | 18 px | `textMuted` | Limpiar consulta | Pacientes |
| Volver | Feather | `chevron-left` | 22 px | `textPrimary` | Regresar en Stack | Encabezados secundarios |
| Abrir detalle | Feather | `chevron-right` | 16-18 px | `textMuted` | Navegar a detalle | Listas y filas de acción |
| Acción externa | Feather | `arrow-up-right` | 14-18 px | Blanco o `accent` | Abrir acción relacionada | Home y Dashboard paciente |
| Actividad | Feather | `activity` | 16-21 px | `accent`, `indigo` | Signos, IA y monitoreo | Home, Indicadores, detalle |
| Gráficas | Feather | `bar-chart-2` | 19-21 px | `accent` | Indicadores y tendencias | Tabs paciente, Dashboard |
| Riesgo protegido | Feather | `shield` | 16-24 px | `primary`, estado | Seguridad y evaluación | Login, Resultados, estados vacíos |
| Documento | Feather | `file-text` | 17-21 px | Semántico | Receta o expediente | Paciente y detalle clínico |
| Carpeta | Feather | `folder` | 20 px | `indigo` | Abrir expediente | Dashboard paciente |
| Añadir | Feather | `plus`, `plus-circle` | 17-20 px | `coral`, `primary` | Registrar dato | Indicadores y Dashboard |
| Micrófono | Feather | `mic` | 21 px | `info` | Dictar nota | Detalle y Dictado |
| Cámara | Expo Camera + Feather | `camera` o control visual | Variable | Blanco | Capturar imagen clínica | Cámara clínica |
| Teléfono | Feather | `phone` | 17 px | `primary` | Llamar al paciente | Detalle clínico |
| Mensaje | Feather | `message-circle` | 17 px | `success` | Abrir WhatsApp | Detalle clínico |
| Corazón | Feather | `heart` | 16-21 px | `coral` | Presión y consejos | Indicadores, Recomendaciones |
| Gota | Feather | `droplet` | 16-20 px | `accent` | Glucosa | Indicadores y tendencias |
| Tendencia | Feather | `trending-up`, `trending-down`, `minus` | 15 px | Estado | Comparar mediciones | Indicadores |
| Información | Feather | `info` | 17-18 px | `infoText` | Nota clínica | Indicadores y Tendencias |
| Correcto | Feather | `check`, `check-circle` | 18-22 px | `success` | Estado completo | Dashboard y vacíos |
| Salir | Feather | `log-out` | 19 px | `error` | Cerrar sesión | Perfil y Dashboard paciente |
| Biometría | Feather | `shield` (alias `finger-print`) | 16-18 px | Contextual | Desbloquear o firmar | Login y Firma |

## Archivos locales copiados

| Archivo | Dimensiones | Uso confirmado |
|---|---:|---|
| `android-icon-background.png` | 512 x 512 | Fondo adaptativo Android |
| `android-icon-foreground.png` | 512 x 512 | Frente adaptativo Android |
| `android-icon-monochrome.png` | 432 x 432 | Máscara monocromática Android |
| `favicon.png` | 48 x 48 | Favicon web de Expo |
| `icon.png` | 1024 x 1024 | Icono general de la aplicación |
| `splash-icon.png` | 1024 x 1024 | Imagen de splash |

Los archivos se encuentran en [`archivos/`](archivos/). Los iconos de Feather no se descargaron ni duplicaron.
