"""FASE 2G — Predicción de tendencia futura (one-step-ahead).

Predice el PRÓXIMO valor de Glucosa, IMC, Riesgo y CES a partir del historial,
mediante features de lags/ventana. Compara LinearRegression, RandomForest, XGBoost y
LightGBM contra un baseline de persistencia (y_{t+1}=y_t) y un baseline clásico de
series de tiempo (Holt-Winters / statsmodels). Métricas: RMSE, MAE, MAPE, R².
"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupShuffleSplit
from xgboost import XGBRegressor

from . import config
from . import timeseries as ts

warnings.simplefilter("ignore")


def make_lag_table(series_by_patient: dict) -> pd.DataFrame:
    """Construye (features, y_next) por punto. Features: 3 lags, media y pendiente
    de los últimos puntos, Δt al próximo. y = valor en t+1."""
    rows = []
    for pid, (t, x) in series_by_patient.items():
        t = np.asarray(t, float)
        x = np.asarray(x, float)
        n = len(x)
        if n < 5:
            continue
        for i in range(3, n - 1):
            hist_t, hist_x = t[max(0, i - 4):i + 1], x[max(0, i - 4):i + 1]
            slope = ts.linear_regression(hist_t, hist_x)["slope"] * config.DAYS_PER_MONTH
            rows.append({
                "patient_id": pid,
                "lag1": x[i], "lag2": x[i - 1], "lag3": x[i - 2],
                "roll_mean": hist_x.mean(), "slope_m": slope,
                "dt_next": t[i + 1] - t[i],
                "y": x[i + 1],
            })
    return pd.DataFrame(rows)


FEATURES = ["lag1", "lag2", "lag3", "roll_mean", "slope_m", "dt_next"]


def _metrics(y_true, y_pred) -> dict:
    y_true = np.asarray(y_true, float)
    y_pred = np.asarray(y_pred, float)
    nz = np.abs(y_true) > 1e-6
    mape = float(np.mean(np.abs((y_true[nz] - y_pred[nz]) / y_true[nz])) * 100) if nz.any() else float("nan")
    return {
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "mape": mape,
        "r2": float(r2_score(y_true, y_pred)),
    }


def evaluate(table: pd.DataFrame) -> dict:
    """Split por paciente (sin fuga) y comparación de modelos + baseline persistencia."""
    if len(table) < 50:
        return {}
    gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=config.SEED)
    tr, te = next(gss.split(table, groups=table.patient_id))
    Xtr, Xte = table.iloc[tr][FEATURES], table.iloc[te][FEATURES]
    ytr, yte = table.iloc[tr]["y"], table.iloc[te]["y"]

    models = {
        "LinearRegression": LinearRegression(),
        "RandomForest": RandomForestRegressor(n_estimators=200, max_depth=10,
                                              n_jobs=-1, random_state=config.SEED),
        "XGBoost": XGBRegressor(n_estimators=300, max_depth=5, learning_rate=0.05,
                                n_jobs=-1, random_state=config.SEED, verbosity=0),
        "LightGBM": LGBMRegressor(n_estimators=300, max_depth=6, learning_rate=0.05,
                                  n_jobs=-1, random_state=config.SEED, verbose=-1),
    }
    res = {}
    for name, mdl in models.items():
        mdl.fit(Xtr, ytr)
        res[name] = _metrics(yte, mdl.predict(Xte))
    # Baseline de persistencia: y_{t+1} ≈ y_t (=lag1)
    res["Persistencia (baseline)"] = _metrics(yte, Xte["lag1"])
    return res


def holt_winters_baseline(series_by_patient: dict, sample: int = 40) -> dict:
    """Baseline clásico: Holt-Winters (suavizado exponencial) one-step en una muestra."""
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    rng = np.random.default_rng(config.SEED)
    pids = list(series_by_patient.keys())
    rng.shuffle(pids)
    errs_true, errs_pred = [], []
    for pid in pids[:sample]:
        _, x = series_by_patient[pid]
        x = np.asarray(x, float)
        if len(x) < 10:
            continue
        try:
            fit = ExponentialSmoothing(x[:-1], trend="add", damped_trend=True).fit()
            pred = float(fit.forecast(1)[0])
            errs_true.append(x[-1])
            errs_pred.append(pred)
        except Exception:
            continue
    if len(errs_true) < 5:
        return {}
    return _metrics(errs_true, errs_pred)


def series_by_patient(df_long, key) -> dict:
    out = {}
    for pid, grp in df_long[df_long.variable == key].groupby("patient_id"):
        g = grp.sort_values("t_days")
        out[pid] = (g["t_days"].to_numpy(), g["valor"].to_numpy())
    return out
