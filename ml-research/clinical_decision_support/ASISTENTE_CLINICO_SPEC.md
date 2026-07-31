# Módulo "Asistente Clínico" — Especificación de integración en PREDIA

Panel dentro del expediente del paciente (`/pacientes/[id]/evolucion`), junto al
componente existente `ClinicalEvolution`. **Sin cajas negras**: cada elemento es
explicable y auditable.

## Secciones (de arriba a abajo)
1. **Cabecera**: riesgo de diabetes (FASE 1), CES/evolución (FASE 2), comorbilidades y
   badge de **Prioridad** (Baja/Media/Alta/Crítica) con su score 0-100.
2. **Tendencias**: mini-timelines de glucosa y riesgo (reutiliza series de `lib/evolution`).
3. **Alertas**: lista de reglas disparadas con severidad (motor de reglas, FASE 3A).
4. **¿Por qué?**: explicación auditable (atribución SHAP + rule trace, FASE 3C).
5. **Top-5 recomendaciones**: acciones ordenadas por impacto (FASE 3F), cada una con su razón.

## Fuente de datos (API sugerida)
`GET /api/pacientes/[id]/asistente` → `{ risk, ces, priority, alerts[], why[],
recommendations[] }` — el mismo objeto que produce `predia_cdss.recommend.recommend_patient`.

## Principios
- Cada recomendación **debe** mostrar su justificación (no se renderiza sin `reason`).
- El score de prioridad muestra su **desglose por componente** (riesgo/evolución/eventos/
  adherencia/comorbilidades) al expandir.
- Todo queda **registrado** (auditoría) para trazabilidad clínica.
