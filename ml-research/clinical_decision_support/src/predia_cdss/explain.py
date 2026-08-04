"""FASE 3C — Explainable Recommendations.

Cada recomendación responde "¿por qué?" combinando tres fuentes auditables:
  (1) SHAP sobre un modelo de deterioro entrenado con las features clínicas,
  (2) Rule trace (qué reglas dispararon y con qué evidencia),
  (3) Feature attribution legible.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from xgboost import XGBClassifier

from . import config

# Features clínicas para el modelo explicable (todas interpretables)
MODEL_FEATURES = [
    "glucosa_current", "imc_current", "pas_current", "pad_current", "actividad_current",
    "riesgo_current", "glucosa_slope_m", "imc_slope_m", "peso_slope_m", "age",
    "adherencia", "n_comorbilidades",
]
FEATURE_LABELS = {
    "glucosa_current": "Glucosa actual", "imc_current": "IMC actual",
    "pas_current": "PA sistólica", "pad_current": "PA diastólica",
    "actividad_current": "Actividad física", "riesgo_current": "Riesgo de diabetes",
    "glucosa_slope_m": "Tendencia de glucosa", "imc_slope_m": "Tendencia de IMC",
    "peso_slope_m": "Tendencia de peso", "age": "Edad",
    "adherencia": "Adherencia", "n_comorbilidades": "Nº de comorbilidades",
}
# Para variables donde MAYOR valor empeora (drive de riesgo positivo)
HIGHER_WORSE = {"glucosa_current", "imc_current", "pas_current", "pad_current",
                "riesgo_current", "glucosa_slope_m", "imc_slope_m", "peso_slope_m",
                "age", "n_comorbilidades"}


def deterioration_label(snapshots: pd.DataFrame) -> pd.Series:
    """Objetivo del modelo explicable: deterioro = CES < 40."""
    return (snapshots["ces"] < 40).astype(int)


def train_risk_model(snapshots: pd.DataFrame):
    X = snapshots[MODEL_FEATURES].fillna(0.0)
    y = deterioration_label(snapshots)
    pos = max(1, int(y.sum()))
    spw = float((len(y) - pos) / pos)
    model = XGBClassifier(n_estimators=300, max_depth=4, learning_rate=0.05,
                          scale_pos_weight=spw, n_jobs=-1, random_state=config.SEED,
                          eval_metric="logloss", verbosity=0)
    model.fit(X, y)
    return model, X, y


def shap_matrix(model, X):
    import shap
    sv = shap.TreeExplainer(model).shap_values(X)
    if isinstance(sv, list):
        sv = sv[1]
    sv = np.asarray(sv)
    if sv.ndim == 3:
        sv = sv[:, :, 1]
    return sv


def patient_factors(sv_row, x_row, top=4) -> list[dict]:
    """Top factores que EMPUJAN el riesgo (SHAP>0) en este paciente."""
    order = np.argsort(sv_row)[::-1]
    out = []
    for i in order:
        if sv_row[i] <= 0:
            continue
        feat = MODEL_FEATURES[i]
        out.append({"feature": feat, "label": FEATURE_LABELS[feat],
                    "value": round(float(x_row[i]), 2),
                    "shap": round(float(sv_row[i]), 3),
                    "direction": "aumenta el riesgo"})
        if len(out) >= top:
            break
    return out


def protective_factors(sv_row, x_row, top=2) -> list[dict]:
    order = np.argsort(sv_row)
    out = []
    for i in order:
        if sv_row[i] >= 0:
            continue
        feat = MODEL_FEATURES[i]
        out.append({"feature": feat, "label": FEATURE_LABELS[feat],
                    "value": round(float(x_row[i]), 2),
                    "shap": round(float(sv_row[i]), 3),
                    "direction": "reduce el riesgo"})
        if len(out) >= top:
            break
    return out


def why(snapshot: dict, fired_rules: list[dict], factors: list[dict]) -> list[str]:
    """Construye las viñetas '¿Por qué?' combinando reglas + SHAP."""
    bullets = []
    for f in factors:
        bullets.append(f"{f['label']} = {f['value']} ({f['direction']})")
    for r in fired_rules:
        if r["severity"] in ("critical", "warning"):
            bullets.append(f"[{r['rule_id']}] {r['message']}")
    return bullets
