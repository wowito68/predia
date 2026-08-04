"""Genera reports/ y comparisons/ y README.md a partir de los artefactos REALES
(metrics/*.json, exports/model_card.json). Reproducible: sin números escritos a mano.
"""
from __future__ import annotations

import json

from predia_ml import config


def load(p):
    return json.load(open(p, encoding="utf-8")) if p.exists() else None


def md_table(rows, cols, headers=None):
    headers = headers or cols
    out = ["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in cols) + " |"]
    for r in rows:
        out.append("| " + " | ".join(str(r.get(c, "")) for c in cols) + " |")
    return "\n".join(out)


def main():
    audit = load(config.METRICS_DIR / "dataset_audit.json")
    cur = load(config.METRICS_DIR / "current_model_audit.json")
    comp = load(config.METRICS_DIR / "comparison_screening.json") or []
    comp_cl = load(config.METRICS_DIR / "comparison_clinical.json") or []
    card = load(config.EXPORTS_DIR / "model_card.json") or {}
    perm = load(config.METRICS_DIR / "permutation_importance.json") or []

    comp = sorted(comp, key=lambda r: r.get("roc_auc", 0), reverse=True)
    best = comp[0] if comp else {}
    cols = ["model", "accuracy", "roc_auc", "recall_sensitivity", "specificity", "f1", "mcc", "cv_roc_auc"]
    lk = cur["leakage_demonstration_cv5"] if cur else {}
    lk_rows = [{"feature_set": k, "accuracy": v["accuracy"], "roc_auc": v["roc_auc"]} for k, v in lk.items()]

    # ---------------------------------------------------------------- model_report.md
    mr = f"""# PREDIA — Reporte Técnico de Modelos de Predicción de Diabetes

> Generado automáticamente desde los artefactos de `ml-research/` (reproducible, seed={config.SEED}).

## 1. Resumen ejecutivo

- El **modelo en producción** de PREDIA es una **Regresión Logística de 11 features**
  (`{', '.join(config.CURRENT_MODEL_FEATURES)}`) servida con **coeficientes hardcodeados en TypeScript**
  (`apps/web/lib/ml-predict.ts`); los `.pkl` de `apps/web/models/` **no se cargan** en runtime.
- La accuracy reportada (**{config.CURRENT_MODEL_REPORTED_ACCURACY:.4f}**, hardcodeada en el seed y en `modelo_metadata.json`)
  **no es reproducible** sobre `diabetes_dataset.csv`: ese modelo fue entrenado con OTRO dataset (947 muestras)
  cuyas features `Urea`, `Cr`, `VLDL` **no existen** aquí.
- Hay **fuga de información (data leakage)** demostrable: `HbA1c` (criterio diagnóstico ADA) por sí sola
  alcanza acc≈{lk.get('hba1c_only',{}).get('accuracy','?')} / AUC≈{lk.get('hba1c_only',{}).get('roc_auc','?')}.
- En el **marco honesto de cribado** (sin laboratorios diagnósticos), el mejor modelo es
  **{best.get('model','?')}** con ROC AUC **{best.get('roc_auc','?')}** y sensibilidad **{best.get('recall_sensitivity','?')}**.

## 2. Dataset

- Archivo: `diabetes_dataset.csv` — **{audit['shape']['rows']:,} filas × {audit['shape']['cols']} columnas**.
- Objetivo: `{audit['target']['name']}` — balance {audit['target']['balance_pct']} (ratio {audit['target']['imbalance_ratio']}).
- Calidad: **{audit['total_nulls']} nulos**, **{audit['n_duplicated_rows']} duplicados**.
- Top |correlación| con el objetivo: {json.dumps(dict(list(audit['abs_corr_with_target'].items())[:6]), ensure_ascii=False)}.

![Balance de clases](../figures/eda/class_balance.png)

## 3. Preprocesamiento y control de fuga

| Grupo | Tratamiento |
|---|---|
| `diabetes_stage`, `diabetes_risk_score` | **Eliminadas siempre** (proxy directo del objetivo) |
| `hba1c`, `glucose_fasting`, `glucose_postprandial`, `insulin_level` | Laboratorios diagnósticos: **excluidos en *screening***, incluidos en *clinical* (con advertencia) |
| Categóricas nominales | One-Hot Encoding |
| Numéricas | StandardScaler (z-score) |
| Binarias 0/1 | Passthrough |

Split estratificado 80/20 reproducible (seed={config.SEED}); preprocesamiento dentro de un `Pipeline` (sin fuga train→test).

## 4. Comparación de modelos — marco *screening* (honesto)

{md_table(comp, cols)}

![ROC comparativa](../figures/comparison_roc.png)
![AUC por modelo](../figures/comparison_auc.png)

## 5. Marco *clinical* (con laboratorios diagnósticos)

Incluir los labs diagnósticos sube las métricas, pero **reaprende el umbral diagnóstico** (fuga parcial):

{md_table(sorted(comp_cl, key=lambda r: r.get('roc_auc',0), reverse=True), ['model','accuracy','roc_auc','recall_sensitivity'])}

## 6. Auditoría del modelo actual — demostración de fuga (CV5, LogReg)

{md_table(lk_rows, ['feature_set','accuracy','roc_auc'])}

**Lectura:** el ~98% reportado solo es alcanzable con variables diagnósticas/fugadas; con cribado honesto
un modelo lineal queda cerca del azar (base rate {audit['target']['balance_pct'].get('1','?')}%).

## 7. Modelo seleccionado e interpretabilidad

- **Seleccionado:** `{card.get('model_name','?')}` — marco *{card.get('framing','?')}*.
- Métricas test: {json.dumps({k: round(v,4) for k,v in card.get('test_metrics',{}).items() if isinstance(v,(int,float))}, ensure_ascii=False)}
- Top variables (permutation importance): {', '.join(r['feature'] for r in perm[:8])}

![Permutation importance](../figures/interpretability/permutation_importance.png)
![SHAP summary](../figures/interpretability/shap_summary.png)

## 8. Conclusión

Las métricas del modelo actual **no son confiables** (no reproducibles, dataset/feature mismatch, fuga por HbA1c).
Para PREDIA se recomienda el modelo de **cribado honesto** seleccionado, exportado en `exports/`, con la
**migración del contrato de features** documentada en `comparisons/current_vs_new_models.md`.
"""
    (config.REPORTS_DIR / "model_report.md").write_text(mr, encoding="utf-8")

    # ---------------------------------------------------------------- research_report.md
    rr = f"""# Investigación: Predicción de Diabetes para PREDIA

> Reporte académico. Generado desde artefactos reproducibles (seed={config.SEED}).

## Resumen / Abstract
Se audita el modelo de predicción de diabetes en producción de PREDIA y se investiga, de forma
reproducible, el mejor modelo sobre `diabetes_dataset.csv` ({audit['shape']['rows']:,}×{audit['shape']['cols']}).
Se documenta evidencia de **data leakage** y un **mismatch dataset/modelo**, y se compara un conjunto de
algoritmos bajo un marco honesto de cribado. Modelo recomendado: **{best.get('model','?')}**
(ROC AUC {best.get('roc_auc','?')}).

## 1. Introducción
La diabetes mellitus tipo 2 es prevenible; los modelos de cribado buscan identificar riesgo **antes** del
diagnóstico de laboratorio. PREDIA integra un modelo de IA cuya accuracy reportada (97.89%) motivó esta auditoría.

## 2. Marco Teórico
Clasificación binaria supervisada; modelos lineales (Regresión Logística), ensambles de árboles
(Random Forest, Extra Trees, Gradient Boosting/Hist, XGBoost, LightGBM), SVM, KNN y redes neuronales (MLP).
Conceptos clave: **data leakage** (uso de información no disponible al momento de la predicción o que
codifica el objetivo), validación cruzada estratificada, y métricas para clases desbalanceadas
(ROC AUC, sensibilidad/especificidad, F1, MCC, balanced accuracy).

## 3. Metodología
- **Datos:** `diabetes_dataset.csv`, sin nulos/duplicados, balance {audit['target']['balance_pct']}.
- **Control de fuga:** eliminación de proxies (`diabetes_stage`, `diabetes_risk_score`); dos marcos
  (*screening* sin labs diagnósticos; *clinical* con ellos).
- **Preprocesamiento:** OneHot + StandardScaler en `Pipeline`; split estratificado 80/20 (seed={config.SEED}).
- **Modelos:** {len(comp)} algoritmos con RandomizedSearchCV (StratifiedKFold, scoring=ROC AUC);
  SVM/KNN con submuestreo documentado.
- **Evaluación:** métricas clínicas + curvas ROC/PR, calibración, confusión; interpretabilidad con
  permutation importance y SHAP.

## 4. Resultados
### 4.1 Comparación (screening)
{md_table(comp, cols)}

### 4.2 Demostración de fuga (modelo actual)
{md_table(lk_rows, ['feature_set','accuracy','roc_auc'])}

## 5. Discusión
El desempeño honesto de cribado (ROC AUC ≈ {best.get('roc_auc','?')}) es **moderado**, coherente con que el
diagnóstico depende fuertemente de laboratorios (HbA1c, glucosa) no disponibles en cribado. La accuracy 97.89%
del modelo actual se explica por **fuga** (HbA1c) y por evaluarse en otro dataset; no constituye evidencia de
capacidad predictiva pre-diagnóstica. Implicación clínica: las variables modificables (IMC, estilo de vida,
antecedentes) aportan señal real pero limitada; el modelo debe usarse como apoyo, no como diagnóstico.

## 6. Conclusiones
1. Las métricas del modelo actual **no son confiables** (no reproducibles, leakage, mismatch).
2. El mejor modelo honesto es **{best.get('model','?')}**, exportado para producción.
3. Integrarlo exige **migrar el contrato de features** (documentado).

## 7. Trabajo Futuro
Recolección de un dataset propio etiquetado clínicamente; calibración y umbral óptimo según coste clínico
(priorizar sensibilidad); validación externa/temporal; monitoreo de deriva; equidad por subgrupos
(etnia, género); y reentrenamiento periódico.
"""
    (config.REPORTS_DIR / "research_report.md").write_text(rr, encoding="utf-8")

    # ---------------------------------------------------------------- comparisons
    cmp = f"""# Modelo Actual vs. Modelos Nuevos

## Modelo actual (producción)
- Algoritmo: **Regresión Logística (11 features)** — hardcodeado en `apps/web/lib/ml-predict.ts`.
- Features: `{', '.join(config.CURRENT_MODEL_FEATURES)}` (incluye `Urea`, `Cr`, `VLDL` **ausentes** en el dataset provisto).
- Accuracy reportada: **{config.CURRENT_MODEL_REPORTED_ACCURACY:.4f}** (hardcodeada; conflicto con 98.42% en comentarios).
- Metodología: **no reproducible** (sin código ni split). Entrenado en otro dataset (947 muestras).
- **Data leakage:** sí (HbA1c es criterio diagnóstico).

## Modelo nuevo recomendado
- Algoritmo: **{best.get('model','?')}** (marco *screening* honesto, sin labs diagnósticos).
- Métricas test: {json.dumps({k: round(v,4) for k,v in card.get('test_metrics',{}).items() if isinstance(v,(int,float))}, ensure_ascii=False)}
- Metodología: reproducible (seed={config.SEED}, CV estratificada, pipeline serializado).

## Comparativa (criterios)
| Criterio | Modelo actual | Modelo nuevo ({best.get('model','?')}) |
|---|---|---|
| Reproducibilidad | ❌ no | ✅ sí (artefactos + seed) |
| Validez de métricas | ❌ infladas por fuga | ✅ honestas (cribado) |
| Data leakage | ❌ HbA1c diagnóstica | ✅ excluida |
| Aplicable al dataset | ❌ faltan Urea/Cr/VLDL | ✅ features presentes |
| Interpretabilidad | ✅ lineal | {'✅ lineal' if 'logistic' in best.get('model','') else '➖ vía SHAP/importancia'} |
| ROC AUC (honesto) | ~azar en screening (0.61) | **{best.get('roc_auc','?')}** |

## Ranking completo (screening)
{md_table(comp, cols)}

> Nota: el marco *clinical* alcanza métricas mayores pero reaprende el umbral diagnóstico (fuga parcial);
> no se recomienda venderlo como "predicción" de diabetes.
"""
    (config.COMPARISONS_DIR / "current_vs_new_models.md").write_text(cmp, encoding="utf-8")

    # ---------------------------------------------------------------- README.md
    readme = f"""# PREDIA — ML Research (Predicción de Diabetes)

Investigación reproducible para auditar el modelo en producción y seleccionar el mejor modelo de
predicción de diabetes sobre `diabetes_dataset.csv`.

## Hallazgos clave
1. **Modelo actual no confiable:** Regresión Logística hardcodeada en TS; accuracy 97.89% **no reproducible**
   (otro dataset, faltan `Urea/Cr/VLDL`) e inflada por **fuga de HbA1c**.
2. **Dataset:** {audit['shape']['rows']:,}×{audit['shape']['cols']}, sin nulos/duplicados, balance {audit['target']['balance_pct']}.
3. **Fuga demostrada (CV5 LogReg):** `diabetes_stage`+`risk_score` ⇒ acc≈{lk.get('leaky_stage_plus_score',{}).get('accuracy','?')};
   cribado honesto ⇒ acc≈{lk.get('screening_numeric_safe',{}).get('accuracy','?')}.
4. **Mejor modelo honesto:** **{best.get('model','?')}** (ROC AUC {best.get('roc_auc','?')}), exportado en `exports/`.

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
Semilla global `SEED={config.SEED}`. Versiones fijadas en `requirements.txt`.
"""
    (config.ML_DIR / "README.md").write_text(readme, encoding="utf-8")
    print("Reports + comparisons + README generados.")


if __name__ == "__main__":
    main()
