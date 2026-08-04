# Investigación: Predicción de Diabetes para PREDIA

> Reporte académico. Generado desde artefactos reproducibles (seed=42).

## Resumen / Abstract
Se audita el modelo de predicción de diabetes en producción de PREDIA y se investiga, de forma
reproducible, el mejor modelo sobre `diabetes_dataset.csv` (100,000×31).
Se documenta evidencia de **data leakage** y un **mismatch dataset/modelo**, y se compara un conjunto de
algoritmos bajo un marco honesto de cribado. Modelo recomendado: **logistic_regression**
(ROC AUC 0.6591).

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
- **Datos:** `diabetes_dataset.csv`, sin nulos/duplicados, balance {'1': 59.998, '0': 40.002}.
- **Control de fuga:** eliminación de proxies (`diabetes_stage`, `diabetes_risk_score`); dos marcos
  (*screening* sin labs diagnósticos; *clinical* con ellos).
- **Preprocesamiento:** OneHot + StandardScaler en `Pipeline`; split estratificado 80/20 (seed=42).
- **Modelos:** 9 algoritmos con RandomizedSearchCV (StratifiedKFold, scoring=ROC AUC);
  SVM/KNN con submuestreo documentado.
- **Evaluación:** métricas clínicas + curvas ROC/PR, calibración, confusión; interpretabilidad con
  permutation importance y SHAP.

## 4. Resultados
### 4.1 Comparación (screening)
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

### 4.2 Demostración de fuga (modelo actual)
| feature_set | accuracy | roc_auc |
| --- | --- | --- |
| hba1c_only | 0.852 | 0.9325 |
| glucose_fasting_only | 0.7307 | 0.8082 |
| diagnostic_labs | 0.8567 | 0.9337 |
| leaky_stage_plus_score | 0.9979 | 0.9974 |
| screening_numeric_safe | 0.6163 | 0.6121 |

## 5. Discusión
El desempeño honesto de cribado (ROC AUC ≈ 0.6591) es **moderado**, coherente con que el
diagnóstico depende fuertemente de laboratorios (HbA1c, glucosa) no disponibles en cribado. La accuracy 97.89%
del modelo actual se explica por **fuga** (HbA1c) y por evaluarse en otro dataset; no constituye evidencia de
capacidad predictiva pre-diagnóstica. Implicación clínica: las variables modificables (IMC, estilo de vida,
antecedentes) aportan señal real pero limitada; el modelo debe usarse como apoyo, no como diagnóstico.

## 6. Conclusiones
1. Las métricas del modelo actual **no son confiables** (no reproducibles, leakage, mismatch).
2. El mejor modelo honesto es **logistic_regression**, exportado para producción.
3. Integrarlo exige **migrar el contrato de features** (documentado).

## 7. Trabajo Futuro
Recolección de un dataset propio etiquetado clínicamente; calibración y umbral óptimo según coste clínico
(priorizar sensibilidad); validación externa/temporal; monitoreo de deriva; equidad por subgrupos
(etnia, género); y reentrenamiento periódico.
