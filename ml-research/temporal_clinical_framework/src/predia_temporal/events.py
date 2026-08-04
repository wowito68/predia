"""FASE 2E — Detección de eventos / alertas tempranas.

Detectores estadísticos sobre series (Z-score robusto, EWMA, CUSUM) y de aprendizaje
no supervisado multivariado (Isolation Forest, LOF), más reglas clínicas explícitas
(incremento súbito de glucosa, aumento rápido de peso, descontrol hipertensivo, caída
abrupta). Objetivo: anticipar el deterioro.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor

from . import config


# ----------------------------------------------------------------------------
# Detectores univariados sobre una serie
# ----------------------------------------------------------------------------
def zscore_events(t, x, thresh=3.5) -> list[float]:
    """Z-score robusto (mediana / MAD). Devuelve los t donde |z| supera el umbral."""
    x = np.asarray(x, float)
    med = np.median(x)
    mad = np.median(np.abs(x - med)) or 1e-9
    z = 0.6745 * (x - med) / mad
    return [float(t[i]) for i in np.where(np.abs(z) > thresh)[0]]


def ewma_events(t, x, lam=0.3, L=3.0) -> list[float]:
    """Carta de control EWMA: z_t = λx_t+(1−λ)z_{t−1}, límites ±Lσ√(λ/(2−λ))."""
    x = np.asarray(x, float)
    mu, sigma = x.mean(), (x.std(ddof=1) or 1e-9)
    z, out = mu, []
    sd = sigma * np.sqrt(lam / (2 - lam))
    for i, xi in enumerate(x):
        z = lam * xi + (1 - lam) * z
        if abs(z - mu) > L * sd:
            out.append(float(t[i]))
    return out


def cusum_events(t, x, k=0.5, h=5.0) -> list[float]:
    """CUSUM tabular (en unidades de σ). k=holgura, h=umbral de decisión."""
    x = np.asarray(x, float)
    mu, sigma = x.mean(), (x.std(ddof=1) or 1e-9)
    sp = sm = 0.0
    out = []
    for i, xi in enumerate(x):
        zi = (xi - mu) / sigma
        sp = max(0.0, sp + zi - k)
        sm = min(0.0, sm + zi + k)
        if sp > h or sm < -h:
            out.append(float(t[i]))
            sp = sm = 0.0
    return out


# ----------------------------------------------------------------------------
# Detectores multivariados (por paciente)
# ----------------------------------------------------------------------------
def _point_matrix(df_long, patient_id):
    """Matriz punto-temporal [t, glucosa interp, imc, pas, pad] del paciente."""
    sub = df_long[df_long.patient_id == patient_id]
    ant = sub[sub.variable == "imc"].sort_values("t_days")["t_days"].to_numpy()
    if len(ant) < 5:
        return None, None
    cols = {}
    for k in ["imc", "pas", "pad"]:
        s = sub[sub.variable == k].sort_values("t_days")
        cols[k] = np.interp(ant, s["t_days"], s["valor"])
    g = sub[sub.variable == "glucosa"].sort_values("t_days")
    cols["glucosa"] = np.interp(ant, g["t_days"], g["valor"])
    M = np.column_stack([cols["glucosa"], cols["imc"], cols["pas"], cols["pad"]])
    return ant, M


def isolation_forest_events(df_long, patient_id, contamination=0.08) -> list[float]:
    ant, M = _point_matrix(df_long, patient_id)
    if M is None:
        return []
    pred = IsolationForest(contamination=contamination, random_state=config.SEED).fit_predict(M)
    return [float(ant[i]) for i in np.where(pred == -1)[0]]


def lof_events(df_long, patient_id, contamination=0.08) -> list[float]:
    ant, M = _point_matrix(df_long, patient_id)
    if M is None or len(M) < 6:
        return []
    n_neighbors = min(20, len(M) - 1)
    pred = LocalOutlierFactor(n_neighbors=n_neighbors, contamination=contamination).fit_predict(M)
    return [float(ant[i]) for i in np.where(pred == -1)[0]]


# ----------------------------------------------------------------------------
# Reglas clínicas explícitas
# ----------------------------------------------------------------------------
def clinical_rule_events(df_long, patient_id) -> list[dict]:
    sub = df_long[df_long.patient_id == patient_id]
    events = []

    def series(k):
        s = sub[sub.variable == k].sort_values("t_days")
        return s["t_days"].to_numpy(), s["valor"].to_numpy()

    tg, g = series("glucosa")
    for i in range(1, len(g)):
        if g[i] - g[i - 1] >= 50:
            events.append({"t": float(tg[i]), "type": "incremento_subito_glucosa",
                           "severity": "critical", "detail": f"+{g[i]-g[i-1]:.0f} mg/dL"})
    tw, w = series("peso")
    for i in range(1, len(w)):
        dt = tw[i] - tw[i - 1]
        if dt > 0 and (w[i] - w[i - 1]) >= 3 and dt <= 30:
            events.append({"t": float(tw[i]), "type": "aumento_rapido_peso",
                           "severity": "warning", "detail": f"+{w[i]-w[i-1]:.1f} kg en {dt:.0f} d"})
    ts_, pas = series("pas")
    _, pad = series("pad")
    for i in range(len(pas)):
        if pas[i] >= 160 or (i < len(pad) and pad[i] >= 100):
            events.append({"t": float(ts_[i]), "type": "descontrol_hipertensivo",
                           "severity": "critical", "detail": f"PA {pas[i]:.0f}/{pad[i]:.0f}"})
    return events


def detect_all(df_long, patient_id) -> dict:
    """Ejecuta todos los detectores y devuelve sus t de alerta por método."""
    out = {}
    for key in ["glucosa", "peso", "pas"]:
        s = df_long[(df_long.patient_id == patient_id) & (df_long.variable == key)] \
            .sort_values("t_days")
        t, x = s["t_days"].to_numpy(), s["valor"].to_numpy()
        if len(x) >= 5:
            out[f"zscore_{key}"] = zscore_events(t, x)
            out[f"ewma_{key}"] = ewma_events(t, x)
            out[f"cusum_{key}"] = cusum_events(t, x)
    out["isolation_forest"] = isolation_forest_events(df_long, patient_id)
    out["lof"] = lof_events(df_long, patient_id)
    out["clinical_rules"] = clinical_rule_events(df_long, patient_id)
    return out
