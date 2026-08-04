"""FASE 2B — Feature engineering temporal.

Para cada variable y paciente: valor actual, media, máx, mín, varianza, std, pendiente
(/mes), aceleración (/mes²), % de cambio, cambio acumulado y tiempo desde la última
medición. Más estadísticos en ventanas rolling de 7/30/90/180 días.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import config
from . import timeseries as ts


def _basic_stats(t, x, t_now) -> dict:
    x = np.asarray(x, float)
    n = len(x)
    if n == 0:
        return {}
    lr = ts.linear_regression(t, x)
    vol = ts.volatility(t, x)
    pct = (x[-1] - x[0]) / abs(x[0]) * 100 if x[0] != 0 else 0.0
    return {
        "current": float(x[-1]),
        "mean": float(x.mean()),
        "max": float(x.max()),
        "min": float(x.min()),
        "var": float(x.var(ddof=1)) if n > 1 else 0.0,
        "std": float(vol["sigma"]),
        "cv": float(vol["cv"]),
        "slope_m": float(lr["slope"] * config.DAYS_PER_MONTH),
        "r2": float(lr["r2"]),
        "accel_m2": float(ts.acceleration(t, x) * config.DAYS_PER_MONTH ** 2),
        "pct_change": float(pct),
        "cum_change": float(x[-1] - x[0]),
        "time_since_last": float(t_now - t[-1]),
        "n_obs": int(n),
    }


def _rolling_stats(t, x, t_now, window) -> dict:
    t = np.asarray(t, float)
    x = np.asarray(x, float)
    mask = t >= (t_now - window)
    tw, xw = t[mask], x[mask]
    if len(xw) == 0:
        return {f"w{window}_mean": np.nan, f"w{window}_slope_m": np.nan,
                f"w{window}_std": np.nan, f"w{window}_n": 0}
    lr = ts.linear_regression(tw, xw)
    return {
        f"w{window}_mean": float(xw.mean()),
        f"w{window}_slope_m": float(lr["slope"] * config.DAYS_PER_MONTH) if len(xw) > 1 else 0.0,
        f"w{window}_std": float(xw.std(ddof=1)) if len(xw) > 1 else 0.0,
        f"w{window}_n": int(len(xw)),
    }


def patient_features(df_long: pd.DataFrame, patient_id: int) -> dict:
    """Vector de features temporales de un paciente (todas las variables)."""
    sub = df_long[df_long.patient_id == patient_id]
    t_now = float(sub["t_days"].max())
    row = {"patient_id": patient_id, "archetype": sub["archetype"].iloc[0], "t_now": t_now}
    for key in config.SERIES_KEYS:
        s = sub[sub.variable == key].sort_values("t_days")
        if s.empty:
            continue
        t, x = s["t_days"].to_numpy(), s["valor"].to_numpy()
        for k, v in _basic_stats(t, x, t_now).items():
            row[f"{key}_{k}"] = v
        for w in config.ROLLING_WINDOWS_DAYS:
            for k, v in _rolling_stats(t, x, t_now, w).items():
                row[f"{key}_{k}"] = v
    return row


def build_feature_matrix(df_long: pd.DataFrame) -> pd.DataFrame:
    rows = [patient_features(df_long, pid) for pid in sorted(df_long.patient_id.unique())]
    return pd.DataFrame(rows)
