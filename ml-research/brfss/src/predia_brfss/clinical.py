"""Validación clínica de las bandas de riesgo: prevalencia, odds ratio y riesgo
relativo por banda (referencia = banda Bajo), y sensibilidad/especificidad/PPV/NPV
de cada umbral de decisión clínica."""
from __future__ import annotations

import numpy as np

from . import config
from .data import odds_ratio, relative_risk
from .risk import assign_bands


def per_band_association(proba, y_true, thresholds) -> list[dict]:
    """OR y RR de cada banda frente a la banda de referencia (Bajo)."""
    y = np.asarray(y_true).astype(int)
    bands = assign_bands(proba, thresholds)
    ref = bands == 0
    a_ref = int((ref & (y == 1)).sum())
    b_ref = int((ref & (y == 0)).sum())
    rows = []
    for i, name in enumerate(config.RISK_LEVELS):
        m = bands == i
        n = int(m.sum())
        cases = int((m & (y == 1)).sum())
        controls = int((m & (y == 0)).sum())
        prev = cases / n if n else float("nan")
        if i == 0:
            or_, rr = {"or": 1.0, "ci95": [1.0, 1.0]}, {"rr": 1.0, "ci95": [1.0, 1.0]}
        else:
            # 2x2 banda i (expuesto) vs banda Bajo (no expuesto)
            or_ = odds_ratio(cases, controls, a_ref, b_ref)
            rr = relative_risk(cases, controls, a_ref, b_ref)
        rows.append({
            "band": name,
            "action": config.RISK_ACTIONS[name],
            "n": n,
            "cases": cases,
            "observed_prevalence": round(prev, 4) if n else None,
            "odds_ratio_vs_bajo": or_["or"],
            "or_ci95": or_["ci95"],
            "relative_risk_vs_bajo": rr["rr"],
            "rr_ci95": rr["ci95"],
        })
    return rows


def per_threshold_operating(proba, y_true, thresholds) -> list[dict]:
    """Tratando '>= umbral' como cribado positivo, calcula sens/espec/PPV/NPV/LR+
    para los 3 cortes (frontera Moderado, Alto y Muy Alto)."""
    y = np.asarray(y_true).astype(int)
    proba = np.asarray(proba)
    P = int((y == 1).sum())
    N = int((y == 0).sum())
    labels = ["≥ Moderado", "≥ Alto", "≥ Muy Alto"]
    rows = []
    for lbl, t in zip(labels, thresholds):
        pred = proba >= t
        tp = int((pred & (y == 1)).sum())
        fp = int((pred & (y == 0)).sum())
        fn = int((~pred & (y == 1)).sum())
        tn = int((~pred & (y == 0)).sum())
        sens = tp / P if P else float("nan")
        spec = tn / N if N else float("nan")
        ppv = tp / (tp + fp) if (tp + fp) else float("nan")
        npv = tn / (tn + fn) if (tn + fn) else float("nan")
        lr_pos = (sens / (1 - spec)) if (1 - spec) > 0 else float("inf")
        rows.append({
            "decision": lbl,
            "threshold": round(float(t), 4),
            "sensitivity": round(sens, 4),
            "specificity": round(spec, 4),
            "ppv": round(ppv, 4),
            "npv": round(npv, 4),
            "lr_plus": round(lr_pos, 3) if np.isfinite(lr_pos) else None,
            "flagged_pct": round(100 * pred.mean(), 2),
        })
    return rows
