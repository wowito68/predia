"""Configuración central del Temporal Clinical Evolution Framework (FASE 2).

Reutiliza la taxonomía y las constantes clínicas del motor de evolución ya existente
en `apps/web/lib/evolution/config.ts` (κ, ω, CV_max, μ) — ver fundamentos en
`docs/clinical-evolution-score.md` — y las extiende para el índice CES 0-100 de la
Fase 2D, que combina TENDENCIA + ESTADO clínico actual.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

SEED = 42
DAYS_PER_MONTH = 30

# ----------------------------------------------------------------------------
# Rutas
# ----------------------------------------------------------------------------
PKG_DIR = Path(__file__).resolve().parent                  # src/predia_temporal
TCF_DIR = PKG_DIR.parents[1]                                # temporal_clinical_framework
ML_DIR = TCF_DIR.parent                                    # ml-research
REPO_DIR = ML_DIR.parent

DATASETS_DIR = TCF_DIR / "datasets"
NOTEBOOKS_DIR = TCF_DIR / "notebooks"
FIGURES_DIR = TCF_DIR / "figures"
DASHBOARDS_DIR = TCF_DIR / "dashboards"
METRICS_DIR = TCF_DIR / "metrics"

for _d in (DATASETS_DIR, NOTEBOOKS_DIR, FIGURES_DIR, DASHBOARDS_DIR, METRICS_DIR):
    _d.mkdir(parents=True, exist_ok=True)


def fig_dir(phase: str) -> Path:
    d = FIGURES_DIR / phase
    d.mkdir(parents=True, exist_ok=True)
    return d


# ----------------------------------------------------------------------------
# Variables clínicas (idénticas a lib/evolution/config.ts)
# ----------------------------------------------------------------------------
@dataclass(frozen=True)
class VarConfig:
    key: str
    label: str
    unidad: str
    kappa: float        # cambio mensual "clínicamente fuerte" (ancla del trend)
    omega: float        # peso en el CES direccional (0 = se reporta pero no puntúa)
    lower_is_better: bool
    # Banda objetivo de control para el componente de ESTADO (Fase 2D)
    target_lo: float
    target_hi: float


EVOLUTION_VARS = [
    VarConfig("glucosa", "Glucosa", "mg/dL", 10, 0.40, True, 70, 110),
    VarConfig("imc",     "IMC",     "kg/m²", 0.5, 0.25, True, 18.5, 25),
    VarConfig("pas",     "PA sistólica", "mmHg", 5, 0.20, True, 90, 120),
    VarConfig("pad",     "PA diastólica", "mmHg", 3, 0.15, True, 60, 80),
    VarConfig("peso",    "Peso",    "kg", 1, 0.0, True, 50, 80),
    VarConfig("hba1c",   "HbA1c",   "%",  0.5, 0.0, True, 4.0, 5.7),
]
VAR_BY_KEY = {v.key: v for v in EVOLUTION_VARS}
SERIES_KEYS = ["peso", "imc", "glucosa", "pas", "pad", "riesgo"]  # series modeladas (Fase 2A)

# Constantes del CES direccional (idénticas al motor existente)
CV_MAX = 0.20
VOL_PENALTY = 0.5          # μ
MIN_SPAN_DAYS = 14

# Ventanas rolling (Fase 2B)
ROLLING_WINDOWS_DAYS = [7, 30, 90, 180]

# ----------------------------------------------------------------------------
# Clinical Evolution Score 0-100 (Fase 2D) — bandas e interpretación
# ----------------------------------------------------------------------------
# CES = 100 * (W_STATE * G + W_TREND * E), con G=estado actual∈[0,1],
# E=(1+W)/2 evolución∈[0,1] (del motor existente). Pesos:
W_STATE = 0.5
W_TREND = 0.5

CES_BANDS = [   # (umbral_inferior, etiqueta)
    (80, "Excelente evolución"),
    (60, "Estable"),
    (40, "Riesgo moderado"),
    (20, "Riesgo alto"),
    (0,  "Deterioro severo"),
]


def ces_band(ces: float) -> str:
    for lo, label in CES_BANDS:
        if ces >= lo:
            return label
    return CES_BANDS[-1][1]


# Variables que contribuyen al componente de ESTADO y su peso (incluye actividad y riesgo ML)
STATE_WEIGHTS = {
    "glucosa": 0.30,
    "imc": 0.20,
    "pas": 0.15,
    "pad": 0.10,
    "actividad": 0.10,   # min/semana de actividad física (más es mejor)
    "riesgo": 0.15,      # probabilidad de diabetes del modelo de FASE 1 (menos es mejor)
}
ACTIVITY_TARGET_MIN = 150  # min/semana (OMS) -> estado óptimo

# ----------------------------------------------------------------------------
# Arquetipos de evolución para la cohorte sintética (Fase 2A) y validación (2F/2I)
# ----------------------------------------------------------------------------
ARCHETYPES = [
    "Mejora rápida",
    "Estable",
    "Deterioro lento",
    "Alto riesgo persistente",
    "Oscilante",
]

TREND_CLASSES = ["Mejorando", "Estable", "Empeorando", "Oscilante"]
