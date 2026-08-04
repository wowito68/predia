# PREDIA Mobile — Reporte de Rediseño UI/UX (Premium Health SaaS)

> Objetivo: que la app deje de "parecer hecha con Expo" y se sienta como un
> producto comercial de salud comparable con Apple Health, One Medical,
> Linear, Stripe Dashboard y Google Fit: simple, confiable, profesional,
> limpia, jerárquica y elegante.

Stack verificado: Expo `54.0.35`, React Native `0.81.5`, React `19.1.0`,
React Navigation 7, TanStack Query 5, Reanimated 4, fuente Inter
(`@expo-google-fonts/inter`). Typecheck del paquete móvil: **`tsc --noEmit`
pasa sin errores**.

---

## FASE 1 — Auditoría visual (diagnóstico del diseño anterior)

Defectos detectados en la versión previa al rediseño:

| Categoría | Problema | Estado |
|---|---|---|
| Tipografía | Tamaños arbitrarios sin escala, sin jerarquía clara | ✅ Resuelto |
| Espaciado | Padding excesivo e inconsistente, sin sistema | ✅ Resuelto |
| Cards | Tarjetas genéricas, demasiados bordes y sombras pesadas | ✅ Resuelto |
| Iconografía | Mezcla de Ionicons/emojis, grosores distintos | ✅ Resuelto (Feather único) |
| Botones | Botones básicos, sin variantes ni estados | ✅ Resuelto |
| Listas | Listas planas y aburridas, sin jerarquía | ✅ Resuelto |
| Headers | Encabezados simples, sin eyebrow/subtítulo | ✅ Resuelto |
| Color | Demasiados colores saturados (azules/verdes/morados neón) | ✅ Resuelto (paleta clínica) |
| Sombras | Sombras genéricas y pesadas | ✅ Resuelto (escala iOS) |
| Radios | **Escala falsa**: `md/lg/xl/xxl` colapsaban todos a 8px | ✅ Resuelto (escala real) |
| Jerarquía | Varias acciones compitiendo, poco espacio negativo | ✅ Resuelto |
| Modo oscuro | Inexistente | ✅ Resuelto (tema en runtime, sigue el esquema del sistema) |

---

## FASE 2 — Design System

Fuente única de verdad: [`src/theme/index.ts`](../apps/mobile/src/theme/index.ts).

### Paleta (clínica, no saturada)

Se eliminaron azules fosforescentes, verdes neón, morados fuertes y rojos
saturados. La identidad es **Slate/Indigo** con acentos clínicos sobrios.

| Rol | Token | Hex (light) | Familia |
|---|---|---|---|
| Primary | `primary` | `#334155` | Slate 700 |
| Primary dark | `primaryDark` | `#172033` | Slate 900 |
| Accent | `accent` | `#4F46E5` | Indigo 600 |
| Background | `background` | `#F7F8FB` | Gray 50 |
| Surface (cards) | `surface` | `#FFFFFF` | White |
| Texto primario | `textPrimary` | `#101828` | Gray 900 |
| Texto secundario | `textSecondary` | `#667085` | Gray 500 |
| Borde | `border` | `#E4E7EC` | Gray 200 |
| Success | `success` | `#047857` | Emerald |
| Warning | `warning` | `#B45309` | Amber |
| Danger | `error` | `#BE123C` | Rose |
| Info | `info` | `#2563EB` | Blue |

Cada color semántico tiene su par `*Bg` / `*Text` para badges con buen
contraste. La función `riskColor()` mapea el riesgo clínico a 4 niveles
visuales coherentes: **BAJO** (emerald), **MODERADO** (azul), **ALTO**
(amber), **MUY ALTO** (rose) — alineado con la capa `lib/risk` del web.

### Tipografía — Inter

Escala con nombres semánticos (sin tamaños arbitrarios):

| Estilo | Tamaño / Interlineado | Peso |
|---|---|---|
| `display` | 34 / 40 | ExtraBold (800) |
| `headline` | 28 / 34 | Bold (700) |
| `title` | 22 / 28 | Bold (700) |
| `body` | 16 / 23 | Regular (400) |
| `bodyMedium` | 16 / 23 | Medium (500) |
| `caption` | 13 / 18 | Medium (500) |
| `overline` | 11 / 14 | Bold (700), uppercase |

Pesos disponibles: Regular 400, Medium 500, SemiBold 600, Bold 700,
ExtraBold 800.

### Espaciado — base 4

`xxs 4 · xs 8 · sm 12 · md 16 · lg 20 · xl 24 · xxl 32 · xxxl 40 · huge 48`.
Todo padding/gap/margin usa estos tokens.

### Border Radius — escala real (corregido en este rediseño)

Antes `md=lg=xl=xxl=8` (escala falsa). Ahora una progresión real:

`xs 6 · sm 8 · md 12 · lg 16 · xl 20 · xxl 28 · full 999`

