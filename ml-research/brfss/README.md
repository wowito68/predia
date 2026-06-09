# Explainable Diabetes Risk Stratification Framework — BRFSS 2015

Fase 1 del motor de soporte a la decisión clínica de PREDIA. Transforma la
probabilidad de un modelo de ML en **niveles de riesgo clínicos interpretables**
(Bajo / Moderado / Alto / Muy Alto), validados epidemiológicamente.

No es un clasificador binario más: el foco está en **probabilidades calibradas** y
**bandas de riesgo con significado clínico**, no en la *accuracy*.

## Dataset

*CDC Diabetes Health Indicators* (BRFSS 2015) — Kaggle
`alexteboul/diabetes-health-indicators-dataset` (descargado vía `kagglehub`). 253,680
encuestados, 21 indicadores, prevalencia real 13.9%. Los 3 CSV viven en `data/`
(ignorados por git; se regeneran con kagglehub).

## Estructura

```
brfss/
├── src/predia_brfss/        # paquete (config, codebook, data, preprocess, models,
│                            #          evaluate, calibration, risk, explain, clinical, plots)
├── run_eda.py               # Fase 1A — EDA + epidemiología
├── run_training.py          # Fase 1B — 9 modelos, tuning, comparación
├── run_calibration.py       # Fase 1C — Platt vs isotónica (Brier/ECE)
├── run_risk_stratification.py # Fase 1D — 4 métodos de umbralización
├── run_explainability.py    # Fase 1E — SHAP, permutation, PDP
├── run_clinical_validation.py # Fase 1F — prevalencia/OR/RR/sens/espec por banda
├── build_notebooks.py       # genera los 6 notebooks entregables
├── build_report.py          # genera risk_stratification_report.md
├── run_downstream.sh        # orquesta 1C-1F + notebooks + reporte
├── notebooks/01_EDA_BRFSS … 06_Clinical_Validation.ipynb
├── results/{eda,models,calibration,risk,explainability,clinical}/
└── risk_stratification_report.md
```

Reutiliza el zoo de modelos y los plots de `../src/predia_ml`.

## Reproducir

```bash
cd ml-research/brfss
../.venv/bin/pip install kagglehub            # única dependencia extra
../.venv/bin/python run_eda.py
../.venv/bin/python run_training.py           # más lento (tuning de 9 modelos)
./run_downstream.sh                           # calibración → … → notebooks ejecutados
```

> **Nota de cómputo:** presupuesto *equilibrado* (RandomizedSearch N_ITER=10, CV=3).
> SVM/KNN y RandomForest/ExtraTrees se submuestrean en el tuning (ver
> `models.SUBSAMPLE_SIZES`) para acotar tiempo y memoria en máquinas con poca RAM.

## Resultado (resumen)

Mejor modelo **XGBoost** (ROC-AUC 0.83), calibración **isotónica** (ECE 0.003),
bandas por **cost-sensitive thresholding**. En *test* held-out la prevalencia crece
2.9% → 14% → 29% → 48% (Bajo→Muy Alto), con OR vs Bajo de 1 → 5.5 → 13.7 → 30.7:
**bandas clínicamente significativas**. Ver `risk_stratification_report.md`.
