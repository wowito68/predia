# Temporal Clinical Evolution Framework (FASE 2)

Sistema que **modela la evolución clínica longitudinal** de cada paciente de PREDIA —
no predice diabetes, sino que responde *¿cómo ha evolucionado?, ¿mejora o empeora?,
¿qué tan rápido?, ¿qué tan probable es que empeore?*.

Sucesor temporal de `ml-research/brfss/` (estratificación transversal). Porta a Python
la matemática del motor de evolución ya existente en `apps/web/lib/evolution/`
(ver `docs/clinical-evolution-score.md`) y la extiende con features rolling, detección
de eventos, clustering, forecasting y dashboards.

## Datos

El esquema PREDIA ya tiene las señales temporales (`Automonitoreo`,
`MedicionAntropometrica`, `EstudioLaboratorio`, `Prediccion`), pero el volumen real es
insuficiente para clustering/forecasting. Se usa una **cohorte longitudinal sintética
realista** (400 pacientes × ~12 meses, muestreo irregular, 5 arquetipos clínicos,
eventos agudos con verdad-terreno). El pipeline es portable a datos reales sin cambios.

## Estructura

```
temporal_clinical_framework/
├── src/predia_temporal/   # config, cohort, timeseries, features, trends, ces,
│                          # events, clustering, forecasting, plots, validation
├── run_cohort.py (2A) · run_features.py (2B) · run_trends.py (2C) · run_ces.py (2D)
├── run_events.py (2E) · run_clustering.py (2F) · run_forecasting.py (2G)
├── run_dashboards.py (2H) · run_validation.py (2I) · run_pipeline.sh
├── build_notebooks.py · build_report.py
├── notebooks/01_Temporal_Modeling … 08_Clinical_Validation.ipynb
├── datasets/ · metrics/ · figures/<fase>/ · dashboards/
└── Temporal_Clinical_Evolution_Framework_Report.md
```

## Reproducir

```bash
cd ml-research/temporal_clinical_framework
../.venv/bin/pip install statsmodels
./run_pipeline.sh        # cohorte → … → notebooks ejecutados + reporte
```

## Resultado (resumen)

CES 0-100 que ordena los arquetipos (Mejora 76 → Estable 60 → Oscilante 34 → Alto
riesgo 20 → Deterioro 15); clustering **DBSCAN ARI=0.92** vs arquetipos; alertas con
**100% de detección y lead-time mediano de 25 días**; forecasting one-step que supera al
baseline de persistencia en RMSE para glucosa, IMC, riesgo y CES. Ver el reporte.
