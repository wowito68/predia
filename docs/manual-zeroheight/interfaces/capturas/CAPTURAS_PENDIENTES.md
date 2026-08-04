# Capturas pendientes

El entorno inspeccionado contiene Expo Web y scripts CDP, pero la sesión documental no pudo abrir los puertos locales 3002/8082 por restricción del sandbox (`listen EPERM`). No se generaron imágenes ficticias ni se reutilizaron capturas de otros informes.

Usar datos exclusivamente demo y censurar cualquier dato que no pertenezca al seed. Viewport recomendado: **390 x 844 px**, escala 2.

| Archivo requerido | Interfaz | Pasos para llegar | Estado requerido |
|---|---|---|---|
| `01-login.png` | Acceso | Abrir la app sin sesión | Personal clínico seleccionado; campos vacíos |
| `02-sesion-bloqueada.png` | Acceso bloqueado | Restaurar una sesión guardada en dispositivo | Solicitud de biometría visible |
| `03-inicio-clinico.png` | Inicio clínico | Entrar con cuenta médica demo | Datos cargados, distribución y prioridad visibles |
| `04-agenda-clinica.png` | Agenda | Tab Agenda | Lista con al menos una fecha y una cita demo |
| `05-pacientes.png` | Directorio | Tab Pacientes | Lista cargada, filtro Todos |
| `06-paciente-detalle.png` | Resumen clínico | Abrir primer paciente demo | Perfil, acciones e indicadores visibles |
| `07-alertas.png` | Alertas clínicas | Tab Alertas | Filtro Todas y datos cargados |
| `08-perfil-clinico.png` | Perfil | Tab Perfil | Cuenta demo, sin diálogo abierto |
| `09-signos-vitales.png` | Signos vitales | Detalle > Nueva medición | Formulario vacío con paciente identificado |
| `10-dictado-notas.png` | Dictado | Detalle > Nueva consulta | Micrófono detenido, transcripción vacía |
| `11-camara-clinica.png` | Cámara | Abrir ruta Cámara desde paciente | Permiso concedido y visor activo; requiere dispositivo/simulador |
| `12-validacion-ia.png` | Validación IA | Detalle > Validar o cola de IA | Predicción demo pendiente visible |
| `13-firma-receta.png` | Firma | Detalle > Nueva receta | Formulario de medicamento vacío |
| `14-historial-clinico.png` | Historial | Detalle > Ver historial | Timeline demo cargado |
| `15-inicio-paciente.png` | Inicio paciente | Entrar con cuenta paciente demo | Riesgo, glucosa y recordatorios cargados |
| `16-indicadores.png` | Indicadores | Tab Indicadores | Tarjetas y sparklines con datos demo |
| `17-recetas-paciente.png` | Recetas | Tab Recetas | Receta demo expandida/visible |
| `18-recomendaciones.png` | Consejos | Tab Consejos | Recomendaciones y validación visibles |
| `19-citas-paciente.png` | Citas | Inicio > Próxima cita | Próxima cita e historial visibles |
| `20-expediente-paciente.png` | Expediente | Inicio > Expediente | Tab Consultas seleccionado |
| `21-automonitoreo.png` | Automonitoreo | Inicio > Registrar | Inputs vacíos y últimos valores visibles |
| `22-tendencias.png` | Tendencias | Indicadores > Ver tendencias | Periodo 30 días y gráficas cargadas |
| `23-resultados-riesgo.png` | Resultados | Inicio > Entender mi resultado | Última evaluación demo visible |

## Procedimiento recomendado

```bash
docker compose up -d db
PORT=3002 pnpm --filter @predia/web dev
npm --prefix apps/mobile run web -- --port 8082
```

Después, usar el runner CDP existente o capturar manualmente desde Expo Go. Las credenciales de prueba deben consultarse en el seed local y **no deben escribirse en este manual**.
