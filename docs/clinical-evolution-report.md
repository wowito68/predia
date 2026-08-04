# PREDIA — Sistema Matemático de Evolución Clínica · Informe Final

> Arquitectura, fundamentos, utilidad clínica y limitaciones. Complementa
> `clinical-evolution-audit.md` (Fase 1) y `clinical-evolution-score.md` (Fases 2–3).

## 1. Arquitectura

```
EHR (MySQL)                       Motor (TS puro)                 Presentación
─────────────                     ──────────────                  ─────────────
medicion_antropometrica ┐         lib/evolution/                  /pacientes/[id]/evolucion
automonitoreo           ├─► API ─► · timeseries.ts (math)   ─►    · ClinicalEvolution (recharts)
estudio_laboratorio     ┘  /pacientes/[id]/evolucion        ─►    · CES explicable + eventos
                            (requirePacienteSelf)                  · EvolutionReportPDF
                              ↓ fusiona series por variable
                              ↓ Point[]{t(días), x}
                            analyzePatient() → { variables, ces, eventos, series }
```

- **Motor desacoplado** (`apps/web/lib/evolution/`): `timeseries.ts` (regresión OLS,
  aceleración por ajuste cuadrático, volatilidad, medias móviles), `config.ts`
  (constantes clínicas κ, ω, umbrales), `analyze.ts` (métricas por serie + CES),
  `events.ts` (detección). TypeScript puro, sin dependencias del modelo ML; reutilizable y testeable.
- **Endpoint** `GET /api/pacientes/[id]/evolucion`: fusiona las fuentes por variable,
  convierte a `Point{t en días, x}` y ejecuta el motor.
- **UI** `ClinicalEvolution` + página dedicada; **PDF** `EvolutionReportPDF`.
- **Sin migración nueva**: se reutilizan las tablas existentes (la serie de glucosa/peso/PA
  del paciente proviene de `automonitoreo`, ya creada; las clínicas de `medicion_antropometrica`
  y `estudio_laboratorio`). FC/SpO₂ no se capturan (trabajo futuro).

## 2. Fundamentos matemáticos (resumen)

Sobre una serie irregular $\{(t_i,x_i)\}$ con $t$ en días (ver detalle y demostraciones
en `clinical-evolution-score.md`):

- **Tendencia / velocidad:** pendiente OLS $\beta$ (→ unidades/mes), intercepto, $R^2$.
- **Aceleración:** $2a$ del ajuste cuadrático ($n\ge3$).
- **Volatilidad:** $\sigma$, $CV=\sigma/|\bar x|$, $\sigma_{\text{resid}}$.
- **Medias móviles:** $k\in\{3,5,10\}$.
- **CES** $=50(1+W)$, con $W=\operatorname{clip}(\bar s-\mu(1-S),-1,1)$, $\mu=0.5$;
  $\bar s$ = índice direccional ponderado (κ y ω justificados clínicamente), $S$ = estabilidad.
  **50 = estable; >50 favorable; <50 desfavorable.** Explicable componente a componente.
- **Robustez:** se exige una **ventana mínima de 14 días** para reportar tendencia
  (evita extrapolaciones inestables cuando las mediciones están muy juntas en el tiempo).

## 3. Utilidad clínica

- Convierte datos longitudinales dispersos en **señales accionables**: dirección,
  velocidad y aceleración del cambio por variable, con interpretación verbal
  ("Glucosa empeorando, +2.4 mg/dL/mes").
- **CES** resume la evolución global en un número explicable, priorizando glucosa e IMC
  (manejo de diabetes) y penalizando la **inestabilidad** (perfiles erráticos).
- **Alertas automáticas** (glucosa subiendo, IMC creciente sostenido, PA empeorando,
  estabilidad, mejora a 90 días) para apoyo proactivo a la decisión.
- **Reporte PDF** para el expediente/consulta.

## 4. Limitaciones

- **Frecuencia irregular y escasa:** muchas series tienen pocos puntos; el motor exige
  ≥2 puntos y ≥14 días para tendencia, y marca "Sin datos suficientes" en otro caso.
- **FC y SpO₂ no disponibles** en el EHR (solo en el dataset ML) → no analizables sin
  añadir su captura (migración futura: ampliar `medicion_antropometrica` o nueva tabla).
- **Linealidad/cuadrática local:** el modelo asume tendencias suaves; cambios abruptos o
  estacionales no se modelan (posible mejora: regresión robusta, GAM, suavizado LOESS).
- **Fusión de fuentes heterogéneas:** glucosa de automonitoreo (capilar) y de laboratorio
  (ayunas) se combinan; idealmente se distinguirían por contexto.
- **κ/ω clínicos** son anclas razonadas, no calibradas con outcomes; deberían validarse
  contra desenlaces reales en una cohorte.

## 5. Entregables

| # | Entregable | Ubicación |
|---|---|---|
| 1 | Código del motor | `apps/web/lib/evolution/` |
| 2 | Migraciones Prisma | No requeridas (reusa tablas existentes) |
| 3 | Endpoint | `apps/web/app/api/pacientes/[id]/evolucion/route.ts` |
| 4 | UI | `components/evolution/ClinicalEvolution.tsx`, `app/pacientes/[id]/evolucion/page.tsx` |
| 5 | Dashboard temporal | Página de evolución del paciente (timeline + métricas + CES) |
| 6 | PDF | `components/pdf/EvolutionReportPDF.tsx` |
| 7 | Doc matemática | `docs/clinical-evolution-score.md` |
| 8 | Ejemplos numéricos | `docs/clinical-evolution-score.md` §7 + `scripts/validate-evolution.ts` |
| 9 | Explicación de fórmulas | `docs/clinical-evolution-score.md` |
| 10 | Informe final | este documento |

**Validación:** `scripts/validate-evolution.ts` → 17/17 PASS (deterioro, mejoría, estable,
errático, aceleración); `tsc` sin errores; endpoint y página verificados end-to-end.
