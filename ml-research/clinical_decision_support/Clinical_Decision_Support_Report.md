# Clinical Decision Support Report — PCDSS (FASE 3)
### PREDIA · sistema personalizado de apoyo a la decisión clínica

> De *predicción* y *monitoreo* a **recomendación clínica asistida**: responde
> *¿qué debería hacerse con este paciente?*. **No diagnostica ni reemplaza al médico**;
> genera **alertas, prioridades y recomendaciones justificadas y auditables**.

---

## 1. Metodología

El PCDSS integra las dos fases previas sobre una cohorte de **400 pacientes**
(reusa la cohorte longitudinal de FASE 2 enriquecida con **consultas, medicación,
adherencia y comorbilidades**):

- **Entradas:** riesgo de diabetes (FASE 1), evolución/CES y eventos (FASE 2), signos
  vitales, historial de consultas, medicación + adherencia, comorbilidades, factores de riesgo.
- **Salidas:** alertas (motor de reglas), Priority Score, recomendaciones rankeadas y
  explicaciones (SHAP + rule trace).

Paquete reproducible `predia_cdss` (`run_*.py` + `run_pipeline.sh`). Cada salida del
sistema la produce `recommend.recommend_patient` y es **trazable**.

## 2. Clinical Rule Engine (3A)

Motor declarativo de **12 reglas** `IF condición THEN alerta/acción`, cada
una con severidad, acción recomendada y **evidencia** citada (rule trace). Ejemplos:
*hiperglucemia+obesidad*, *PA elevada en 3 consultas → seguimiento prioritario*, *riesgo
muy alto sin consulta reciente → contacto preventivo*. El 64% de los
pacientes dispara ≥1 alerta.

## 3. Risk Prioritization (3B)

**Priority Score 0-100** = `100·Σ w_k·c_k` (riesgo 0.35, evolución/CES 0.25, eventos 0.15,
comorbilidades 0.15, adherencia 0.10) → bandas Baja/Media/Alta/Crítica.

| Banda | Pacientes |
|---|---|
| Crítica | 46 |
| Alta | 150 |
| Media | 47 |
| Baja | 157 |

## 4. Explainable Recommendations (3C)

Cada recomendación responde **¿por qué?** con SHAP (modelo de deterioro) + rule trace.
Factores globales principales del deterioro:

| Factor | Media |SHAP| |
| --- | --- |
| Riesgo de diabetes | 3.3203 |
| Glucosa actual | 1.548 |
| Actividad física | 1.0287 |
| IMC actual | 0.3 |
| PA sistólica | 0.2856 |
| Adherencia | 0.1683 |

## 5. Patient Trajectories (3D)

Riesgo(t) mapeado a las bandas de FASE 1 (suavizado). Tipos de trayectoria:
Sin transiciones=135, Oscila=121, Empeora=79, Mejora=65.
Solo el 5% de las transiciones a
peor está precedido por un evento agudo → la mayoría son deterioros **graduales**
(de tendencia), lo que refuerza el valor del monitoreo temporal continuo.

## 6. Early Warning System (3E)

*Tiempo hasta deterioro* (CES<40 o evento severo): tasa de evento 72%,
seguimiento mediano 51.5 d. **Cox PH** (covariables basales estandarizadas):

| Covariable | HR (IC95%) | p |
| --- | --- | --- |
| imc_baseline | 1.752 [1.451, 2.116] | 0.0 |
| glucosa_baseline | 1.582 [1.335, 1.875] | 0.0 |
| n_comorbilidades | 1.468 [1.241, 1.735] | 0.0 |
| age | 1.09 [0.967, 1.229] | 0.1572 |
| adherencia | 0.762 [0.644, 0.902] | 0.0016 |

→ IMC, glucosa y comorbilidades basales **elevan** el hazard de deterioro; la **adherencia
protege** (HR<1). Kaplan-Meier y forest en `figures/earlywarning/`.

## 7. Recommendation Ranking (3F)

Top-5 acciones por paciente por **impacto esperado** (media 4.6/paciente).
Acciones más frecuentes:

| Acción | Frecuencia |
| --- | --- |
| Programar consulta | 400 |
| Derivar a especialista | 226 |
| Evaluar factores de riesgo modificables | 225 |
| Contacto preventivo | 218 |
| Revisar/ajustar tratamiento | 217 |
| Actualizar glucosa | 214 |
| Actualizar signos vitales (PA/peso) | 176 |
| Reforzar adherencia al tratamiento | 164 |

## 8. Asistente Clínico — integración en PREDIA (3G)

Panel dentro del expediente (`/pacientes/[id]/evolucion`, junto a `ClinicalEvolution`):
cabecera (riesgo + CES + prioridad), tendencias, alertas, **¿por qué?** y Top-5
recomendaciones. API sugerida `GET /api/pacientes/[id]/asistente` → el objeto de
`recommend_patient`. **Sin cajas negras**: nada se renderiza sin su justificación.
Mockups en `dashboards/`, spec en `ASISTENTE_CLINICO_SPEC.md`.

## 9. Validación (3H)

| Dimensión | Resultado |
|---|---|
| **Consistencia** | ρ(riesgo, prioridad) = 0.953 (monótono); ρ(CES, prioridad) = -0.928 |
| **Interpretabilidad** | 100% de recomendaciones con razón |
| **Carga cognitiva** | 4.62 acciones vs 9 del catálogo (−48.7%) |
| **Valor clínico** | prioridad media 54.0 (deterioro) vs 17.6 (sin) |
| **Auditabilidad** | 100% de salidas totalmente trazables |

## 10. Limitaciones

- **Cohorte sintética enriquecida:** valida la *lógica y la integración*; los umbrales de
  reglas, pesos de prioridad y catálogo de acciones deben calibrarse con datos y criterio
  clínico reales antes de su uso.
- **Soporte, no decisión:** el sistema **sugiere y prioriza**; la decisión es del médico.
- **Survival:** evento de deterioro definido por CES/evento severo (proxy); con datos
  reales conviene anclar a desenlaces duros (hospitalización, HbA1c objetivo).
- **Reglas vs aprendizaje:** el motor de reglas es transparente pero rígido; puede
  complementarse con modelos supervisados manteniendo la explicabilidad.

## 11. Aplicaciones clínicas

- **Triaje de agenda:** ordenar la lista de pacientes por Priority Score.
- **Alertas accionables:** cada alerta trae acción y evidencia, lista para el expediente.
- **Intervención temprana:** el early warning identifica a los pacientes que se deteriorarán.
- **Trazabilidad y auditoría:** toda recomendación es reproducible y justificable.

---

*Artefactos: `rules/`, `models/`, `metrics/`, `figures/`, `dashboards/` · Notebooks:
`notebooks/01_Rule_Engine … 07_Validation.ipynb` · Reproducible con `run_pipeline.sh`.*