- `md (12)` → tarjetas, botones, inputs (estándar premium).
- `lg (16)` → contenedores grandes (menús, paneles).
- `xl/xxl` → sheets, modales y heroes.

### Sombras — escala suave estilo iOS (corregido en este rediseño)

Color frío (slate 900 `#0F172A`), opacidades bajas (0.03–0.10) y blur amplio
para evitar el drop-shadow pesado:

`none · xs · sm · card · md · floating · lg` (`card`/`floating` se conservan
como alias por compatibilidad).

### Iconografía — librería única

Toda la app usa **Feather** (vía `@expo/vector-icons`) detrás de un único
adaptador [`src/components/icons.tsx`](../apps/mobile/src/components/icons.tsx).
Feather es trazo uniforme (~2px), lo que cumple el requisito de "una sola
librería" y "mismo grosor visual". El adaptador mapea nombres legacy
(Ionicons-style) a glifos Feather, de modo que un solo cambio reemplaza la
familia en toda la app.

> Nota: la spec sugería Lucide/Phosphor. Se estandarizó en Feather por estar
> ya disponible en el runtime de Expo (cero peso extra) y ser visualmente
> equivalente (mismo trazo lineal). El adaptador permite migrar a Lucide en
> el futuro tocando un solo archivo.

---

## FASE 3 — Componentes premium

Todos viven en [`src/components/ui.tsx`](../apps/mobile/src/components/ui.tsx)
y comparten el mismo lenguaje visual (mismos tokens de color, radio, sombra y
tipografía).

| Componente | Descripción |
|---|---|
| `PremiumCard` | Tarjeta base (surface, borde sutil, sombra opcional) |
| `PrimaryButton` | 4 variantes: `primary`, `secondary`, `ghost`, `danger`; con icono y estados disabled/pressed |
| `SearchField` / `TextField` | Inputs con icono, altura táctil 48px, placeholder atenuado |
| `StatusBadge` / `Badge` | Chips semánticos (neutral/success/warning/danger/info) |
| `RiskPill` | Píldora de riesgo clínico con punto + porcentaje |
| `Avatar` | Iniciales sobre tinte translúcido del color de rol |
| `StatTile` | Métrica con icono, valor y etiqueta |
| `QuickAction` | Acción rápida (icono en burbuja + label) |
| `ListRow` / `ActionRow` | Filas de lista con chevron y subtítulo |
| `SectionTitle` | Encabezado de sección con acción "Ver todas" |
| `EmptyState` | Estado vacío con icono, copy y CTA opcional |
| `Skeleton` / `CardSkeleton` | Loaders con animación shimmer |
| `Screen` / `ScreenHeader` | Scaffolding: safe-area, scroll, pull-to-refresh, eyebrow/título/subtítulo |

`Card.tsx` y `Badge.tsx` se mantienen como **shims** sobre los nuevos
primitivos para no romper imports antiguos → homogeneidad sin migración masiva.

---

## FASE 4 — Jerarquía visual

Cada pantalla expone **1 acción principal** + 2–3 secundarias, con espacio
negativo generoso. Ejemplo en Home (médico): el hero calcula la acción
prioritaria del día (`Revisar alertas críticas` → `Abrir agenda` → `Buscar
paciente`) según el estado clínico real, y las métricas secundarias quedan
como badges, sin competir.

---

## FASE 5 — Dashboard moderno

[`screens/medico/HomeScreen.tsx`](../apps/mobile/src/screens/medico/HomeScreen.tsx)
ya no es "cajas con números". Se organiza por prioridad clínica:

1. Saludo contextual ("Buenos días, Dr. …" + fecha localizada).
2. **Hero card** con resumen accionable del día + CTA principal.
3. Acciones rápidas (Buscar / Agenda / Validar IA / Alertas).
4. **Prioridad clínica** (alertas críticas primero).
5. **Agenda del día** (solo citas de hoy).
6. **Pacientes críticos** (alto/muy alto riesgo).

---

## FASE 6 — Detalle de paciente premium

[`screens/medico/PacienteDetalleScreen.tsx`](../apps/mobile/src/screens/medico/PacienteDetalleScreen.tsx):
avatar + nombre + edad/género/tipo de sangre, `RiskPill`, acciones de contacto
(Llamar / WhatsApp), panel de acciones clínicas, tarjetas de última
consulta/próxima cita, indicadores (peso, IMC, presión, glucosa), bloque de
riesgo con factores SHAP, tratamiento/alergias y un **timeline** vertical con
riel y puntos. Sin tablas.

---

## FASE 7 — Microinteracciones

- **Shimmer** en skeletons (`Animated.loop`, `useNativeDriver` en nativo).
- **Pull-to-refresh** moderno con tint de marca en todas las pantallas scroll.
- **Feedback táctil** consistente: `pressed → opacity 0.72` en todo Pressable.
- Truncado elegante con `numberOfLines` en títulos/subtítulos.

