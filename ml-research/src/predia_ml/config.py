"""Configuración central y reproducible del proyecto de investigación ML de PREDIA.

Define rutas, semilla global y — lo más importante — la **taxonomía de features
con control de fuga de información (data leakage)**, que es el eje de un análisis
honesto sobre este dataset.
"""
from __future__ import annotations

from pathlib import Path

# ----------------------------------------------------------------------------
# Reproducibilidad
# ----------------------------------------------------------------------------
SEED: int = 42

# ----------------------------------------------------------------------------
# Rutas (todas relativas a la ubicación del paquete, robustas al cwd)
# ----------------------------------------------------------------------------
PKG_DIR = Path(__file__).resolve().parent          # ml-research/src/predia_ml
ML_DIR = PKG_DIR.parents[1]                          # ml-research
REPO_DIR = ML_DIR.parent                             # raíz del repo PREDIA

DATASET_PATH = REPO_DIR / "diabetes_dataset.csv"
CURRENT_MODEL_DIR = REPO_DIR / "apps" / "web" / "models"

DATASETS_DIR = ML_DIR / "datasets"
MODELS_DIR = ML_DIR / "models"
FIGURES_DIR = ML_DIR / "figures"
METRICS_DIR = ML_DIR / "metrics"
EXPORTS_DIR = ML_DIR / "exports"
COMPARISONS_DIR = ML_DIR / "comparisons"
REPORTS_DIR = ML_DIR / "reports"
NOTEBOOKS_DIR = ML_DIR / "notebooks"

for _d in (DATASETS_DIR, MODELS_DIR, FIGURES_DIR, METRICS_DIR, EXPORTS_DIR,
           COMPARISONS_DIR, REPORTS_DIR, NOTEBOOKS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ----------------------------------------------------------------------------
# Variable objetivo
# ----------------------------------------------------------------------------
TARGET = "diagnosed_diabetes"

# ----------------------------------------------------------------------------
# Taxonomía de columnas (control de fuga)
# ----------------------------------------------------------------------------
# FUGA DIRECTA — se eliminan SIEMPRE. Son el diagnóstico mismo o un proxy derivado.
LEAKY_COLS = [
    "diabetes_stage",        # categoría del diagnóstico (Type 2 / Pre-Diabetes / ...)
    "diabetes_risk_score",   # score de riesgo derivado (proxy del objetivo)
]

# LABORATORIOS DIAGNÓSTICOS — son criterios oficiales de diagnóstico de diabetes
# (ADA): incluirlos como predictores hace que el modelo "reaprenda" el umbral
# diagnóstico => fuga parcial. Se EXCLUYEN en el modelo de cribado (screening) y
# se INCLUYEN (con advertencia explícita) en el modelo clínico.
DIAGNOSTIC_LABS = [
    "hba1c",
    "glucose_fasting",
    "glucose_postprandial",
    "insulin_level",
]

# Categóricas nominales (requieren one-hot encoding)
CATEGORICAL_COLS = [
    "gender",
    "ethnicity",
    "education_level",
    "income_level",
    "employment_status",
    "smoking_status",
]

# Binarias ya codificadas 0/1
BINARY_COLS = [
    "family_history_diabetes",
    "hypertension_history",
    "cardiovascular_history",
]

# Numéricas NO diagnósticas (seguras para cribado)
NUMERIC_SAFE_COLS = [
    "age",
    "alcohol_consumption_per_week",
    "physical_activity_minutes_per_week",
    "diet_score",
    "sleep_hours_per_day",
    "screen_time_hours_per_day",
    "bmi",
    "waist_to_hip_ratio",
    "systolic_bp",
    "diastolic_bp",
    "heart_rate",
    "cholesterol_total",
    "hdl_cholesterol",
    "ldl_cholesterol",
    "triglycerides",
]


def feature_columns(mode: str) -> list[str]:
    """Devuelve las columnas predictoras según el encuadre del modelo.

    mode='screening' : sin laboratorios diagnósticos (modelo pre-laboratorio, honesto).
    mode='clinical'  : incluye laboratorios diagnósticos (más preciso, fuga parcial).
    """
    base = CATEGORICAL_COLS + BINARY_COLS + NUMERIC_SAFE_COLS
    if mode == "screening":
        return base
    if mode == "clinical":
        return base + DIAGNOSTIC_LABS
    raise ValueError(f"mode inválido: {mode!r} (usa 'screening' o 'clinical')")


def numeric_columns(mode: str) -> list[str]:
    base = list(NUMERIC_SAFE_COLS)
    return base + DIAGNOSTIC_LABS if mode == "clinical" else base


# ----------------------------------------------------------------------------
# Modelo ACTUAL de PREDIA (para la auditoría forense)
# ----------------------------------------------------------------------------
# Features con las que se entrenó el modelo en producción (Iraqi/Mendeley dataset),
# NO presentes (algunas) en diabetes_dataset.csv -> evidencia del mismatch.
CURRENT_MODEL_FEATURES = [
    "Gender", "AGE", "Urea", "Cr", "HbA1c", "Chol", "TG", "HDL", "LDL", "VLDL", "BMI",
]
CURRENT_MODEL_REPORTED_ACCURACY = 0.9789473684210527  # del seed / modelo_metadata.json
