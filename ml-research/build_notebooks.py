"""Genera los 14 notebooks de la investigación a partir de artefactos reales.

Cada notebook importa `predia_ml`, carga los artefactos (metrics/*.json, figures/*,
models/*.joblib, splits) y los muestra. Los notebooks de modelo cargan el modelo ya
entrenado y recalculan métricas/figuras en ejecución (rápido y reproducible), evitando
re-tunear en cada notebook.

Tras generarlos se ejecutan con: jupyter nbconvert --execute --inplace
"""
from __future__ import annotations

import nbformat as nbf
from nbformat.v4 import new_code_cell, new_markdown_cell, new_notebook

from predia_ml import config

NB = config.NOTEBOOKS_DIR

HEADER = (
    "import sys, os, json\n"
    "sys.path.insert(0, os.path.abspath('../src'))\n"
    "import warnings; warnings.simplefilter('ignore')\n"
    "import numpy as np, pandas as pd, joblib\n"
    "import matplotlib.pyplot as plt\n"
    "from IPython.display import Image, display, Markdown\n"
    "from predia_ml import config, data, evaluate, plots\n"
    "pd.set_option('display.max_columns', 60)\n"
)


def _intro(objetivo, fundamento, ventajas, limitaciones, casos):
    return (
        "## Introducción\n\n"
        f"**Objetivo.** {objetivo}\n\n"
        f"**Fundamento teórico.** {fundamento}\n\n"
        f"**Ventajas.** {ventajas}\n\n"
        f"**Limitaciones.** {limitaciones}\n\n"
        f"**Casos de uso.** {casos}\n"
    )


