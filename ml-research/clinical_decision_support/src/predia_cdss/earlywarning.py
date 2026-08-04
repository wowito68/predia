"""FASE 3E — Early Warning System (survival / time-to-event).

Define el evento "deterioro" = primer instante con CES < 40 o primer evento agudo
severo. Estima Kaplan-Meier (probabilidad de mantenerse sin deterioro) y un modelo de
Cox PH (hazard ratios de las covariables basales). Para los pacientes censurados,
aproxima el riesgo de deterioro a corto plazo por la tendencia.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from statsmodels.duration.hazard_regression import PHReg
from statsmodels.duration.survfunc import SurvfuncRight

from . import config

SEVERE_EVENTS = {"descontrol_hipertensivo", "incremento_subito_glucosa"}
CES_DETER = 40.0
HORIZON = 365
COVARIATES = ["glucosa_baseline", "imc_baseline", "age", "n_comorbilidades", "adherencia"]


def build_survival_table(ces_timeline: pd.DataFrame, events: pd.DataFrame,
                         snapshots: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, s in snapshots.iterrows():
        pid = int(s["patient_id"])
        tl = ces_timeline[ces_timeline.patient_id == pid].sort_values("t_days")
        t_ces = tl[tl.ces < CES_DETER]["t_days"].min() if len(tl) else np.nan
        sev = events[(events.patient_id == pid) & (events.type.isin(SEVERE_EVENTS))]
        t_ev = sev["t_event"].min() if len(sev) else np.nan

        candidates = [t for t in (t_ces, t_ev) if not pd.isna(t)]
        if candidates:
            duration, event = float(min(candidates)), 1
        else:
            last_t = float(tl["t_days"].max()) if len(tl) else HORIZON
            duration, event = max(last_t, 1.0), 0
        rows.append({"patient_id": pid, "duration": duration, "event": event,
                     "archetype": s["archetype"],
                     **{c: float(s[c]) for c in COVARIATES}})
    return pd.DataFrame(rows)


def km_curve(table: pd.DataFrame) -> dict:
    sf = SurvfuncRight(table["duration"].to_numpy(), table["event"].to_numpy())
    return {"time": sf.surv_times.tolist(), "surv": sf.surv_prob.tolist()}


def km_by_group(table: pd.DataFrame, group="archetype") -> dict:
    out = {}
    for g, sub in table.groupby(group):
        if sub["event"].sum() == 0 and len(sub) < 3:
            continue
        sf = SurvfuncRight(sub["duration"].to_numpy(), sub["event"].to_numpy())
        out[str(g)] = {"time": sf.surv_times.tolist(), "surv": sf.surv_prob.tolist()}
    return out


def cox_model(table: pd.DataFrame) -> pd.DataFrame:
    X = table[COVARIATES].to_numpy(float)
    # estandariza para HR comparables por desviación estándar
    Xs = (X - X.mean(0)) / (X.std(0) + 1e-9)
    mod = PHReg(table["duration"].to_numpy(float), Xs, status=table["event"].to_numpy(int))
    res = mod.fit()
    params, se = res.params, res.bse
    rows = []
    for i, cov in enumerate(COVARIATES):
        hr = float(np.exp(params[i]))
        lo, hi = float(np.exp(params[i] - 1.96 * se[i])), float(np.exp(params[i] + 1.96 * se[i]))
        rows.append({"covariate": cov, "hazard_ratio": round(hr, 3),
                     "ci95": [round(lo, 3), round(hi, 3)],
                     "p_value": round(float(res.pvalues[i]), 4)})
    return pd.DataFrame(rows).sort_values("hazard_ratio", ascending=False)


def trend_deterioration_risk(snapshots: pd.DataFrame) -> pd.DataFrame:
    """Riesgo de deterioro a corto plazo por tendencia (para censurados/seguimiento):
    combina pendiente de riesgo, pendiente de glucosa y CES actual."""
    s = snapshots.copy()
    risk = (np.clip(s["riesgo_slope_m"] / 0.1, 0, 1) * 0.4
            + np.clip(s["glucosa_slope_m"] / 10, 0, 1) * 0.3
            + np.clip(1 - s["ces"] / 100, 0, 1) * 0.3)
    out = s[["patient_id", "archetype", "ces", "riesgo_slope_m", "glucosa_slope_m"]].copy()
    out["deterioration_risk"] = (100 * risk).round(1)
    return out.sort_values("deterioration_risk", ascending=False)
