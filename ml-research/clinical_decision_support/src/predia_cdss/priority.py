"""FASE 3B — Risk Prioritization (Priority Score 0-100).

Combina riesgo actual, evolución (CES), eventos recientes, adherencia y comorbilidades
en un único índice de prioridad clínica, con desglose por componente (explicable).

  Priority = 100 · Σ_k w_k · c_k,  c_k ∈ [0,1]

Clasificación: Baja / Media / Alta / Crítica.
"""
from __future__ import annotations

import numpy as np

from . import config

W = config.PRIORITY_WEIGHTS


def components(s: dict) -> dict:
    """Componentes normalizados [0,1] (mayor = más prioritario)."""
    return {
        "riesgo": float(np.clip(s["riesgo_current"], 0, 1)),
        "evolucion": float(np.clip(1 - s["ces"] / 100, 0, 1)),
        "eventos": float(np.clip(s["n_recent_events"] / 3.0, 0, 1)),
        "adherencia": float(np.clip(1 - s["adherencia"], 0, 1)),
        "comorbilidades": float(np.clip(s["n_comorbilidades"] / 3.0, 0, 1)),
    }


def score(s: dict) -> dict:
    c = components(s)
    contrib = {k: round(100 * W[k] * c[k], 2) for k in W}
    total = float(np.clip(sum(contrib.values()), 0, 100))
    return {
        "priority_score": round(total, 1),
        "priority_band": config.priority_band(total),
        "components": c,
        "contributions": contrib,
        "top_driver": max(contrib, key=contrib.get),
    }


def score_frame(snapshots) -> "list[dict]":
    return [{"patient_id": int(r["patient_id"]), **score(r)}
            for _, r in snapshots.iterrows()]