def write(name: str, cells: list):
    nb = new_notebook()
    nb.cells = cells
    nb.metadata = {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python"},
    }
    path = NB / name
    with open(path, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    return path


def md(t):
    return new_markdown_cell(t)


def code(t):
    return new_code_cell(t)


# ============================================================ 01 audit
def nb01():
    return [
        md("# 01 — Auditoría del Dataset\n\nPREDIA · Investigación de modelos de predicción de diabetes"),
        md(_intro(
            "Caracterizar la estructura y calidad de `diabetes_dataset.csv` antes de modelar.",
            "Una auditoría de datos verifica integridad (nulos, duplicados), tipos, cardinalidad, "
            "outliers y balance de clases; condiciona todas las decisiones posteriores.",
            "Detecta problemas (fuga, desbalanceo, outliers) temprano y de forma objetiva.",
            "No reemplaza el conocimiento de dominio; las correlaciones no implican causalidad.",
            "Primer paso obligatorio de cualquier proyecto de ML clínico reproducible.")),
        code(HEADER),
        code("df = data.load_raw()\n"
             "audit = json.load(open(config.METRICS_DIR/'dataset_audit.json'))\n"
             "print('Shape:', audit['shape'])\n"
             "print('Nulos totales:', audit['total_nulls'], '| Duplicados:', audit['n_duplicated_rows'])\n"
             "df.head()"),
        md("### Variable objetivo y balance de clases"),
        code("print('Objetivo:', audit['target']['name'])\n"
             "print('Conteos:', audit['target']['counts'])\n"
             "print('Balance %:', audit['target']['balance_pct'], '| ratio:', audit['target']['imbalance_ratio'])\n"
             "display(Image(filename=str(config.FIGURES_DIR/'eda'/'class_balance.png')))"),
        md("### Tipos, cardinalidad y nulos"),
        code("meta = pd.DataFrame({'dtype': audit['dtypes'], 'cardinalidad': audit['cardinality'], 'nulos': audit['nulls']})\n"
             "meta"),
        md("### Outliers (IQR) de variables numéricas"),
        code("out = pd.DataFrame(audit['outliers']).T[['n_outliers','pct_outliers','min','max','mean','std']]\n"
             "out.sort_values('pct_outliers', ascending=False).head(15)"),
        md("### Correlación con el objetivo — primera señal de fuga\n"
           "Las variables más correlacionadas son **laboratorios diagnósticos** (hba1c, glucosa), "
           "lo que anticipa fuga de información si se usan como predictores."),
        code("pd.Series(audit['abs_corr_with_target']).head(12).to_frame('|corr| con objetivo')"),
        md("### Hallazgos clave\n"
           "- 100,000 filas × 31 columnas, **sin nulos ni duplicados**.\n"
           "- Objetivo `diagnosed_diabetes` con balance ~60/40 (ratio 1.5, desbalanceo leve).\n"
           "- `diabetes_stage` y `diabetes_risk_score` son **proxies del objetivo** (fuga directa).\n"
           "- `hba1c`, `glucose_*`, `insulin_level` son **criterios diagnósticos** (fuga parcial)."),
    ]


# ============================================================ 02 EDA
def nb02():
    return [
        md("# 02 — Análisis Exploratorio de Datos (EDA)"),
        md(_intro(
            "Explorar distribuciones, relaciones y separabilidad de clases.",
            "El EDA usa visualización y estadística descriptiva para formular hipótesis y detectar fuga.",
            "Revela estructura, outliers y variables informativas/fugadas.",
            "Subjetivo; sensible a escalas y al binning de histogramas.",
            "Guía el preprocesamiento y la selección de variables.")),
        code(HEADER),
        md("### Balance de clases"),
        code("display(Image(filename=str(config.FIGURES_DIR/'eda'/'class_balance.png')))"),
        md("### Distribuciones de variables numéricas clave"),
        code("display(Image(filename=str(config.FIGURES_DIR/'eda'/'histograms.png')))"),
        md("### Laboratorios diagnósticos por clase (separabilidad ⇒ fuga)\n"
           "La fuerte separación de `hba1c`/`glucose_*` entre clases es la huella del leakage."),
        code("display(Image(filename=str(config.FIGURES_DIR/'eda'/'diagnostic_by_class.png')))"),
        md("### Matriz de correlación"),
        code("display(Image(filename=str(config.FIGURES_DIR/'eda'/'correlation_heatmap.png')))"),
        md("### Correlación con el objetivo (rojo = variables de fuga/diagnóstico)"),
        code("display(Image(filename=str(config.FIGURES_DIR/'eda'/'leakage_correlation.png')))"),
    ]


# ============================================================ 03 preprocessing
def nb03():
    return [
        md("# 03 — Preprocesamiento (con control de fuga)"),
        md(_intro(
            "Definir features, codificación, escalado y splits evitando fuga de información.",
            "Estandarización (z-score), one-hot para nominales y separación train/test estratificada "
            "son prácticas estándar; el control de fuga es lo distintivo aquí.",
            "Pipeline reproducible; impide que información del test contamine el entrenamiento.",
            "El one-hot aumenta dimensionalidad; el escalado asume relaciones aproximadamente lineales para algunos modelos.",
            "Base común para entrenar y comparar todos los modelos.")),
        code(HEADER),
        md("### Taxonomía de variables (decisión central del proyecto)\n"
           "- **Fuga directa (se eliminan siempre):** `diabetes_stage`, `diabetes_risk_score`.\n"
           "- **Laboratorios diagnósticos (excluidos en *screening*):** `hba1c`, `glucose_fasting`, `glucose_postprandial`, `insulin_level`.\n"
           "- **Marco *screening* (honesto, producción):** demografía, estilo de vida, antropometría, presión, lípidos, antecedentes.\n"
           "- **Marco *clinical*:** *screening* + laboratorios diagnósticos (más preciso, fuga parcial)."),
        code("from predia_ml import preprocess\n"
             "print('Screening features:', config.feature_columns('screening'))\n"
             "print('\\nClinical features:', config.feature_columns('clinical'))\n"
             "print('\\nFUGA (drop):', config.LEAKY_COLS)"),
        code("df = data.load_raw()\n"
             "X, y = preprocess.make_xy(df, 'screening')\n"
             "prep = preprocess.build_preprocessor('screening')\n"
             "Xt = prep.fit_transform(X)\n"
             "print('Matriz transformada:', Xt.shape)\n"
             "print('Ejemplo de features de salida:', list(prep.get_feature_names_out())[:12])"),
        md("Los splits estratificados y reproducibles (seed=42) se guardan en `datasets/split_*.joblib` "
           "y se reutilizan en todos los notebooks de modelo."),
    ]


# ============================================================ model notebooks
MODEL_THEORY = {
    "logistic_regression": ("04", "Regresión Logística",
        "Modelo lineal que estima P(y=1) con la función logística sobre una combinación lineal de features.",
        "Interpretable (coeficientes ≈ log-odds), rápida, buena línea base, probabilidades calibradas.",
        "Asume linealidad en el log-odds; limitada ante interacciones no lineales.",
        "Línea base y herramienta explicable en entornos clínicos."),
    "random_forest": ("05", "Random Forest",
        "Ensamble de árboles de decisión entrenados con bagging y subespacios de features; promedia para reducir varianza.",
        "Captura no linealidades e interacciones; robusto a outliers; da importancia de variables.",
        "Menos interpretable; modelos grandes; puede sesgarse hacia variables de alta cardinalidad.",
        "Tabular de propósito general; buen rendimiento sin mucho tuning."),
    "xgboost": ("06", "XGBoost",
        "Gradient boosting de árboles con regularización y optimizaciones de segundo orden.",
        "Estado del arte en datos tabulares; regularización; manejo eficiente.",
        "Más hiperparámetros; riesgo de sobreajuste sin control; menos interpretable.",
        "Competencias y producción tabular de alto rendimiento."),
    "lightgbm": ("07", "LightGBM",
        "Gradient boosting con crecimiento leaf-wise y binning por histograma, muy eficiente.",
        "Muy rápido y escalable; alta precisión; bajo consumo de memoria.",
        "Sensible a parámetros (num_leaves); puede sobreajustar en datasets pequeños.",
        "Datasets grandes donde la velocidad importa."),
    "svm": ("08", "Support Vector Machine (RBF)",
        "Maximiza el margen entre clases; el kernel RBF permite fronteras no lineales.",
        "Eficaz en espacios de alta dimensión; fronteras flexibles.",
        "Escala mal (O(n²)) — aquí se submuestrea; sensible al escalado; probabilidades vía Platt.",
        "Conjuntos pequeños/medianos con fronteras complejas."),
    "knn": ("09", "K-Nearest Neighbors",
        "Clasifica por mayoría entre los k vecinos más cercanos en el espacio de features.",
        "Simple, no paramétrico, sin fase de entrenamiento explícita.",
        "Predicción costosa; sensible a la escala y a la maldición de la dimensionalidad.",
        "Baselines y problemas con frontera local."),
    "mlp": ("10", "Red Neuronal (MLP)",
        "Perceptrón multicapa: capas densas con activaciones no lineales entrenadas por retropropagación.",
        "Aproxima funciones complejas; flexible.",
        "Requiere más datos y tuning; caja negra; sensible a la escala.",
        "Relaciones no lineales complejas cuando hay suficientes datos."),
}


def nb_model(name):
    num, title, fundamento, ventajas, limitaciones, casos = MODEL_THEORY[name]
    return num, [
        md(f"# {num} — {title}"),
        md(_intro(
            f"Entrenar, evaluar e interpretar **{title}** en el marco *screening* (honesto).",
            fundamento, ventajas, limitaciones, casos)),
        code(HEADER),
        code(f"NAME = '{name}'\n"
             "sp = joblib.load(config.DATASETS_DIR/'split_screening.joblib')\n"
             "X_test, y_test = sp['X_test'], sp['y_test']\n"
             "est = joblib.load(config.MODELS_DIR/f'screening_{NAME}.joblib')\n"
             "meta = json.load(open(config.METRICS_DIR/f'screening_{NAME}.json'))\n"
             "print('Mejores hiperparámetros:'); print(json.dumps(meta['best_params'], indent=2))\n"
             "print('CV ROC AUC:', round(meta['cv_roc_auc'],4), '| fit_time(s):', meta['fit_time_sec'], '| submuestreo:', meta['subsampled'])"),
        md("### Evaluación en test (recalculada en ejecución)"),
        code("y_pred = est.predict(X_test); y_proba = est.predict_proba(X_test)[:,1]\n"
             "m = evaluate.compute_metrics(y_test, y_pred, y_proba)\n"
             "pd.Series({k: round(v,4) for k,v in m.items()}).to_frame('valor')"),
        md("### Curvas ROC, Precision-Recall, matriz de confusión y calibración"),
        code("for kind in ['roc','pr','cm','cal']:\n"
             "    p = config.FIGURES_DIR/'models'/f'{kind}_screening_{NAME}.png'\n"
             "    if p.exists(): display(Image(filename=str(p)))"),
    ]


# ============================================================ 11 comparison
def nb11():
    return [
        md("# 11 — Comparación de Modelos"),
        md(_intro(
            "Comparar todos los modelos del marco *screening* con métricas clínicas.",
            "La comparación multi-métrica (no solo accuracy) evita conclusiones engañosas en datos desbalanceados.",
            "Permite elegir según el objetivo clínico (p. ej. priorizar sensibilidad).",
            "Las métricas dependen del umbral 0.5; conviene analizar curvas y calibración.",
            "Decisión de qué modelo llevar a selección final.")),
        code(HEADER),
        code("comp = pd.read_json(config.METRICS_DIR/'comparison_screening.json').sort_values('roc_auc', ascending=False)\n"
             "comp[['model','accuracy','roc_auc','recall_sensitivity','specificity','f1','mcc','cv_roc_auc','fit_time_sec']].reset_index(drop=True)"),
        md("### ROC comparativa y barras de AUC / sensibilidad"),
        code("for f in ['comparison_roc.png','comparison_auc.png','comparison_recall.png']:\n"
             "    display(Image(filename=str(config.FIGURES_DIR/f)))"),
        md("### Marco *clinical* (con laboratorios diagnósticos): salto por fuga parcial"),
        code("pd.read_json(config.METRICS_DIR/'comparison_clinical.json')[['model','accuracy','roc_auc','recall_sensitivity']]"),
    ]


# ============================================================ 12 current model audit
def nb12():
    return [
        md("# 12 — Auditoría del Modelo ACTUAL de PREDIA\n\n**CRÍTICO.** Validar el 97.89% reportado."),
        md(_intro(
            "Auditar el modelo en producción: algoritmo, features, metodología y validez de sus métricas.",
            "Una auditoría de modelo busca overfitting, data leakage y errores metodológicos que inflen métricas.",
            "Determina si las métricas reportadas son confiables y reproducibles.",
            "Sin el código/datos de entrenamiento original, parte de la auditoría es forense/inferencial.",
            "Gobernanza de modelos en salud (model risk management).")),
        code(HEADER),
        code("aud = json.load(open(config.METRICS_DIR/'current_model_audit.json'))\n"
             "print('PKL:', aud['pkl_inspection'])\n"
             "print('\\nAccuracy reportada (seed/metadata):', aud['reported_accuracy_seed_metadata'])\n"
             "print('Nota:', aud['note_conflicting_metric_in_code'])"),
        md("### 1) Mismatch dataset ↔ modelo\n"
           "El modelo actual usa `Urea`, `Cr`, `VLDL`, **ausentes** en `diabetes_dataset.csv`, y escalas de lípidos "
           "incompatibles (mmol/L vs mg/dL). El modelo en producción fue entrenado con OTRO dataset (947 muestras)."),
        code("print('Features modelo actual:', aud['feature_mismatch']['present_in_dataset'])\n"
             "print('AUSENTES en el dataset provisto:', aud['feature_mismatch']['absent_in_dataset'])"),
        md("### 2) Demostración de fuga (CV5, Regresión Logística)\n"
           "El ~98% solo es reproducible con variables **diagnósticas/fugadas**. Con features honestas de cribado, "
           "un modelo lineal queda **cerca del azar** (base rate 60%)."),
        code("lk = aud['leakage_demonstration_cv5']\n"
             "pd.DataFrame(lk).T.rename(columns={'accuracy':'Accuracy','roc_auc':'ROC AUC'})"),
        md("### Conclusión de la auditoría\n"
           "- El modelo en producción es una **Regresión Logística (11 features)** servida con **coeficientes hardcodeados en TypeScript**; los `.pkl` ni se cargan.\n"
           "- La accuracy 97.89% (hardcodeada en el seed) **no es reproducible** sobre el dataset provisto y proviene de otro conjunto.\n"
           "- `HbA1c` (criterio diagnóstico ADA) como predictor es **fuga**: por sí sola da acc≈0.85 / AUC≈0.93.\n"
           "- `diabetes_stage`+`risk_score` ⇒ acc≈0.998 (fuga total).\n"
           "- **Veredicto: las métricas actuales NO son confiables.**"),
    ]


# ============================================================ 13 final selection
def nb13():
    return [
        md("# 13 — Selección Final del Modelo"),
        md(_intro(
            "Seleccionar el modelo recomendado para PREDIA con criterios clínicos y operativos.",
            "La selección balancea desempeño (AUC, sensibilidad), robustez, interpretabilidad y coste.",
            "Decisión trazable y justificada para producción.",
            "Depende del marco de features elegido (screening honesto vs clinical).",
            "Cierre del ciclo experimental antes de desplegar.")),
        code(HEADER),
        code("comp = pd.read_json(config.METRICS_DIR/'comparison_screening.json').sort_values('roc_auc', ascending=False)\n"
             "card = json.load(open(config.EXPORTS_DIR/'model_card.json'))\n"
             "print('Modelo seleccionado:', card['model_name'], '| marco:', card['framing'])\n"
             "comp[['model','roc_auc','recall_sensitivity','specificity','f1','mcc']].reset_index(drop=True)"),
        md("### Interpretabilidad: Permutation Importance"),
        code("display(Image(filename=str(config.FIGURES_DIR/'interpretability'/'permutation_importance.png')))\n"
             "pd.read_json(config.METRICS_DIR/'permutation_importance.json').head(10)"),
        md("### Interpretabilidad: SHAP"),
        code("p = config.FIGURES_DIR/'interpretability'/'shap_summary.png'\n"
             "display(Image(filename=str(p))) if p.exists() else print('SHAP no disponible')"),
        md("### Implicaciones clínicas\n"
           "Las variables más influyentes (antropometría, antecedentes, estilo de vida) son **modificables/registrables** "
           "sin laboratorio, lo que da valor real al cribado. Riesgo de interpretación: importancia ≠ causalidad."),
    ]


# ============================================================ 14 production pipeline
def nb14():
    return [
        md("# 14 — Pipeline de Producción"),
        md(_intro(
            "Empaquetar y documentar el modelo final para integrarlo en PREDIA.",
            "Un pipeline serializado (preprocesamiento + modelo) garantiza consistencia train/serving.",
            "Reproducible, versionado y fácil de servir; evita 'training-serving skew'.",
            "Debe re-entrenarse periódicamente; monitorear deriva de datos.",
            "Despliegue del modelo en la API de PREDIA.")),
        code(HEADER),
        code("card = json.load(open(config.EXPORTS_DIR/'model_card.json'))\n"
             "print(json.dumps(card, indent=2, ensure_ascii=False))"),
        md("### Carga del pipeline y predicción de ejemplo (extremo a extremo)"),
        code("est = joblib.load(config.EXPORTS_DIR/'predia_diabetes_model.joblib')\n"
             "df = data.load_raw()\n"
             "from predia_ml import preprocess\n"
             "X, y = preprocess.make_xy(df, 'screening')\n"
             "ejemplo = X.iloc[[0, 1, 2]]\n"
             "proba = est.predict_proba(ejemplo)[:,1]\n"
             "pd.DataFrame({'pred': est.predict(ejemplo), 'P(diabetes)': proba.round(4), 'real': y.iloc[:3].values})"),
        md("### Integración con PREDIA\n"
           "El pipeline recibe el **dataframe crudo de features de cribado** (sin labs diagnósticos) y devuelve "
           "probabilidad + clase. La migración del endpoint `/api/predicciones/nueva` al nuevo contrato de features "
           "se documenta en `reports/model_report.md` y `comparisons/current_vs_new_models.md`."),
    ]


def main():
    write("01_dataset_audit.ipynb", nb01())
    write("02_exploratory_data_analysis.ipynb", nb02())
    write("03_data_preprocessing.ipynb", nb03())
    for name in ["logistic_regression", "random_forest", "xgboost", "lightgbm", "svm", "knn", "mlp"]:
        num, cells = nb_model(name)
        write(f"{num}_{name}.ipynb", cells)
    write("11_model_comparison.ipynb", nb11())
    write("12_current_model_audit.ipynb", nb12())
    write("13_final_model_selection.ipynb", nb13())
    write("14_production_pipeline.ipynb", nb14())
    print("14 notebooks generados en", NB)


if __name__ == "__main__":
    main()
