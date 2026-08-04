# Modelo Actual vs. Modelos Nuevos

## Modelo actual (producción)
- Algoritmo: **Regresión Logística (11 features)** — hardcodeado en `apps/web/lib/ml-predict.ts`.
- Features: `Gender, AGE, Urea, Cr, HbA1c, Chol, TG, HDL, LDL, VLDL, BMI` (incluye `Urea`, `Cr`, `VLDL` **ausentes** en el dataset provisto).
- Accuracy reportada: **0.9789** (hardcodeada; conflicto con 98.42% en comentarios).
- Metodología: **no reproducible** (sin código ni split). Entrenado en otro dataset (947 muestras).
- **Data leakage:** sí (HbA1c es criterio diagnóstico).

## Modelo nuevo recomendado
- Algoritmo: **logistic_regression** (marco *screening* honesto, sin labs diagnósticos).
- Métricas test: {"accuracy": 0.6044, "balanced_accuracy": 0.6136, "precision": 0.7144, "recall_sensitivity": 0.5675, "specificity": 0.6597, "f1": 0.6325, "mcc": 0.2229, "tn": 5278, "fp": 2722, "fn": 5190, "tp": 6810, "roc_auc": 0.6591}
- Metodología: reproducible (seed=42, CV estratificada, pipeline serializado).

## Comparativa (criterios)
| Criterio | Modelo actual | Modelo nuevo (logistic_regression) |
|---|---|---|
| Reproducibilidad | ❌ no | ✅ sí (artefactos + seed) |
| Validez de métricas | ❌ infladas por fuga | ✅ honestas (cribado) |
| Data leakage | ❌ HbA1c diagnóstica | ✅ excluida |
| Aplicable al dataset | ❌ faltan Urea/Cr/VLDL | ✅ features presentes |
| Interpretabilidad | ✅ lineal | ✅ lineal |
| ROC AUC (honesto) | ~azar en screening (0.61) | **0.6591** |

## Ranking completo (screening)
| model | accuracy | roc_auc | recall_sensitivity | specificity | f1 | mcc | cv_roc_auc |
| --- | --- | --- | --- | --- | --- | --- | --- |
| logistic_regression | 0.6044 | 0.6591 | 0.5675 | 0.6597 | 0.6325 | 0.2229 | 0.661 |
| hist_gradient_boosting | 0.631 | 0.6579 | 0.8391 | 0.3189 | 0.7318 | 0.1856 | 0.6591 |
| xgboost | 0.6289 | 0.6573 | 0.8317 | 0.3246 | 0.7289 | 0.1817 | 0.6587 |
| lightgbm | 0.628 | 0.6558 | 0.8387 | 0.3119 | 0.7301 | 0.1776 | 0.6574 |
| random_forest | 0.6244 | 0.6549 | 0.8848 | 0.234 | 0.7387 | 0.1576 | 0.6573 |
| extra_trees | 0.6194 | 0.6538 | 0.922 | 0.1656 | 0.7441 | 0.1356 | 0.6551 |
| mlp | 0.6244 | 0.653 | 0.7937 | 0.3704 | 0.7172 | 0.1807 | 0.6555 |
| svm | 0.6123 | 0.6328 | 0.96 | 0.0907 | 0.7482 | 0.1044 | 0.636 |
| knn | 0.6003 | 0.5845 | 0.8251 | 0.2631 | 0.7124 | 0.1061 | 0.5872 |

> Nota: el marco *clinical* alcanza métricas mayores pero reaprende el umbral diagnóstico (fuga parcial);
> no se recomienda venderlo como "predicción" de diabetes.
