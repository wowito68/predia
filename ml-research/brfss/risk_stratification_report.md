# Explainable Diabetes Risk Stratification Framework — BRFSS 2015
### Reporte de la Fase 1 (PREDIA · motor de soporte a la decisión clínica)

> El objetivo de este trabajo **no es maximizar la *accuracy*** de un clasificador
> binario, sino construir un sistema que convierta la probabilidad de un modelo de
> ML en **niveles de riesgo clínicos interpretables y validados** (Bajo / Moderado /
> Alto / Muy Alto), apto para integrarse en PREDIA.

---

## 1. Datos y metodología

**Dataset:** *CDC Diabetes Health Indicators* (BRFSS 2015, Kaggle
`alexteboul/diabetes-health-indicators-dataset`). Encuesta poblacional de los CDC.

- `diabetes_binary_health_indicators` — **253,680 encuestados**, 21
  indicadores, prevalencia **real 13.9%**
  → **dataset primario** (la prevalencia real es imprescindible para que las
  probabilidades calibradas y los OR/RR sean clínicamente interpretables).
- `diabetes_binary_5050split` — versión balanceada 50/50 (análisis de sensibilidad).
- `diabetes_012` — 3 clases (No-DM / Prediabetes / Diabetes), gradiente natural de riesgo.

Sin valores nulos. ~9.542% de filas duplicadas (encuestados
distintos con respuestas idénticas; **se conservan** para no sesgar la prevalencia).

**Diseño experimental (anti-optimismo):** split estratificado **60/20/20**
(train/val/test). Tuning con `RandomizedSearchCV` (StratifiedKFold, scoring ROC-AUC)
en *train*; selección de modelo, calibración y derivación de umbrales en *val*;
**validación clínica final en *test* (held-out)**.

**Pipeline reproducible:** paquete `predia_brfss` (reutiliza el zoo de modelos de
`predia_ml`) + scripts `run_eda.py`, `run_training.py`, `run_calibration.py`,
`run_risk_stratification.py`, `run_explainability.py`, `run_clinical_validation.py`.

---

## 2. Análisis exploratorio y epidemiológico (Fase 1A)

Los factores más asociados a diabetes (OR, IC95%) son cardiometabólicos y funcionales.
Existe un gradiente claro por **edad**, **salud general percibida**, **IMC** y un
gradiente **socioeconómico** (ingreso/educación). Variables conductuales (actividad
física, dieta) muestran efecto protector. Detalle en `results/eda/` y `01_EDA_BRFSS.ipynb`.

---

## 3. Comparación de modelos (Fase 1B)

9 algoritmos (LogReg, RandomForest, ExtraTrees, HistGB, XGBoost, LightGBM, SVM, KNN, MLP).
Métricas en *validación* (umbral 0.5 para métricas de umbral; el ranking usa ROC-AUC):

| Modelo | ROC-AUC | PR-AUC | F1 | Recall | Espec. | Brier |
| --- | --- | --- | --- | --- | --- | --- |
| xgboost | 0.8283 | 0.4336 | 0.2321 | 0.1451 | 0.9829 | 0.0968 |
| hist_gradient_boosting | 0.828 | 0.4328 | 0.241 | 0.1525 | 0.9817 | 0.0968 |
| lightgbm | 0.8277 | 0.4324 | 0.2502 | 0.1601 | 0.9806 | 0.0968 |
| random_forest | 0.8257 | 0.4304 | 0.1947 | 0.1156 | 0.9884 | 0.0972 |
| mlp | 0.8257 | 0.4275 | 0.2263 | 0.1409 | 0.9831 | 0.0973 |
| logistic_regression | 0.8212 | 0.4003 | 0.4413 | 0.7606 | 0.727 | 0.1766 |
| extra_trees | 0.8211 | 0.4202 | 0.1508 | 0.0856 | 0.9919 | 0.0983 |
| knn | 0.7981 | 0.3733 | 0.1304 | 0.0736 | 0.9912 | 0.1014 |
| svm | 0.6846 | 0.3345 | 0.0872 | 0.047 | 0.9951 | 0.1128 |

**Modelo seleccionado: `xgboost`** (ROC-AUC val = 0.8283).
ROC-AUC ~0.82–0.83 es el techo razonable para indicadores **auto-reportados sin
laboratorios** — un escenario de **cribado honesto** (no hay fuga de HbA1c/glucosa).

---

## 4. Calibración (Fase 1C)

Para que un riesgo de "30%" signifique 30% real, se compara original vs Platt vs
isotónica (ajuste en *val*, fiabilidad en *test*):

| Variante | Brier(val) | ECE(val) | Brier(test) | ECE(test) |
| --- | --- | --- | --- | --- |
| original | 0.09677 | 0.004 | 0.0974 | 0.00444 |
| platt | 0.09852 | 0.02572 | 0.09951 | 0.02854 |
| isotonic | 0.0965 | 0.0 | 0.09746 | 0.00293 |

**Calibración elegida: `isotonic`** (menor ECE en test). La
calibración mejora la fiabilidad sin degradar la discriminación.

---

## 5. Estratificación de riesgo (Fase 1D)

Se comparan 4 métodos de umbralización (sin asumir cortes arbitrarios). Criterio de
elección: **monotonía de prevalencia + bandas no triviales + máxima separación (η²)**.

- **Percentiles poblacionales** (P50/P80/P95)
- **Cuartiles** (Q1/Q2/Q3)
- **Sensibilidad clínica** (ROC: exclusión sens≥0.90 · Youden · inclusión espec≥0.90)
- **Cost-sensitive** (umbral de Bayes; ratios FN:FP 10/4/1.5)

