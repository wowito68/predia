# Personalized Clinical Decision Support System (FASE 3)

De *predicción* (FASE 1, riesgo) y *monitoreo* (FASE 2, evolución) a **recomendación
clínica asistida**: responde *¿qué debería hacerse con este paciente?* mediante alertas,
prioridades y recomendaciones **justificadas y auditables**. No diagnostica ni reemplaza
al médico — **sin cajas negras**.

## Datos

Reutiliza la cohorte longitudinal de `../temporal_clinical_framework/` (vitales, riesgo,
CES, eventos) y la **enriquece** con consultas, medicación + adherencia, comorbilidades y
factores de riesgo (`enrich.py`). Pipeline portable a datos reales de PREDIA.

## Estructura

```
clinical_decision_support/
├── src/predia_cdss/   # config, enrich, rules, priority, explain, trajectories,
│                      # earlywarning, ranking, recommend, plots, validation
├── run_enrich.py · run_explain.py(3C) · run_rules.py(3A) · run_priority.py(3B)
├── run_trajectories.py(3D) · run_earlywarning.py(3E) · run_ranking.py(3F)
├── run_assistant.py(3G) · run_validation.py(3H) · run_pipeline.sh
├── build_notebooks.py · build_report.py
├── notebooks/01_Rule_Engine … 07_Validation.ipynb
├── rules/ · models/ · metrics/ · figures/<fase>/ · dashboards/ · datasets/
├── ASISTENTE_CLINICO_SPEC.md
└── Clinical_Decision_Support_Report.md
```

## Reproducir

```bash
# Requiere haber corrido antes ../temporal_clinical_framework/run_pipeline.sh
cd ml-research/clinical_decision_support
./run_pipeline.sh
```

## Resultado (resumen)

Motor de **12 reglas** clínicas con trazabilidad; **Priority Score 0-100** monótono con el
riesgo (ρ=0.95); recomendaciones **explicables** (SHAP + rule trace, 100% con razón);
trayectorias con matriz de transición Markov; **early warning** con Cox PH (IMC HR=1.75,
glucosa 1.58, comorbilidades 1.47, adherencia protectora 0.76); **Top-5 acciones** por
paciente (−49% carga cognitiva vs catálogo); **100% auditable**. La salida la produce
`recommend.recommend_patient` y mapea al panel "Asistente Clínico" del expediente.
