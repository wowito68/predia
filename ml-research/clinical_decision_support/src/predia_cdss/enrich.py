"""Enriquecimiento de la cohorte de FASE 2 con el contexto clínico que requiere el
CDSS: consultas, medicación + adherencia, comorbilidades y factores de riesgo.

Lee los artefactos de `temporal_clinical_framework/` (cohorte, CES, tendencias, eventos)
y produce un SNAPSHOT por paciente (estado actual + temporal + contexto) que alimenta
reglas, priorización, explicabilidad y ranking.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import config

HORIZON = 365


def load_temporal() -> dict:
    T = config.TEMPORAL_DIR
    return {
        "long": pd.read_csv(T / "datasets" / "cohort_long.csv"),
        "meta": pd.read_csv(T / "datasets" / "cohort_meta.csv"),
        "events": pd.read_csv(T / "datasets" / "cohort_events.csv"),
        "ces": pd.read_csv(T / "metrics" / "ces.csv"),
        "trends": pd.read_csv(T / "metrics" / "trends.csv"),
    }


def _last(df_pid, key):
    s = df_pid[df_pid.variable == key].sort_values("t_days")
    return float(s.valor.iloc[-1]) if len(s) else np.nan


def _mean(df_pid, key):
    s = df_pid[df_pid.variable == key]
    return float(s.valor.mean()) if len(s) else np.nan


def _consultas(rng, df_pid) -> list[float]:
    """Fechas de consulta (~cada 30-90 días)."""
    days, t = [], float(rng.integers(0, 20))
    while t <= HORIZON:
        days.append(round(t, 1))
        t += rng.integers(30, 135)   # intervalo variable -> algunos pacientes con gaps largos
    return days


def _adherence(rng, archetype) -> float:
    base = {"Mejora rápida": 0.92, "Estable": 0.85, "Deterioro lento": 0.62,
            "Alto riesgo persistente": 0.55, "Oscilante": 0.6}[archetype]
    return float(np.clip(rng.normal(base, 0.1), 0.2, 1.0))


def _pa_elevated_last3(df_pid, consultas) -> bool:
    s = df_pid[df_pid.variable == "pas"].sort_values("t_days")
    if len(s) < 2 or len(consultas) < 3:
        return False
    last3 = sorted(consultas)[-3:]
    pas_at = np.interp(last3, s.t_days, s.valor)
    return bool(np.all(pas_at >= config.TH["pas_elevada"]))


def build_snapshots(data: dict, seed: int = config.SEED) -> tuple[pd.DataFrame, pd.DataFrame]:
    long, meta, events = data["long"], data["meta"], data["events"]
    ces, trends = data["ces"], data["trends"]
    rng = np.random.default_rng(seed)

    slope = {}
    for v in ["glucosa", "imc", "peso", "riesgo", "pas"]:
        slope[v] = dict(zip(trends[trends.variable == v].patient_id,
                            trends[trends.variable == v].slope_m))

    rows, consulta_rows = [], []
    for pid in sorted(long.patient_id.unique()):
        dp = long[long.patient_id == pid]
        m = meta[meta.patient_id == pid].iloc[0]
        cur = {k: _last(dp, k) for k in
               ["glucosa", "imc", "pas", "pad", "peso", "riesgo", "actividad"]}
        means = {k: _mean(dp, k) for k in ["glucosa", "pas", "pad", "imc"]}

        consultas = _consultas(rng, dp)
        for c in consultas:
            consulta_rows.append({"patient_id": pid, "t_consulta": c})
        days_since = HORIZON - max(consultas)
        adher = _adherence(rng, m.archetype)

        # Comorbilidades derivadas
        comorb = []
        if means["pas"] >= config.TH["pas_elevada"] or means["pad"] >= config.TH["pad_elevada"]:
            comorb.append("Hipertensión")
        if cur["imc"] >= config.TH["imc_obesidad"]:
            comorb.append("Obesidad")
        if rng.random() < (0.5 if cur["riesgo"] > 0.4 else 0.2):
            comorb.append("Dislipidemia")

        # Medicación según estado
        meds = []
        if cur["glucosa"] >= 126 or cur["riesgo"] >= 0.4:
            meds.append("Metformina")
        if "Hipertensión" in comorb:
            meds.append("Antihipertensivo")
        if "Dislipidemia" in comorb:
            meds.append("Estatina")

        # Factores de riesgo
        rf = []
        if cur["actividad"] < config.TH["actividad_baja"]:
            rf.append("Sedentarismo")
        if cur["imc"] >= config.TH["imc_obesidad"]:
            rf.append("Obesidad")
        if cur["glucosa"] >= config.TH["glucosa_alta"]:
            rf.append("Hiperglucemia")
        if "Hipertensión" in comorb:
            rf.append("Hipertensión")
        if int(m.age) >= 60:
            rf.append("Edad ≥60")
        if adher < config.TH["adherencia_baja"]:
            rf.append("Baja adherencia")

        n_recent_events = int(((events.patient_id == pid) &
                               (events.t_event >= HORIZON - 90)).sum())
        ces_row = ces[ces.patient_id == pid].iloc[0]

        rows.append({
            "patient_id": pid, "archetype": m.archetype, "age": int(m.age), "sex": int(m.sex),
            **{f"{k}_current": round(v, 2) for k, v in cur.items()},
            "glucosa_mean": round(means["glucosa"], 1), "pas_mean": round(means["pas"], 1),
            **{f"{v}_slope_m": round(slope[v].get(pid, 0.0), 3) for v in slope},
            "ces": float(ces_row.ces), "ces_band": ces_row.band,
            "n_recent_events": n_recent_events,
            "n_consultas": len(consultas), "days_since_last_consulta": round(days_since, 1),
            "pa_elevated_last3": _pa_elevated_last3(dp, consultas),
            "adherencia": round(adher, 3),
            "medicacion": "|".join(meds), "n_medicacion": len(meds),
            "comorbilidades": "|".join(comorb), "n_comorbilidades": len(comorb),
            "factores_riesgo": "|".join(rf),
            # covariables basales para survival
            "glucosa_baseline": round(_baseline(dp, "glucosa"), 1),
            "imc_baseline": round(_baseline(dp, "imc"), 2),
        })

    return pd.DataFrame(rows), pd.DataFrame(consulta_rows)


def _baseline(df_pid, key):
    s = df_pid[df_pid.variable == key].sort_values("t_days")
    return float(s.valor.iloc[0]) if len(s) else np.nan
