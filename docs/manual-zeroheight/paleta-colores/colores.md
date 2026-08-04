# Paleta de colores

Fuente principal: `apps/mobile/src/theme/index.ts`. La aplicación define paletas equivalentes para modo claro y oscuro mediante `ThemeProvider`. Las muestras se representan con HTML compatible con Markdown/zeroheight.

## Tema claro

| Nombre sugerido | Muestra | HEX | RGB | Uso dentro de la aplicación | Archivo donde aparece |
|---|---|---|---|---|---|
| Primary | <span style="display:inline-block;width:24px;height:14px;background:#123F4A"></span> | `#123F4A` | 18, 63, 74 | Botones y marca clínica | `src/theme/index.ts` |
| Primary Dark | <span style="display:inline-block;width:24px;height:14px;background:#082B34"></span> | `#082B34` | 8, 43, 52 | Hero de alto contraste | `src/theme/index.ts` |
| Primary Light | <span style="display:inline-block;width:24px;height:14px;background:#2D6874"></span> | `#2D6874` | 45, 104, 116 | Acentos secundarios | `src/theme/index.ts` |
| Accent | <span style="display:inline-block;width:24px;height:14px;background:#087E8B"></span> | `#087E8B` | 8, 126, 139 | Tabs activos, enlaces y gráficas | `src/theme/index.ts` |
| Accent Soft | <span style="display:inline-block;width:24px;height:14px;background:#DDF2F2"></span> | `#DDF2F2` | 221, 242, 242 | Fondos de iconos y selección | `src/theme/index.ts` |
| Indigo | <span style="display:inline-block;width:24px;height:14px;background:#5267C9"></span> | `#5267C9` | 82, 103, 201 | Serie secundaria y expediente | `src/theme/index.ts` |
| Coral | <span style="display:inline-block;width:24px;height:14px;background:#D5635B"></span> | `#D5635B` | 213, 99, 91 | Presión y acciones destacadas | `src/theme/index.ts` |
| Background | <span style="display:inline-block;width:24px;height:14px;background:#F3F7F6;border:1px solid #ccc"></span> | `#F3F7F6` | 243, 247, 246 | Fondo global | `src/theme/index.ts` |
| Surface | <span style="display:inline-block;width:24px;height:14px;background:#FFFFFF;border:1px solid #ccc"></span> | `#FFFFFF` | 255, 255, 255 | Cards, inputs y navegación | `src/theme/index.ts` |
| Surface Muted | <span style="display:inline-block;width:24px;height:14px;background:#EAF1F0"></span> | `#EAF1F0` | 234, 241, 240 | Controles segmentados | `src/theme/index.ts` |
| Surface Sunken | <span style="display:inline-block;width:24px;height:14px;background:#DDE8E6"></span> | `#DDE8E6` | 221, 232, 230 | Pistas y gráficas | `src/theme/index.ts` |
| Text Primary | <span style="display:inline-block;width:24px;height:14px;background:#10272D"></span> | `#10272D` | 16, 39, 45 | Títulos y valores | `src/theme/index.ts` |
| Text Secondary | <span style="display:inline-block;width:24px;height:14px;background:#53686D"></span> | `#53686D` | 83, 104, 109 | Descripciones | `src/theme/index.ts` |
| Text Muted | <span style="display:inline-block;width:24px;height:14px;background:#7E9195"></span> | `#7E9195` | 126, 145, 149 | Etiquetas y deshabilitados | `src/theme/index.ts` |
| Border | <span style="display:inline-block;width:24px;height:14px;background:#D8E3E1"></span> | `#D8E3E1` | 216, 227, 225 | Bordes y divisores | `src/theme/index.ts` |
| Border Strong | <span style="display:inline-block;width:24px;height:14px;background:#B9CBC8"></span> | `#B9CBC8` | 185, 203, 200 | Foco y énfasis | `src/theme/index.ts` |
| Success | <span style="display:inline-block;width:24px;height:14px;background:#197A68"></span> | `#197A68` | 25, 122, 104 | Confirmaciones y riesgo bajo | `src/theme/index.ts` |
| Warning | <span style="display:inline-block;width:24px;height:14px;background:#B66E24"></span> | `#B66E24` | 182, 110, 36 | Advertencias | `src/theme/index.ts` |
| Error | <span style="display:inline-block;width:24px;height:14px;background:#C44E62"></span> | `#C44E62` | 196, 78, 98 | Errores y prioridad crítica | `src/theme/index.ts` |
| Info | <span style="display:inline-block;width:24px;height:14px;background:#3E6FA6"></span> | `#3E6FA6` | 62, 111, 166 | Información y agenda | `src/theme/index.ts` |

Los fondos y textos semánticos asociados están en [`colores.json`](colores.json): `successBg/Text`, `warningBg/Text`, `errorBg/Text`, `infoBg/Text`, además de `indigoSoft` y `coralSoft`.

## Tema oscuro

