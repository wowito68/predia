# Tipografía

## Fuente principal

La aplicación carga **Inter** mediante `@expo-google-fonts/inter` y `expo-font` en `apps/mobile/App.tsx`. Se registran los pesos 400, 500, 600, 700 y 800. No se define `letterSpacing`, por lo que se utiliza el espaciado normal de Inter.

| Estilo | Fuente | Peso | Tamaño | Interlineado | Color | Uso | Archivo de origen |
|---|---|---:|---:|---:|---|---|---|
| Display | Inter | 800 | 32 px | 38 px | `textPrimary` | Titulares principales y portada de acceso | `src/theme/index.ts`, `LoginScreen.tsx` |
| Headline | Inter | 700 | 27 px | 33 px | `textPrimary` | Encabezados de pantalla y valores destacados | `src/theme/index.ts`, `Screen.tsx` |
| Title | Inter | 700 | 21 px | 27 px | `textPrimary` | Títulos de tarjeta, paciente y resultados | `src/theme/index.ts` |
| Section title | Inter | 600 | 18 px | 24 px | `textPrimary` | Encabezados de secciones | `src/components/ui.tsx` |
| Body | Inter | 400 | 16 px | 23 px | `textPrimary` o `textSecondary` | Párrafos, campos y recomendaciones | `src/theme/index.ts` |
| Body medium | Inter | 500 | 16 px | 23 px | Según contexto | Botones, filas y valores | `src/theme/index.ts` |
| Caption | Inter | 500 | 13 px | 18 px | `textSecondary` | Metadatos, fechas y textos de apoyo | `src/theme/index.ts` |
| Overline | Inter | 700 | 11 px | 14 px | `textMuted` o semántico | Etiquetas, estados y leyendas | `src/theme/index.ts` |
| Navegación clínica | Inter | 600 | 11 px | Sistema | Activo `accent`; inactivo `textMuted` | Etiquetas del tab bar médico/enfermero | `navigation/MedicoNavigator.tsx`, `EnfermeroNavigator.tsx` |
| Navegación paciente | Inter | 600 | 10 px | Sistema | Activo `accent`; inactivo `textMuted` | Etiquetas del tab bar del paciente | `navigation/PacienteNavigator.tsx` |
| Marca compacta | Inter | 700 | 25 px | Sistema | `#F5FAF9` | Letra P del identificador de acceso | `screens/LoginScreen.tsx` |
| Marca ampliada | Inter | 700 | 38 px | Sistema | `#F5FAF9` | Identificador de sesión bloqueada | `screens/LoginScreen.tsx` |
| Métrica hero | Inter | 700 | 25 px | 30 px | Blanco/contextual | Métricas del centro de control | `screens/medico/HomeScreen.tsx` |
| Gráfica | Inter | 500/600 | 9 px | SVG | Semántico | Ejes y referencia de gráficas | `components/charts.tsx` |

## Excepciones encontradas

- `HistorialClinicoScreen.tsx`, `ResultadosScreen.tsx` y `CamaraClinicaScreen.tsx` todavía declaran algunos pesos con `fontWeight` y tamaños mediante `fontSize`, en lugar de consumir íntegramente `typography`.
- `DictadoNotasScreen.tsx` utiliza 40 px para el icono textual de grabación.
- No se encontró una fuente secundaria ni una familia del sistema usada deliberadamente para contenido. Los glifos de iconos provienen de Feather, no de la tipografía de texto.
