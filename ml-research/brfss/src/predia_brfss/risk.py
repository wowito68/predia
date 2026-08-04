"""Estratificación de riesgo: 4 métodos para derivar los 3 umbrales que separan
las 4 bandas clínicas (Bajo/Moderado/Alto/Muy Alto), más métricas de separación
para decidir cuál produce los grupos más diferenciados.

NO se asumen umbrales arbitrarios: cada método tiene una justificación estadística
o clínica explícita.
"""
from __future__ import annotations

import numpy as np
from sklearn.metrics import roc_curve

from . import config


# ----------------------------------------------------------------------------
# Métodos de umbralización (devuelven 3 cortes ordenados t1<t2<t3)
# ----------------------------------------------------------------------------
def thresholds_percentiles(proba, pcts=(50, 80, 95)) -> list[float]:
    """Método 1 — Percentiles poblacionales del score (define tamaños de grupo
    por la cola de la distribución: la mayoría en riesgo bajo, una élite en muy alto)."""
    return [float(np.percentile(proba, p)) for p in pcts]


def thresholds_quartiles(proba) -> list[float]:
    """Método 2 — Cuartiles (4 grupos de tamaño ~igual)."""
    return [float(np.percentile(proba, p)) for p in (25, 50, 75)]


def thresholds_clinical(y_true, proba, sens_floor=0.90, spec_floor=0.90) -> list[float]:
    """Método 3 — Optimización por sensibilidad clínica sobre la curva ROC:
      t1 = mayor umbral que conserva sensibilidad >= 0.90 (regla de EXCLUSIÓN)
      t2 = punto de Youden (mejor equilibrio sens+espec)
      t3 = menor umbral que alcanza especificidad >= 0.90 (regla de INCLUSIÓN)
    """
    fpr, tpr, thr = roc_curve(y_true, proba)
    youden = tpr - fpr
    t2 = float(thr[np.argmax(youden)])
    sens_mask = tpr >= sens_floor
    t1 = float(thr[sens_mask].max()) if sens_mask.any() else float(np.percentile(proba, 40))
    spec_mask = fpr <= (1 - spec_floor)
    t3 = float(thr[spec_mask].min()) if spec_mask.any() else float(np.percentile(proba, 95))
    return _sanitize(sorted([t1, t2, t3]), proba)


def thresholds_cost_sensitive(proba, fn_fp_ratios=(10.0, 4.0, 1.5)) -> list[float]:
    """Método 4 — Umbral óptimo de Bayes para probabilidades calibradas:
    t* = C_fp / (C_fp + C_fn) = 1 / (1 + ratio), con ratio = costo(FN)/costo(FP).
    Tres ratios decrecientes -> tres umbrales crecientes (escalada de costo)."""
    ts = sorted(1.0 / (1.0 + r) for r in fn_fp_ratios)
    return _sanitize(ts, proba)


def _sanitize(ts, proba) -> list[float]:
    """Garantiza orden estricto y que ningún corte deje bandas vacías."""
    lo, hi = float(np.min(proba)), float(np.max(proba))
    ts = [min(max(t, lo + 1e-6), hi - 1e-6) for t in ts]
    for i in range(1, len(ts)):
        if ts[i] <= ts[i - 1]:
            ts[i] = ts[i - 1] + 1e-4
    return [round(t, 4) for t in ts]


METHODS = {
    "percentiles": "Percentiles poblacionales (P50/P80/P95)",
    "quartiles": "Cuartiles (Q1/Q2/Q3)",
    "clinical": "Optimización por sensibilidad clínica (ROC: exclusión/Youden/inclusión)",
    "cost_sensitive": "Cost-sensitive (umbral de Bayes, ratios FN:FP 10/4/1.5)",
}


def all_thresholds(y_true, proba) -> dict[str, list[float]]:
    return {
        "percentiles": thresholds_percentiles(proba),
        "quartiles": thresholds_quartiles(proba),
        "clinical": thresholds_clinical(y_true, proba),
        "cost_sensitive": thresholds_cost_sensitive(proba),
    }


# ----------------------------------------------------------------------------
# Asignación de bandas y diagnósticos de separación
# ----------------------------------------------------------------------------
def assign_bands(proba, thresholds) -> np.ndarray:
    """Devuelve el índice de banda 0..3 para cada probabilidad."""
    t1, t2, t3 = thresholds
    proba = np.asarray(proba)
    bands = np.zeros(len(proba), dtype=int)
    bands[proba >= t1] = 1
    bands[proba >= t2] = 2
    bands[proba >= t3] = 3
    return bands


def band_table(proba, y_true, thresholds) -> list[dict]:
    """Por banda: n, % población, rango de score, prevalencia observada."""
    y = np.asarray(y_true)
    bands = assign_bands(proba, thresholds)
    t = [float(np.min(proba))] + list(thresholds) + [float(np.max(proba))]
    rows = []
    for i, name in enumerate(config.RISK_LEVELS):
        m = bands == i
        n = int(m.sum())
        rows.append({
            "band": name,
            "action": config.RISK_ACTIONS[name],
            "score_range": [round(t[i], 4), round(t[i + 1], 4)],
            "n": n,
            "pct_population": round(100 * n / len(y), 2),
            "observed_prevalence": round(float(y[m].mean()), 4) if n else float("nan"),
        })
    return rows


def separation_metrics(proba, y_true, thresholds) -> dict:
    """Diagnósticos para comparar métodos: monotonía, razón de prevalencia
    extrema, eta^2 (varianza explicada del desenlace por banda) y tamaño mínimo."""
    y = np.asarray(y_true).astype(float)
    bands = assign_bands(proba, thresholds)
    prevs, sizes = [], []
    for i in range(4):
        m = bands == i
        sizes.append(int(m.sum()))
        prevs.append(float(y[m].mean()) if m.any() else float("nan"))

    monotonic = all(
        (not np.isnan(prevs[i]) and not np.isnan(prevs[i - 1]) and prevs[i] > prevs[i - 1])
        for i in range(1, 4)
    )
    valid = [p for p in prevs if not np.isnan(p)]
    prev_ratio = (max(valid) / min(valid)) if valid and min(valid) > 0 else float("inf")

    grand = y.mean()
    ss_between = sum(s * (p - grand) ** 2 for s, p in zip(sizes, prevs) if not np.isnan(p))
    ss_total = float(((y - grand) ** 2).sum())
    eta2 = ss_between / ss_total if ss_total else 0.0

    return {
        "band_prevalences": [round(p, 4) if not np.isnan(p) else None for p in prevs],
        "band_sizes": sizes,
        "min_band_size": int(min(sizes)),
        "monotonic_increasing": bool(monotonic),
        "prevalence_ratio_extreme": round(prev_ratio, 2) if np.isfinite(prev_ratio) else None,
        "eta_squared": round(eta2, 4),
    }
