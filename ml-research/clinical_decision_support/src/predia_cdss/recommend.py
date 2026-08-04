"""Orquestador del PCDSS: combina reglas, prioridad, explicabilidad y ranking en una
única salida por paciente — auditable y sin cajas negras."""
from __future__ import annotations

from . import explain, priority, ranking, rules


def recommend_patient(snapshot: dict, sv_row=None, x_row=None) -> dict:
    """Genera la salida completa del CDSS para un paciente.

    snapshot: fila del snapshot enriquecido (dict).
    sv_row, x_row: fila SHAP y de features (opcional; añade atribución por factor).
    """
    fired = rules.evaluate(snapshot)
    prio = priority.score(snapshot)

    factors, protective = [], []
    if sv_row is not None and x_row is not None:
        factors = explain.patient_factors(sv_row, x_row)
        protective = explain.protective_factors(sv_row, x_row)

    top_actions = ranking.rank_actions(snapshot, fired, prio["priority_score"])
    why = explain.why(snapshot, fired, factors)

    return {
        "patient_id": int(snapshot["patient_id"]),
        "risk": {"prob": round(float(snapshot["riesgo_current"]), 3),
                 "band": snapshot.get("ces_band")},
        "priority": {"score": prio["priority_score"], "band": prio["priority_band"],
                     "top_driver": prio["top_driver"], "contributions": prio["contributions"]},
        "alerts": fired,
        "why": why,
        "risk_factors": factors,
        "protective_factors": protective,
        "recommendations": top_actions,
        "auditable": True,
    }
