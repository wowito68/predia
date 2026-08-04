# PREDIA — Estratificación de Riesgo Clínico (diseño y auditoría)

> Documento de Fase 1 (auditoría) + Fase 2 (umbrales). "Documentar todo antes de modificar."

## Fase 1 — Auditoría del estado actual

| Aspecto | Estado actual | Ubicación |
|---|---|---|
| Cálculo del score | `probabilidad_diabetes` ∈ [0,1] (regresión logística de cribado, TS puro) | `apps/web/lib/ml-predict.ts` |
| Bandas de riesgo | **Arbitrarias** (`≥0.8` Muy Alto, `≥0.6` Alto, `≥0.4` Moderado) | `ml-predict.ts → nivelRiesgo()` |
| Resultado binario | `resultado: "Diabetes" | "No Diabetes"` (a eliminar de la UX) | `ml-predict.ts`, `predicciones/nueva` |
| Almacenamiento | tabla `prediccion`: `probabilidad_diabetes` (=score), `nivel_riesgo`, `factores_riesgo`, `recomendaciones`, `fecha_prediccion`, `validado` | `prisma/schema.prisma` |
| Visualización | tarjetas en `pacientes/[id]/predicciones`, `resultado/`, `historial/`, `dashboard/stats` | `apps/web/app/...` |

**Conclusión:** los campos de BD requeridos (`score_riesgo`, `nivel_riesgo`, `fecha_evaluacion`, `factores_riesgo`, `recomendaciones`) **ya existen** bajo otros nombres → la migración es mínima (no se rompe el histórico). El cambio principal es (a) umbrales justificados, (b) dejar de mostrar "Diabetes/No Diabetes" y (c) la nueva capa de UX/recomendaciones.

## Fase 2 — Umbrales (justificación matemática)

Derivados de la ROC real del modelo sobre el test (20 000 casos). Ver `ml-research/derive_risk_thresholds.py` y `metrics/risk_thresholds.json`.

- `t_bajo = 0.36` — mayor probabilidad que conserva **sensibilidad ≥ 0.90** (regla de exclusión: por debajo se escapan <10% de diabéticos).
- `t_mid = 0.51` — **punto de Youden** (máx. sensibilidad+especificidad−1): mejor equilibrio.
- `t_alto = 0.63` — menor probabilidad con **especificidad ≥ 0.90** (regla de inclusión: por encima, <10% de falsos positivos; PPV 0.81).

| Nivel | Rango | % pobl. | Prevalencia obs. |
|---|---|---|---|
| Bajo | [0, 0.36) | 14.2% | 0.415 |
| Moderado | [0.36, 0.51) | 40.8% | 0.531 |
| Alto | [0.51, 0.63) | 24.0% | 0.647 |
| Muy Alto | [0.63, 1] | 21.0% | 0.806 |

**Caveat clínico:** modelo débil (AUC 0.66) + prevalencia base 60% ⇒ "Bajo" ≈ 41% prevalencia real. La UX debe decir "riesgo relativo más bajo del cohorte", nunca "sin riesgo".

## Arquitectura propuesta (Fases 3–11)

- **Capa de estratificación desacoplada** (`apps/web/lib/risk/`): `stratify(score) → {nivel, banda, color}`, `riskThresholds` (de `risk_thresholds.json`), `recommendations(nivel)` y `explain(factores)` — todo data-driven y ampliable sin tocar el modelo.
- **BD:** añadir `score_riesgo` (alias explícito), `factores_riesgo`/`recomendaciones` ya existen; columna `recomendaciones_generadas` (JSON) opcional. Migración aditiva, compatible con histórico.
- **UI (modo claro/oscuro):** componentes `RiskBadge`, `RiskCard`, `RiskGauge`, `RiskTimeline`. Paleta médica: Bajo=Slate/Emerald suave, Moderado=Amber, Alto=Orange, Muy Alto=Red oscuro (sin colores puros/fosforescentes).
- **Explicabilidad clínica:** traducir factores SHAP/coeficientes a lenguaje clínico ("Contribuyen / Protegen"), sin jerga ML.
- **Recomendaciones:** motor por nivel, desacoplado (tabla/módulo de reglas).
- **Evolución del riesgo:** timeline `Fecha | Nivel | Score` con gráfica.
- **PDF/Reportes y Dashboard:** nivel+score+interpretación+recomendaciones; widgets de distribución por nivel y altas/bajas de riesgo.