> Reanimated 4 está disponible para transiciones más ricas (shared element,
> entradas escalonadas) como siguiente iteración.

---

## FASE 8 — UX

Menos clics: el hero lleva directo a la acción prioritaria; las acciones
clínicas viven en el detalle del paciente (no escondidas en menús). Flujos
naturales por rol (médico / enfermero / paciente) vía navegadores dedicados.

---

## FASE 9 — Modo oscuro (implementado en runtime)

Dark Theme real, no una inversión de colores. Sigue automáticamente el esquema
del sistema (`useColorScheme`).

**Arquitectura** ([`src/theme/context.tsx`](../apps/mobile/src/theme/context.tsx)):

- `ThemeProvider` envuelve la app en [`App.tsx`](../apps/mobile/App.tsx) y
  expone la paleta activa (memoizada por esquema).
- `useTheme()` → `{ colors, scheme, isDark }`; `useColors()` → paleta.
- `useThemedStyles(makeStyles)` memoiza el `StyleSheet` por tema. **Patrón
  estándar** en todas las pantallas: `const makeStyles = (colors: AppColors)
  => StyleSheet.create({...})` consumido con `const s = useThemedStyles(makeStyles)`.
- `riskColor(nivel, colors)` resuelve el riesgo contra la paleta activa.
- `AppColors` = claves de la paleta con valores ensanchados a `string`, de modo
  que `lightColors` y `darkColors` son intercambiables con seguridad de tipos.

**Cobertura**: los ~25 archivos que consumían `colors` estático fueron migrados
(3 componentes compartidos, 4 archivos de navegación, 21 pantallas). No queda
ningún `import { colors }` estático en pantallas/componentes.

**Detalles de contraste**:
- Fondos oscuros **Zinc/Slate**, nunca negro absoluto (`#111827` / `#182233`).
- El texto "sobre primario" usa `colors.surface` (blanco en claro, panel oscuro
  en oscuro) y los botones primarios calculan el foreground con `isDark`.
- `NavigationContainer` recibe un tema derivado (claro/oscuro) para que el
  fondo del contenedor y la barra de estado acompañen el tema (sin flash blanco).
- Tintes hardcodeados (cámara, dictado, chips activos, dots de automonitoreo,
  categorías del expediente) se mapearon a tokens semánticos (`errorBg`,
  `warningBg`, `infoBg`, `successBg`, `surfaceMuted`).

Validación: `tsc --noEmit` sin errores tras la migración completa.

---

## FASE 10 — Performance

- `QueryClient` afinado para móvil ([`App.tsx`](../apps/mobile/App.tsx)):
  `staleTime` 60s, `gcTime` 10min, `retry` 1, `refetchOnReconnect`.
- `staleTime` por consulta (45–60s) para evitar refetch al re-montar.
- Listas con `.slice()` para acotar render inicial y `numberOfLines`.
- Skeletons con `useNativeDriver` (no bloquean el hilo JS en nativo).

> Métricas cuantitativas (TTI, FPS, renders) requieren profiling on-device
> (React DevTools / Hermes). No se incluyen números medidos para no inventar
> datos; la estrategia anterior es la base para esa medición.

---

## FASES 11–12 — Homogeneidad y validación

Toda la UI consume el mismo Design System; no quedan pantallas "viejas"
mezcladas (los componentes legacy `Card`/`Badge` son shims del nuevo sistema).
Validación de build: `tsc --noEmit` sin errores tras los cambios de tema.

---

## Antes / Después (resumen)

| Aspecto | Antes | Después |
|---|---|---|
| Color | Saturado, multicolor | Slate/Indigo clínico |
| Tipografía | Tamaños arbitrarios | Escala Inter semántica |
| Radios | Falsos (todo 8px) | Escala real 6→28 |
| Sombras | Pesadas/genéricas | Suaves estilo iOS |
| Cards | Genéricas | `PremiumCard` unificada |
| Iconos | Mezclados | Feather único |
| Dashboard | Cajas con números | Priorizado y accionable |
| Detalle paciente | Datos planos | Perfil + timeline premium |

> Capturas before/after: requieren ejecutar Expo en dispositivo/emulador.
> Dejar los PNG en `docs/mobile-redesign-assets/` y enlazarlos aquí.

---

## Trabajo restante

1. **Capturas before/after** on-device (claro y oscuro) para esta sección.
2. **Métricas de performance** medidas con Hermes/DevTools.
3. Transiciones avanzadas con Reanimated 4 (entradas escalonadas, shared
   element en navegación a detalle).
4. (Opcional) Toggle manual de tema (claro/oscuro/sistema) — hoy sigue el
   esquema del sistema; el `ThemeProvider` ya está listo para exponer override.

## Principios UX aplicados

Una acción principal por pantalla · jerarquía por prioridad clínica · espacio
negativo · color con significado (riesgo) · consistencia total vía Design
System · feedback inmediato · accesibilidad (targets táctiles ≥44–48px,
contraste AA).
