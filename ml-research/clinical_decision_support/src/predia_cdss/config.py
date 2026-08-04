"""Configuración del Personalized Clinical Decision Support System (FASE 3).

Integra el riesgo de FASE 1 (bandas cost-sensitive 0.09/0.20/0.40) y la evolución de
FASE 2 (CES, tendencias, eventos) para producir recomendaciones accionables, explicables
y auditables. Todos los umbrales son clínicamente razonados (no arbitrarios) y editables.
"""
from __future__ import annotations

from pathlib import Path

SEED = 42

# ----------------------------------------------------------------------------
# Rutas
# ----------------------------------------------------------------------------
PKG_DIR = Path(__file__).resolve().parent
CDSS_DIR = PKG_DIR.parents[1]
ML_DIR = CDSS_DIR.parent
REPO_DIR = ML_DIR.parent
TEMPORAL_DIR = ML_DIR / "temporal_clinical_framework"   # cohorte F2 (fuente)
TEMPORAL_SRC = TEMPORAL_DIR / "src"

DATASETS_DIR = CDSS_DIR / "datasets"
NOTEBOOKS_DIR = CDSS_DIR / "notebooks"
RULES_DIR = CDSS_DIR / "rules"
MODELS_DIR = CDSS_DIR / "models"
DASHBOARDS_DIR = CDSS_DIR / "dashboards"
METRICS_DIR = CDSS_DIR / "metrics"
FIGURES_DIR = CDSS_DIR / "figures"

for _d in (DATASETS_DIR, NOTEBOOKS_DIR, RULES_DIR, MODELS_DIR, DASHBOARDS_DIR,
           METRICS_DIR, FIGURES_DIR):
    _d.mkdir(parents=True, exist_ok=True)


def fig_dir(phase: str) -> Path:
    d = FIGURES_DIR / phase
    d.mkdir(parents=True, exist_ok=True)
    return d


# ----------------------------------------------------------------------------
# Bandas de riesgo de FASE 1 (umbralización cost-sensitive sobre prob. calibrada)
# ----------------------------------------------------------------------------
RISK_THRESHOLDS = [0.0909, 0.20, 0.40]
RISK_LEVELS = ["Bajo", "Moderado", "Alto", "Muy Alto"]


def risk_band(p: float) -> str:
    t = RISK_THRESHOLDS
    if p < t[0]:
        return RISK_LEVELS[0]
    if p < t[1]:
        return RISK_LEVELS[1]
    if p < t[2]:
        return RISK_LEVELS[2]
    return RISK_LEVELS[3]


# ----------------------------------------------------------------------------
# Umbrales clínicos para el motor de reglas (Fase 3A)
# ----------------------------------------------------------------------------
TH = {
    "glucosa_alta": 130,        # mg/dL (objetivo ADA pre-prandial ~80-130)
    "glucosa_muy_alta": 180,
    "imc_sobrepeso": 25,
    "imc_obesidad": 30,
    "pas_elevada": 130,         # mmHg (HTA estadio 1 ≥130)
    "pad_elevada": 85,
    "pas_crisis": 160,
    "riesgo_muy_alto": 0.40,    # banda Muy Alto
    "riesgo_alto": 0.20,
    "dias_sin_consulta": 90,    # "sin consulta reciente" (~3 meses)
    "adherencia_baja": 0.7,     # < 70% adherencia
    "n_consultas_persistencia": 3,  # PA elevada en N consultas consecutivas
    "actividad_baja": 90,       # min/semana (< recomendado 150)
}

# ----------------------------------------------------------------------------
# Priority Score (Fase 3B) — pesos y bandas
# ----------------------------------------------------------------------------
PRIORITY_WEIGHTS = {
    "riesgo": 0.35,        # riesgo actual (prob. F1)
    "evolucion": 0.25,     # 1 - CES/100 (peor evolución → más prioridad)
    "eventos": 0.15,       # alertas/eventos recientes
    "adherencia": 0.10,    # baja adherencia → más prioridad
    "comorbilidades": 0.15,  # nº de comorbilidades
}
PRIORITY_BANDS = [   # (umbral_inferior, etiqueta)
    (75, "Crítica"),
    (50, "Alta"),
    (25, "Media"),
    (0,  "Baja"),
]


def priority_band(score: float) -> str:
    for lo, label in PRIORITY_BANDS:
        if score >= lo:
            return label
    return PRIORITY_BANDS[-1][1]


# ----------------------------------------------------------------------------
# Comorbilidades derivables de la cohorte
# ----------------------------------------------------------------------------
COMORBIDITIES = ["Hipertensión", "Dislipidemia", "Obesidad"]

# ----------------------------------------------------------------------------
# Catálogo de acciones (Fase 3F) — impacto base [0,1] y dato/disparador asociado
# ----------------------------------------------------------------------------
ACTION_CATALOG = {
    "actualizar_glucosa": {"label": "Actualizar glucosa", "base_impact": 0.6, "kind": "dato", "var": "glucosa"},
    "actualizar_signos": {"label": "Actualizar signos vitales (PA/peso)", "base_impact": 0.5, "kind": "dato", "var": "pas"},
    "programar_consulta": {"label": "Programar consulta", "base_impact": 0.7, "kind": "agenda", "var": "consulta"},
    "contacto_preventivo": {"label": "Contacto preventivo", "base_impact": 0.65, "kind": "agenda", "var": "consulta"},
    "revisar_tratamiento": {"label": "Revisar/ajustar tratamiento", "base_impact": 0.8, "kind": "clinico", "var": "medicacion"},
    "reforzar_adherencia": {"label": "Reforzar adherencia al tratamiento", "base_impact": 0.55, "kind": "educacion", "var": "adherencia"},
    "evaluar_factores": {"label": "Evaluar factores de riesgo modificables", "base_impact": 0.5, "kind": "clinico", "var": "riesgo"},
    "educacion_habitos": {"label": "Educación en hábitos (dieta/actividad)", "base_impact": 0.45, "kind": "educacion", "var": "actividad"},
    "derivar_especialista": {"label": "Derivar a especialista", "base_impact": 0.85, "kind": "clinico", "var": "riesgo"},
}
