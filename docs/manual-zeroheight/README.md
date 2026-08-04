# Manual de interfaces para zeroheight

**Proyecto:** PREDIA Mobile  
**Descripción:** aplicación clínica y de autogestión para seguimiento de riesgo de diabetes, expedientes, alertas, mediciones, recetas y atención en movilidad.  
**Fecha de generación:** 4 de julio de 2026.

## Tecnología inspeccionada

- React Native 0.81 y React 19.
- Expo SDK 54 con Expo Go/Web.
- TypeScript.
- React Navigation: Native Stack y Bottom Tabs.
- TanStack React Query para lectura, mutación y cache.
- Zustand para autenticación y sesión.
- Inter mediante `@expo-google-fonts/inter`.
- Feather mediante `@expo/vector-icons`.
- `react-native-svg` para anillos, sparklines y gráficas.
- Expo Camera, Audio, Secure Store, Local Authentication y Speech.

## Contenido del paquete

| Recurso | Ubicación | Contenido |
|---|---|---|
| Marca | [`logo/`](logo/) | Icono principal, isotipo y disponibilidad de variantes |
| Paleta | [`paleta-colores/colores.md`](paleta-colores/colores.md) | Tokens claro/oscuro, muestras, usos e inconsistencias |
| Tokens JSON | [`paleta-colores/colores.json`](paleta-colores/colores.json) | Paleta estructurada para consulta/importación |
| Tipografía | [`tipografia/tipografia.md`](tipografia/tipografia.md) | Escala Inter y excepciones |
| Iconografía | [`iconografia/iconos.md`](iconografia/iconos.md) | Feather, aliases y archivos locales |
| Interfaces | [`interfaces/interfaces.md`](interfaces/interfaces.md) | Inventario de 22 pantallas y navegación |
| Capturas | [`interfaces/capturas/`](interfaces/capturas/) | Guion de capturas pendientes |
| Funciones | [`funciones/funciones-interfaces.md`](funciones/funciones-interfaces.md) | Objetivos, validaciones, estados y eventos confirmados |

## Interfaces identificadas

1. Acceso.
2. Inicio clínico.
3. Agenda clínica.
4. Directorio de pacientes.
5. Alertas clínicas.
6. Perfil clínico.
7. Resumen clínico del paciente.
8. Signos vitales.
9. Dictado de notas.
10. Cámara clínica.
11. Validación de IA.
12. Firma y emisión de receta.
13. Historial clínico.
14. Inicio del paciente.
15. Indicadores del paciente.
16. Recetas del paciente.
17. Recomendaciones.
18. Citas del paciente.
19. Expediente del paciente.
20. Automonitoreo.
21. Tendencias.
22. Resultados de riesgo.

## Elementos encontrados

- 6 imágenes locales de aplicación/iconografía.
- 2 recursos de marca reutilizables sin alteración.
- 30 tokens semánticos por tema, más colores contextuales.
- 7 estilos tipográficos base y 5 pesos Inter cargados.
- 1 biblioteca consistente de iconos (Feather) con capa de aliases.
- 3 navegadores por rol: paciente, médico y enfermero.
- Estados de loading, error y vacío en las interfaces de datos.
- Componentes compartidos para cards, badges, botones, inputs, headers y gráficas.

## Pendientes

- Crear y aprobar manualmente `logo-blanco.png`.
- Crear un logotipo horizontal oficial; el repositorio solo contiene isotipo/iconos.
- Generar las capturas enumeradas en [`CAPTURAS_PENDIENTES.md`](interfaces/capturas/CAPTURAS_PENDIENTES.md) en un entorno que permita abrir Expo/API.
- Validar cámara y biometría en dispositivo físico o simulador compatible.
- Revisar los colores directos documentados y decidir si se convierten en tokens; este paquete no modifica el diseño.
- La confirmación/cancelación de citas del paciente solo muestra alertas locales en el código inspeccionado.

## Carga en zeroheight

1. Crear un Styleguide llamado **PREDIA Mobile**.
2. Crear las secciones `Fundamentos`, `Componentes`, `Interfaces` y `Funciones`.
3. En `Fundamentos > Marca`, subir [`logo-principal.png`](logo/logo-principal.png) e [`isotipo.png`](logo/isotipo.png); incluir las restricciones de [`logo/README.md`](logo/README.md).
4. En `Fundamentos > Color`, importar o transcribir [`colores.json`](paleta-colores/colores.json) y separar Light/Dark.
5. En `Fundamentos > Tipografía`, recrear la escala descrita en [`tipografia.md`](tipografia/tipografia.md).
6. En `Fundamentos > Iconografía`, documentar Feather por nombre técnico; subir únicamente los archivos locales de [`iconografia/archivos`](iconografia/archivos/).
7. En `Interfaces`, crear una página por pantalla usando [`interfaces.md`](interfaces/interfaces.md) y adjuntar la captura correspondiente cuando esté disponible.
8. En `Funciones`, enlazar cada interfaz con su sección de [`funciones-interfaces.md`](funciones/funciones-interfaces.md).
9. No subir `.env`, tokens, contraseñas, URLs privadas ni capturas con información no anonimizada.

## Convenciones para zeroheight

- Nombre de token: `Light / Primary`, `Dark / Primary`, etc.
- Mantener HEX como valor fuente y RGB como referencia.
- Usar el nombre técnico Feather en las fichas de iconos.
- Vincular cada interfaz con propósito, componentes, acciones, estados y destinos.
- Marcar explícitamente los elementos pendientes; no sustituirlos con recursos generados.
