# PREDIA — ML Research (Predicción de Diabetes)

Investigación reproducible para auditar el modelo en producción y seleccionar el mejor modelo de
predicción de diabetes sobre `diabetes_dataset.csv`.

## Hallazgos clave
1. **Modelo actual no confiable:** Regresión Logística hardcodeada en TS; accuracy 97.89% **no reproducible**
   (otro dataset, faltan `Urea/Cr/VLDL`) e inflada por **fuga de HbA1c**.
2. **Dataset:** 100,000×31, sin nulos/duplicados, balance {'1': 59.998, '0': 40.002}.
3. **Fuga demostrada (CV5 LogReg):** `diabetes_stage`+`risk_score` ⇒ acc≈0.9979;
   cribado honesto ⇒ acc≈0.6163.
4. **Mejor modelo honesto:** **logistic_regression** (ROC AUC 0.6591), exportado en `exports/`.

## Estructura
```
ml-research/
├── src/predia_ml/        # paquete reproducible (config, data, preprocess, models, evaluate, plots)
├── notebooks/            # 01..14 (ejecutados)
├── datasets/             # splits serializados
├── models/               # modelos entrenados (.joblib)
├── metrics/              # auditoría, comparaciones, importancias (.json/.csv)
├── figures/              # EDA, curvas, interpretabilidad (.png)
├── exports/              # pipeline final (.joblib/.pkl) + model_card.json
├── reports/              # model_report.md, research_report.md
├── comparisons/          # current_vs_new_models.md
└── requirements.txt
```

## Reproducir
```bash
cd ml-research
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
export PYTHONPATH=src
.venv/bin/python run_audit_eda.py
.venv/bin/python run_current_model_audit.py
.venv/bin/python run_train.py
.venv/bin/python run_select_shap.py
.venv/bin/python build_reports.py
.venv/bin/python build_notebooks.py
.venv/bin/jupyter nbconvert --to notebook --execute --inplace notebooks/*.ipynb
```
Semilla global `SEED=42`. Versiones fijadas en `requirements.txt`.
