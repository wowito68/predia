"""FASE 3F — Recommendation Ranking.

Para cada paciente produce el Top-5 de acciones sugeridas, ordenadas por IMPACTO
ESPERADO = impacto base de la acción × relevancia según el estado del paciente
(reglas disparadas, obsolescencia del dato, riesgo modificable). Cada acción lleva su
'razón' (auditable).
"""
from __future__ import annotations

import numpy as np

from . import config

CAT = config.ACTION_CATALOG
SEV_BOOST = {"critical": 1.6, "warning": 1.3, "info": 1.05}


def rank_actions(s: dict, fired_rules: list[dict], priority_score: float, top=5) -> list[dict]:
    cand: dict[str, dict] = {}

    def add(action, mult, reason):
        if action not in CAT:
            return
        base = CAT[action]["base_impact"]
        impact = base * mult
        if action not in cand or impact > cand[action]["impact"]:
            cand[action] = {"action": action, "label": CAT[action]["label"],
                            "impact": impact, "reason": reason}

    # 1) Acciones provenientes de reglas disparadas (con su evidencia como razón)
    for r in fired_rules:
        add(r["action"], SEV_BOOST[r["severity"]], f"[{r['rule_id']}] {r['message']}")

    # 2) Acciones según el estado clínico (relevancia continua)
    stale = np.clip(s["days_since_last_consulta"] / 120, 0, 1.5)
    add("actualizar_glucosa", 0.5 + stale, f"Última actividad hace {s['days_since_last_consulta']:.0f} días")
    add("actualizar_signos", 0.5 + 0.7 * stale, "Mantener signos vitales al día")
    add("programar_consulta", 0.6 + priority_score / 100, f"Prioridad clínica = {priority_score:.0f}/100")
    if s["riesgo_current"] >= config.TH["riesgo_muy_alto"]:
        add("contacto_preventivo", 1.2, f"Riesgo muy alto ({s['riesgo_current']:.2f})")
        add("derivar_especialista", 0.9 + 0.3 * s["n_comorbilidades"],
            f"Riesgo {s['riesgo_current']:.2f} + {s['n_comorbilidades']} comorbilidades")
    if s["adherencia"] < config.TH["adherencia_baja"] and s["n_medicacion"] > 0:
        add("reforzar_adherencia", 1.0 + (1 - s["adherencia"]), f"Adherencia {s['adherencia']:.0%}")
    if s["actividad_current"] < config.TH["actividad_baja"]:
        add("educacion_habitos", 0.9, f"Actividad {s['actividad_current']:.0f} min/sem")
    if s["glucosa_current"] >= config.TH["glucosa_alta"] or s["glucosa_slope_m"] >= 8:
        add("revisar_tratamiento", 1.1, f"Glucosa {s['glucosa_current']:.0f} (tendencia {s['glucosa_slope_m']:+.1f}/mes)")
    add("evaluar_factores", 0.7 + 0.4 * s["riesgo_current"], "Revisar factores de riesgo modificables")

    ranked = sorted(cand.values(), key=lambda c: c["impact"], reverse=True)[:top]
    for rank, c in enumerate(ranked, 1):
        c["rank"] = rank
        c["impact"] = round(c["impact"], 3)
    return ranked
