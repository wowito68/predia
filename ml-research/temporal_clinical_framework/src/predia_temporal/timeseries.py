"""Primitivas matemáticas para series de tiempo clínicas irregulares.

Port directo de `apps/web/lib/evolution/timeseries.ts` a Python (misma definición
formal — ver `docs/clinical-evolution-score.md`). El eje t está en DÍAS desde la
primera medición; las pendientes se reportan por mes (×30).
"""
from __future__ import annotations

import numpy as np

from .config import DAYS_PER_MONTH  # noqa: F401  (reexport por conveniencia)


def linear_regression(t, x) -> dict:
    """OLS: pendiente β (por día), intercepto α y R²."""
    t = np.asarray(t, float)
    x = np.asarray(x, float)
    n = len(t)
    if n < 2:
        return {"slope": 0.0, "intercept": float(x[0]) if n else 0.0, "r2": 0.0}
    tbar, xbar = t.mean(), x.mean()
    sxx = float(((t - tbar) ** 2).sum())
    sxy = float(((t - tbar) * (x - xbar)).sum())
    slope = 0.0 if sxx == 0 else sxy / sxx
    intercept = xbar - slope * tbar
    yhat = intercept + slope * t
    ss_res = float(((x - yhat) ** 2).sum())
    ss_tot = float(((x - xbar) ** 2).sum())
    r2 = 1.0 if ss_tot == 0 else max(0.0, 1 - ss_res / ss_tot)
    return {"slope": slope, "intercept": intercept, "r2": r2}


def acceleration(t, x) -> float:
    """Aceleración d²x/dt² = 2a del ajuste cuadrático x(t)=a t²+b t+c (n≥3), por día²."""
    t = np.asarray(t, float)
    x = np.asarray(x, float)
    if len(t) < 3:
        return 0.0
    try:
        a, _b, _c = np.polyfit(t, x, 2)
    except (np.linalg.LinAlgError, ValueError):
        return 0.0
    return float(2 * a)


def volatility(t, x) -> dict:
    """σ muestral, CV y σ de los residuos respecto a la tendencia lineal."""
    x = np.asarray(x, float)
    n = len(x)
    m = float(x.mean()) if n else 0.0
    sigma = 0.0 if n < 2 else float(x.std(ddof=1))
    cv = sigma / abs(m) if m != 0 else 0.0
    residual_std = 0.0
    if n >= 3:
        lr = linear_regression(t, x)
        yhat = lr["intercept"] + lr["slope"] * np.asarray(t, float)
        ss = float(((x - yhat) ** 2).sum())
        residual_std = float(np.sqrt(ss / (n - 2)))
    return {"sigma": sigma, "cv": cv, "residual_std": residual_std, "mean": m}


def moving_average(x, k: int):
    x = np.asarray(x, float)
    if k <= 1 or len(x) < k:
        return np.array([])
    return np.convolve(x, np.ones(k) / k, mode="valid")


def endpoint_slope(t, x) -> float:
    """Pendiente por extremos (x_n − x_1)/(t_n − t_1), por día."""
    t = np.asarray(t, float)
    x = np.asarray(x, float)
    if len(t) < 2 or t[-1] == t[0]:
        return 0.0
    return float((x[-1] - x[0]) / (t[-1] - t[0]))


def sign_changes(x) -> int:
    """Nº de cambios de signo de las diferencias sucesivas (oscilación)."""
    d = np.diff(np.asarray(x, float))
    d = d[d != 0]
    if len(d) < 2:
        return 0
    return int((np.diff(np.sign(d)) != 0).sum())
