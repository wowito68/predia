"""FASE 3A — Clinical Rule Engine.

Motor de reglas declarativo y AUDITABLE. Cada regla es `IF condición THEN
alerta/acción/prioridad`, con severidad, mensaje, acción recomendada y una
justificación que cita la EVIDENCIA (los valores que la dispararon) → rule trace.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

from . import config

TH = config.TH


@dataclass
class Rule:
    id: str
    name: str
    severity: str          # info | warning | critical
    action: str            # clave del ACTION_CATALOG
    message: str
    # check(s) -> dict de evidencia si dispara, None si no
    check: Callable[[dict], dict | None] = field(repr=False)
    priority_flag: bool = False  # marca seguimiento prioritario


def _r(id, name, severity, action, message, check, priority_flag=False):
    return Rule(id, name, severity, action, message, check, priority_flag)


RULES: list[Rule] = [
    _r("R01", "Hiperglucemia + obesidad", "warning", "revisar_tratamiento",
       "Glucosa e IMC elevados de forma simultánea",
       lambda s: ({"glucosa": s["glucosa_current"], "imc": s["imc_current"]}
                  if s["glucosa_current"] > TH["glucosa_alta"] and s["imc_current"] > TH["imc_obesidad"]
                  else None)),
    _r("R02", "PA elevada persistente (3 consultas)", "warning", "programar_consulta",
       "Presión arterial elevada en las últimas 3 consultas → seguimiento prioritario",
       lambda s: ({"pa_elevated_last3": True, "pas_actual": s["pas_current"]}
                  if s.get("pa_elevated_last3") else None), priority_flag=True),
    _r("R03", "Riesgo muy alto sin consulta reciente", "critical", "contacto_preventivo",
       "Riesgo muy alto y sin consulta reciente → sugerir contacto preventivo",
       lambda s: ({"riesgo": s["riesgo_current"], "dias_sin_consulta": s["days_since_last_consulta"]}
                  if s["riesgo_current"] >= TH["riesgo_muy_alto"]
                  and s["days_since_last_consulta"] > TH["dias_sin_consulta"] else None),
       priority_flag=True),
    _r("R04", "Glucosa muy alta", "critical", "revisar_tratamiento",
       "Glucosa en rango muy alto: revisar tratamiento y reconfirmar medición",
       lambda s: ({"glucosa": s["glucosa_current"]}
                  if s["glucosa_current"] >= TH["glucosa_muy_alta"] else None)),
    _r("R05", "Crisis hipertensiva", "critical", "derivar_especialista",
       "Presión arterial en rango de crisis",
       lambda s: ({"pas": s["pas_current"], "pad": s["pad_current"]}
                  if s["pas_current"] >= TH["pas_crisis"] or s["pad_current"] >= 100 else None),
       priority_flag=True),
    _r("R06", "Baja adherencia con tratamiento activo", "warning", "reforzar_adherencia",
       "Adherencia por debajo del umbral con medicación activa",
       lambda s: ({"adherencia": s["adherencia"], "n_medicacion": s["n_medicacion"]}
                  if s["adherencia"] < TH["adherencia_baja"] and s["n_medicacion"] > 0 else None)),
    _r("R07", "Evolución desfavorable (CES bajo)", "warning", "evaluar_factores",
       "Clinical Evolution Score bajo: deterioro de la evolución",
       lambda s: ({"ces": s["ces"], "banda": s["ces_band"]}
                  if s["ces"] < 40 else None), priority_flag=True),
    _r("R08", "Tendencia glucémica creciente", "warning", "revisar_tratamiento",
       "Glucosa con pendiente creciente sostenida",
       lambda s: ({"glucosa_slope_m": s["glucosa_slope_m"]}
                  if s["glucosa_slope_m"] >= 8 else None)),
    _r("R09", "Sedentarismo", "info", "educacion_habitos",
       "Actividad física por debajo de lo recomendado",
       lambda s: ({"actividad": s["actividad_current"]}
                  if s["actividad_current"] < TH["actividad_baja"] else None)),
    _r("R10", "Datos clínicos desactualizados", "info", "actualizar_glucosa",
       "Sin registros recientes: actualizar glucosa/signos vitales",
       lambda s: ({"dias_sin_consulta": s["days_since_last_consulta"]}
                  if s["days_since_last_consulta"] > TH["dias_sin_consulta"] else None)),
    _r("R11", "Multicomorbilidad con riesgo alto", "warning", "derivar_especialista",
       "Dos o más comorbilidades con riesgo elevado",
       lambda s: ({"comorbilidades": s["comorbilidades"], "riesgo": s["riesgo_current"]}
                  if s["n_comorbilidades"] >= 2 and s["riesgo_current"] >= TH["riesgo_alto"] else None),
       priority_flag=True),
    _r("R12", "Aumento rápido de peso", "warning", "evaluar_factores",
       "Peso con pendiente creciente relevante",
       lambda s: ({"peso_slope_m": s["peso_slope_m"]}
                  if s["peso_slope_m"] >= 1.0 else None)),
]


def evaluate(snapshot: dict) -> list[dict]:
    """Evalúa todas las reglas sobre un snapshot. Devuelve la traza de las que disparan."""
    fired = []
    for rule in RULES:
        ev = rule.check(snapshot)
        if ev is not None:
            fired.append({
                "rule_id": rule.id, "name": rule.name, "severity": rule.severity,
                "action": rule.action, "message": rule.message,
                "priority_flag": rule.priority_flag, "evidence": ev,
            })
    sev_order = {"critical": 0, "warning": 1, "info": 2}
    return sorted(fired, key=lambda f: sev_order[f["severity"]])


def export_rules() -> list[dict]:
    """Catálogo de reglas (sin las lambdas) para auditoría/persistencia."""
    return [{"id": r.id, "name": r.name, "severity": r.severity, "action": r.action,
             "message": r.message, "priority_flag": r.priority_flag} for r in RULES]
