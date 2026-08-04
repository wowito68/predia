"""FASE 2C — Análisis de tendencias clínicas.

Por serie: regresión lineal (pendiente /mes, R², error residual) y clasificación
automática en Mejorando / Estable / Empeorando / Oscilante. Reutiliza el puntaje
direccional s∈[-1,1] del motor de evolución (κ por variable, lowerIsBetter).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import config
from . import timeseries as ts

# κ y dirección por serie (las 6 de EVOLUTION_VARS + riesgo). 'lower_is_better' True
# = disminuir es clínicamente bueno.
TREND_KAPPA = {
    "glucosa": (10.0, True), "imc": (0.5, True), "pas": (5.0, True),
    "pad": (3.0, True), "peso": (1.0, True), "riesgo": (0.10, True),
    "actividad": (40.0, False),
}

R2_OSC = 0.30        # R² por debajo del cual no hay tendencia lineal clara
CV_OSC = 0.12        # CV por encima del cual la serie fluctúa
S_STABLE = 0.20      # |s| por debajo del cual se considera estable


def directional_score(slope_m, key) -> float:
    kappa, lower_better = TREND_KAPPA.get(key, (1.0, True))
    raw = (-slope_m if lower_better else slope_m) / kappa
    return float(np.clip(raw, -1, 1))


def classify_series(t, x, key) -> dict:
    t = np.asarray(t, float)
    x = np.asarray(x, float)
    n = len(x)
    out = {"variable": key, "n": n, "slope_m": 0.0, "r2": 0.0, "residual_std": 0.0,
           "cv": 0.0, "s": 0.0, "sign_changes": 0, "trend": "Sin datos"}
    if n < 3:
        return out
    span = t[-1] - t[0]
    reliable = span >= config.MIN_SPAN_DAYS
    lr = ts.linear_regression(t, x)
    vol = ts.volatility(t, x)
    slope_m = lr["slope"] * config.DAYS_PER_MONTH if reliable else 0.0
    s = directional_score(slope_m, key) if reliable else 0.0
    sc = ts.sign_changes(x)
    osc = (lr["r2"] < R2_OSC) and (vol["cv"] >= CV_OSC) and (sc >= max(3, n // 4))

    if not reliable:
        trend = "Sin datos"
    elif osc:
        trend = "Oscilante"
    elif abs(s) < S_STABLE:
        trend = "Estable"
    elif s > 0:
        trend = "Mejorando"
    else:
        trend = "Empeorando"

    out.update(slope_m=round(slope_m, 4), r2=round(lr["r2"], 3),
               residual_std=round(vol["residual_std"], 4), cv=round(vol["cv"], 4),
               s=round(s, 3), sign_changes=sc, trend=trend)
    return out


def patient_trends(df_long: pd.DataFrame, patient_id: int) -> list[dict]:
    sub = df_long[df_long.patient_id == patient_id]
    rows = []
    for key in config.SERIES_KEYS:
        s = sub[sub.variable == key].sort_values("t_days")
        r = classify_series(s["t_days"].to_numpy(), s["valor"].to_numpy(), key)
        r["patient_id"] = patient_id
        rows.append(r)
    return rows


def all_trends(df_long: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for pid in sorted(df_long.patient_id.unique()):
        rows.extend(patient_trends(df_long, pid))
    return pd.DataFrame(rows)