**Método elegido: `cost_sensitive`** — Cost-sensitive (umbral de Bayes, ratios FN:FP 10/4/1.5)
Umbrales sobre probabilidad calibrada: **[0.0909, 0.2, 0.4]**.

| Nivel | Acción clínica |
|---|---|
| **Bajo** | Seguimiento normal |
| **Moderado** | Educación y cambios de hábitos |
| **Alto** | Evaluación clínica prioritaria |
| **Muy Alto** | Referencia médica inmediata |

---

## 6. Explicabilidad (Fase 1E)

SHAP + permutation importance + partial dependence sobre `xgboost`
(SHAP vía `xgboost`).

| Factor | |SHAP| | Dirección |
| --- | --- | --- |
| Salud general percibida | 0.58394 | riesgo |
| Hipertensión arterial | 0.45887 | riesgo |
| Índice de masa corporal (IMC) | 0.39509 | riesgo |
| Grupo etario | 0.35878 | riesgo |
| Colesterol alto | 0.26328 | riesgo |
| Nivel de ingreso | 0.11465 | protector |
| Sexo (0=mujer, 1=hombre) | 0.09535 | riesgo |
| Cardiopatía coronaria o infarto | 0.05411 | riesgo |
| Chequeo de colesterol en 5 años | 0.04987 | riesgo |
| Dificultad para caminar/subir escaleras | 0.04893 | riesgo |

- **Factores de riesgo:** Salud general percibida, Hipertensión arterial, Índice de masa corporal (IMC), Grupo etario, Colesterol alto, Sexo (0=mujer, 1=hombre).
- **Factores protectores:** Nivel de ingreso, Consumo elevado de alcohol, Días de mala salud mental (30d), Nivel educativo, Consume fruta ≥1/día, Actividad física (últimos 30 días).

Las PDP muestran efectos monótonos (riesgo ↑ con IMC, edad y mala salud percibida) e
interacciones plausibles, dando transparencia clínica al motor.

---

## 7. Validación clínica de las bandas (Fase 1F · conjunto TEST held-out)

| Banda | Acción | n | Prevalencia | OR vs Bajo | RR vs Bajo |
| --- | --- | --- | --- | --- | --- |
| Bajo | Seguimiento normal | 26149 | 0.0292 | 1.0 | 1.0 |
| Moderado | Educación y cambios de hábitos | 11877 | 0.1417 | 5.486 | 4.85 |
| Alto | Evaluación clínica prioritaria | 7844 | 0.2913 | 13.658 | 9.97 |
| Muy Alto | Referencia médica inmediata | 4866 | 0.4803 | 30.704 | 16.438 |

**Puntos de operación (cribado ≥ umbral):**

| Decisión | Umbral | Sens | Espec | PPV | NPV | % marcados |
| --- | --- | --- | --- | --- | --- | --- |
| ≥ Moderado | 0.0909 | 0.8919 | 0.5813 | 0.2564 | 0.9708 | 48.46 |
| ≥ Alto | 0.2 | 0.6538 | 0.8148 | 0.3637 | 0.9356 | 25.05 |
| ≥ Muy Alto | 0.4 | 0.3306 | 0.9421 | 0.4803 | 0.8968 | 9.59 |

**Veredicto:** monotonía de prevalencia = **True**, OR creciente =
**True**. La prevalencia pasa de **2.9%** (Bajo) a
**48.0%** (Muy Alto) — un incremento de **×16.45**.
→ **Bandas clínicamente significativas: True.**

---

## 8. Hallazgos

1. Con solo 21 indicadores auto-reportados (sin laboratorios) se logra discriminación
   útil (ROC-AUC ~0.82) y, sobre todo, **probabilidades calibradas** que sostienen una
   estratificación de riesgo válida.
2. Las 4 bandas separan poblaciones con riesgo real marcadamente distinto (×16.45
   entre extremos), con OR/RR crecientes — no son cortes arbitrarios.
3. Los impulsores del riesgo son clínicamente coherentes (cardiometabólicos, edad,
   salud percibida) y hay factores protectores accionables (actividad física, dieta).

## 9. Limitaciones

- **Cribado, no diagnóstico:** el BRFSS no contiene HbA1c/glucosa; el modelo estima
  *probabilidad de diabetes auto-reportada*, no la diagnostica.
- **Auto-reporte y sesgo de supervivencia:** datos de encuesta telefónica (CDC 2015),
  sujetos a sesgo de memoria y de no-respuesta.
- **Transportabilidad:** población de EE. UU. 2015; requiere recalibración antes de
  usarse en la población objetivo de PREDIA (p. ej. México).
- **Causalidad:** OR/RR son asociaciones, no efectos causales.
- **Prediabetes:** el framework primario es binario; el gradiente 012 se usa solo de
  forma exploratoria.

## 10. Aplicaciones clínicas e integración en PREDIA

- **Triaje poblacional:** clasificar pacientes en las 4 bandas para asignar la acción
  correspondiente (seguimiento → educación → evaluación prioritaria → referencia).
- **Motor de soporte a la decisión:** exponer la probabilidad calibrada + banda +
  explicación SHAP por paciente (factores que suben/bajan su riesgo).
- **Integración técnica:** el estimador calibrado (`models/calibrated_best.joblib`) y
  los umbrales (`results/risk/stratification.json`) son artefactos listos para servirse,
  de forma análoga a la capa `lib/risk` ya existente en la app web.
- **Siguiente fase:** recalibración local, validación prospectiva y fusión con señales
  clínicas (laboratorios) cuando estén disponibles.

---

*Artefactos: `results/{eda,models,calibration,risk,explainability,clinical}/` ·
Notebooks: `notebooks/01_EDA_BRFSS … 06_Clinical_Validation.ipynb` · Reproducible con
los scripts `run_*.py`.*