| Nombre sugerido | Muestra | HEX | RGB | Uso dentro de la aplicación | Archivo donde aparece |
|---|---|---|---|---|---|
| Primary Dark | <span style="display:inline-block;width:24px;height:14px;background:#102F36"></span> | `#102F36` | 16, 47, 54 | Hero clínico | `src/theme/index.ts` |
| Primary | <span style="display:inline-block;width:24px;height:14px;background:#8BD3D1"></span> | `#8BD3D1` | 139, 211, 209 | Acciones principales | `src/theme/index.ts` |
| Accent | <span style="display:inline-block;width:24px;height:14px;background:#56C1C7"></span> | `#56C1C7` | 86, 193, 199 | Tabs, enlaces y gráficas | `src/theme/index.ts` |
| Indigo | <span style="display:inline-block;width:24px;height:14px;background:#9AA8F1"></span> | `#9AA8F1` | 154, 168, 241 | Serie secundaria | `src/theme/index.ts` |
| Coral | <span style="display:inline-block;width:24px;height:14px;background:#F08A80"></span> | `#F08A80` | 240, 138, 128 | Presión y acciones | `src/theme/index.ts` |
| Background | <span style="display:inline-block;width:24px;height:14px;background:#0C171B"></span> | `#0C171B` | 12, 23, 27 | Fondo global | `src/theme/index.ts` |
| Surface | <span style="display:inline-block;width:24px;height:14px;background:#132329"></span> | `#132329` | 19, 35, 41 | Cards e inputs | `src/theme/index.ts` |
| Surface Muted | <span style="display:inline-block;width:24px;height:14px;background:#1A3036"></span> | `#1A3036` | 26, 48, 54 | Superficie secundaria | `src/theme/index.ts` |
| Elevated | <span style="display:inline-block;width:24px;height:14px;background:#183038"></span> | `#183038` | 24, 48, 56 | Superficie elevada | `src/theme/index.ts` |
| Text Primary | <span style="display:inline-block;width:24px;height:14px;background:#F2F8F7;border:1px solid #888"></span> | `#F2F8F7` | 242, 248, 247 | Títulos y valores | `src/theme/index.ts` |
| Text Secondary | <span style="display:inline-block;width:24px;height:14px;background:#B5C8C9"></span> | `#B5C8C9` | 181, 200, 201 | Descripciones | `src/theme/index.ts` |
| Text Muted | <span style="display:inline-block;width:24px;height:14px;background:#81999C"></span> | `#81999C` | 129, 153, 156 | Etiquetas | `src/theme/index.ts` |
| Border | <span style="display:inline-block;width:24px;height:14px;background:#284148"></span> | `#284148` | 40, 65, 72 | Bordes y divisores | `src/theme/index.ts` |
| Success | <span style="display:inline-block;width:24px;height:14px;background:#65C6A8"></span> | `#65C6A8` | 101, 198, 168 | Confirmaciones | `src/theme/index.ts` |
| Warning | <span style="display:inline-block;width:24px;height:14px;background:#E6AE69"></span> | `#E6AE69` | 230, 174, 105 | Advertencias | `src/theme/index.ts` |
| Error | <span style="display:inline-block;width:24px;height:14px;background:#F08A9C"></span> | `#F08A9C` | 240, 138, 156 | Errores y alertas | `src/theme/index.ts` |
| Info | <span style="display:inline-block;width:24px;height:14px;background:#8AB8E8"></span> | `#8AB8E8` | 138, 184, 232 | Información | `src/theme/index.ts` |

## Colores contextuales y excepciones

| Nombre sugerido | Muestra | HEX | RGB | Uso dentro de la aplicación | Archivo donde aparece |
|---|---|---|---|---|---|
| Shadow | <span style="display:inline-block;width:24px;height:14px;background:#0F172A"></span> | `#0F172A` | 15, 23, 42 | Sombras | `src/theme/index.ts` |
| Expo Blue | <span style="display:inline-block;width:24px;height:14px;background:#1565C0"></span> | `#1565C0` | 21, 101, 192 | Splash y fondo adaptativo | `app.json` |
| White overlay | <span style="display:inline-block;width:24px;height:14px;background:#FFFFFF;border:1px solid #ccc"></span> | `#FFFFFF` | 255, 255, 255 | Botones, hero y cámara | `ui.tsx`, `HomeScreen.tsx`, `CamaraClinicaScreen.tsx` |
| Camera black | <span style="display:inline-block;width:24px;height:14px;background:#000000"></span> | `#000000` | 0, 0, 0 | Fondo del visor | `CamaraClinicaScreen.tsx` |
| Clinical live | <span style="display:inline-block;width:24px;height:14px;background:#65D1BC"></span> | `#65D1BC` | 101, 209, 188 | Indicador en vivo/sincronizado | `HomeScreen.tsx`, `PacienteDetalleScreen.tsx` |
| Hero muted | <span style="display:inline-block;width:24px;height:14px;background:#B8D5D5"></span> | `#B8D5D5` | 184, 213, 213 | Texto sobre hero | `HomeScreen.tsx` |
| Hero critical | <span style="display:inline-block;width:24px;height:14px;background:#F2A39C"></span> | `#F2A39C` | 242, 163, 156 | Métrica crítica sobre hero | `HomeScreen.tsx` |

### Inconsistencias documentadas

- `app.json` conserva `#1565C0`, ajeno a la paleta clínica actual.
- Cámara y algunos botones usan blanco/negro directos por su contexto de imagen.
- Home, detalle clínico e indicadores contienen tonos hero directos que todavía no están expresados como tokens del tema.
