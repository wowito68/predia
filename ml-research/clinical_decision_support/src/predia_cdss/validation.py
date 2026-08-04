"""FASE 3H — Validación del CDSS.

¿Las recomendaciones son consistentes, interpretables, reducen carga cognitiva, aportan
valor clínico y son auditables?
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

from . import config


def consistency_monotonicity(snapshots: pd.DataFrame, priority_rows: list[dict]) -> dict:
    """El Priority Score debe crecer con el riesgo (monotonía) — correlación de Spearman."""
    pr = pd.DataFrame(priority_rows).merge(
        snapshots[["patient_id", "riesgo_current", "ces"]], on="patient_id")
    rho_risk, _ = spearmanr(pr["riesgo_current"], pr["priority_score"])
    rho_ces, _ = spearmanr(pr["ces"], pr["priority_score"])
    return {"spearman_riesgo_priority": round(float(rho_risk), 3),
            "spearman_ces_priority": round(float(rho_ces), 3),
            "monotonic_risk": bool(rho_risk > 0.5),
            "ces_inverse": bool(rho_ces < -0.3)}


def interpretability(recommendations: list[dict]) -> dict:
    """Toda recomendación debe traer al menos una justificación (rule trace o factor)."""
    n = len(recommendations)
    with_reason = sum(1 for r in recommendations if r["recommendations"] and
                      all("reason" in a for a in r["recommendations"]))
    with_why = sum(1 for r in recommendations if r["why"])
    return {"n_pacientes": n,
            "pct_recs_con_razon": round(with_reason / n, 3) if n else 0,
            "pct_con_explicacion": round(with_why / n, 3) if n else 0}


def cognitive_load(recommendations: list[dict]) -> dict:
    """Reducción de carga: top-5 vs catálogo completo de acciones."""
    catalog = len(config.ACTION_CATALOG)
    avg_shown = float(np.mean([len(r["recommendations"]) for r in recommendations])) if recommendations else 0
    return {"acciones_catalogo": catalog, "media_acciones_mostradas": round(avg_shown, 2),
            "reduccion_pct": round(100 * (1 - avg_shown / catalog), 1)}


def clinical_value(snapshots: pd.DataFrame, priority_rows: list[dict],
                   survival_table: pd.DataFrame) -> dict:
    """El Priority Score debe asociarse con menor tiempo a deterioro (mayor prioridad →
    deteriora antes) y con el evento de deterioro."""
    pr = pd.DataFrame(priority_rows).merge(
        survival_table[["patient_id", "duration", "event"]], on="patient_id")
    # entre los que tuvieron evento, mayor prioridad ↔ menor duración
    ev = pr[pr.event == 1]
    rho_dur, _ = spearmanr(ev["priority_score"], ev["duration"]) if len(ev) > 5 else (np.nan, None)
    prio_event = pr[pr.event == 1]["priority_score"].mean()
    prio_censor = pr[pr.event == 0]["priority_score"].mean()
    return {"spearman_priority_time_to_event": round(float(rho_dur), 3) if not np.isnan(rho_dur) else None,
            "priority_medio_con_deterioro": round(float(prio_event), 1),
            "priority_medio_sin_deterioro": round(float(prio_censor), 1),
            "separa_grupos": bool(prio_event > prio_censor)}


def auditability(recommendations: list[dict]) -> dict:
    """Cada salida es trazable: alertas con evidencia + acciones con razón."""
    n = len(recommendations)
    traceable = sum(1 for r in recommendations
                    if all("evidence" in a for a in r["alerts"]) and r.get("auditable"))
    return {"n_pacientes": n, "pct_auditable": round(traceable / n, 3) if n else 0}
