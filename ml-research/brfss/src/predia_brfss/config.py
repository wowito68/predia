"""Configuración central y reproducible del framework de estratificación de riesgo
de diabetes sobre BRFSS 2015 (CDC Diabetes Health Indicators).

A diferencia del dataset sintético de `predia_ml`, BRFSS es una encuesta
epidemiológica real: 21 indicadores de salud auto-reportados, todos ya codificados
numéricamente, y una prevalencia poblacional real de diabetes (~13.9%). NO hay fuga
diagnóstica (no contiene HbA1c ni glucosa): es un escenario de *cribado* honesto.
"""
from __future__ import annotations

from pathlib import Path

# ----------------------------------------------------------------------------
# Reproducibilidad
# ----------------------------------------------------------------------------
SEED: int = 42

# ----------------------------------------------------------------------------
# Rutas (robustas al cwd)
# ----------------------------------------------------------------------------
PKG_DIR = Path(__file__).resolve().parent              # brfss/src/predia_brfss
BRFSS_DIR = PKG_DIR.parents[1]                          # brfss/
ML_DIR = BRFSS_DIR.parent                               # ml-research/

DATA_DIR = BRFSS_DIR / "data"
DATASETS_DIR = BRFSS_DIR / "datasets"                   # splits .joblib (regenerables)
MODELS_DIR = BRFSS_DIR / "models"                       # estimadores .joblib (regenerables)
RESULTS_DIR = BRFSS_DIR / "results"
NOTEBOOKS_DIR = BRFSS_DIR / "notebooks"

EDA_DIR = RESULTS_DIR / "eda"
MODELS_RES_DIR = RESULTS_DIR / "models"
CALIB_DIR = RESULTS_DIR / "calibration"
RISK_DIR = RESULTS_DIR / "risk"
EXPLAIN_DIR = RESULTS_DIR / "explainability"
CLINICAL_DIR = RESULTS_DIR / "clinical"

for _d in (DATA_DIR, DATASETS_DIR, MODELS_DIR, RESULTS_DIR, NOTEBOOKS_DIR,
           EDA_DIR, MODELS_RES_DIR, CALIB_DIR, RISK_DIR, EXPLAIN_DIR, CLINICAL_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ----------------------------------------------------------------------------
# Ficheros del dataset (Kaggle: alexteboul/diabetes-health-indicators-dataset)
# ----------------------------------------------------------------------------
FILE_BINARY = "diabetes_binary_health_indicators_BRFSS2015.csv"        # 253,680 — prevalencia real 13.9%
FILE_5050 = "diabetes_binary_5050split_health_indicators_BRFSS2015.csv"  # 70,692 — balanceado
FILE_012 = "diabetes_012_health_indicators_BRFSS2015.csv"              # 253,680 — 3 clases

KAGGLE_SLUG = "alexteboul/diabetes-health-indicators-dataset"

TARGET = "Diabetes_binary"
TARGET_012 = "Diabetes_012"

# ----------------------------------------------------------------------------
# Taxonomía de features (las 21 columnas predictoras de BRFSS)
# ----------------------------------------------------------------------------
# Binarias 0/1 (passthrough; el escalado no aplica)
BINARY_COLS = [
    "HighBP", "HighChol", "CholCheck", "Smoker", "Stroke", "HeartDiseaseorAttack",
    "PhysActivity", "Fruits", "Veggies", "HvyAlcoholConsump", "AnyHealthcare",
    "NoDocbcCost", "DiffWalk", "Sex",
]

# Ordinales / continuas (se estandarizan para LR/SVM/KNN/MLP)
NUMERIC_COLS = [
    "BMI",        # índice de masa corporal (continuo)
    "GenHlth",    # salud general percibida 1(excelente)-5(mala)
    "MentHlth",   # días de mala salud mental últimos 30
    "PhysHlth",   # días de mala salud física últimos 30
    "Age",        # grupo etario 1(18-24)..13(80+)
    "Education",  # nivel educativo 1-6
    "Income",     # nivel de ingreso 1-8
]

FEATURES = BINARY_COLS + NUMERIC_COLS  # 21 predictores


def feature_columns() -> list[str]:
    return list(FEATURES)


# ----------------------------------------------------------------------------
# Agrupación epidemiológica (para el análisis por dominios de la Fase 1A)
# ----------------------------------------------------------------------------
FEATURE_GROUPS = {
    "Cardiometabólico / cardiovascular": [
        "HighBP", "HighChol", "CholCheck", "BMI", "Stroke", "HeartDiseaseorAttack",
    ],
    "Conductual / estilo de vida": [
        "Smoker", "PhysActivity", "Fruits", "Veggies", "HvyAlcoholConsump",
    ],
    "Estado de salud / funcionalidad": [
        "GenHlth", "MentHlth", "PhysHlth", "DiffWalk",
    ],
    "Socioeconómico / acceso": [
        "AnyHealthcare", "NoDocbcCost", "Education", "Income",
    ],
    "Demográfico": ["Sex", "Age"],
}

# ----------------------------------------------------------------------------
# Estratificación de riesgo clínico (4 niveles)
# ----------------------------------------------------------------------------
RISK_LEVELS = ["Bajo", "Moderado", "Alto", "Muy Alto"]
RISK_ACTIONS = {
    "Bajo": "Seguimiento normal",
    "Moderado": "Educación y cambios de hábitos",
    "Alto": "Evaluación clínica prioritaria",
    "Muy Alto": "Referencia médica inmediata",
}
RISK_COLORS = {
    "Bajo": "#2E7D32", "Moderado": "#F9A825", "Alto": "#EF6C00", "Muy Alto": "#C62828",
}
