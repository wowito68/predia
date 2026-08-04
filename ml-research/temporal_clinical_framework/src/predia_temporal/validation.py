"""FASE 2I — Validación clínica del framework temporal.

Responde: ¿las tendencias/clusters son interpretables y recuperan estructura real?
¿las alertas permiten intervención temprana (lead-time)? ¿qué indicadores son más
útiles para anticipar el deterioro?
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import adjusted_rand_score

from . import config

# Arquetipos considerados "deterioro" para la etiqueta de utilidad de indicadores
DETERIORATING = {"Deterioro lento", "Alto riesgo persistente"}


def cluster_archetype_agreement(pids, labels, meta_df) -> dict:
    """ARI entre la partición por clustering y los arquetipos verdaderos."""
    d = pd.DataFrame({"patient_id": pids, "cluster": labels}) \
        .merge(meta_df[["patient_id", "archetype"]], on="patient_id")
    d = d[d.cluster != -1]
    if d.empty:
        return {"ari": float("nan"), "n": 0}
    arch_codes = d.archetype.astype("category").cat.codes
    return {"ari": round(float(adjusted_rand_score(arch_codes, d.cluster)), 3), "n": len(d)}


def indicator_usefulness(feat_df, meta_df) -> pd.DataFrame:
    """Importancia de cada indicador temporal para predecir 'deterioro' (RF)."""
    base = feat_df.drop(columns=[c for c in ["archetype"] if c in feat_df.columns])
    d = base.merge(meta_df[["patient_id", "archetype"]], on="patient_id")
    y = d.archetype.isin(DETERIORATING).astype(int)
    drop = ["patient_id", "archetype", "t_now"]
    X = d.drop(columns=[c for c in drop if c in d.columns]).select_dtypes("number").fillna(0)
    rf = RandomForestClassifier(n_estimators=300, max_depth=8, random_state=config.SEED,
                                class_weight="balanced", n_jobs=-1).fit(X, y)
    imp = pd.DataFrame({"feature": X.columns, "importance": rf.feature_importances_}) \
        .sort_values("importance", ascending=False).reset_index(drop=True)
    return imp


def event_lead_time(events_df, detected_by_patient, window=45) -> dict:
    """Para cada evento inyectado, busca la alerta más temprana en [t_event-window, t_event].
    lead_time = t_event - t_alerta (>0 = anticipación)."""
    if events_df.empty:
        return {"n_events": 0, "detection_rate": float("nan"),
                "median_lead_time_days": float("nan"), "mean_lead_time_days": float("nan")}
    leads, detected = [], 0
    for ev in events_df.itertuples():
        alerts = detected_by_patient.get(ev.patient_id, {})
        all_t = []
        for method, ts_list in alerts.items():
            if isinstance(ts_list, list):
                for item in ts_list:
                    td = item["t"] if isinstance(item, dict) else item
                    all_t.append(float(td))
        cand = [td for td in all_t if (ev.t_event - window) <= td <= ev.t_event + 3]
        if cand:
            detected += 1
            leads.append(ev.t_event - min(cand))
    return {
        "n_events": int(len(events_df)),
        "detection_rate": round(detected / len(events_df), 3),
        "median_lead_time_days": round(float(np.median(leads)), 1) if leads else float("nan"),
        "mean_lead_time_days": round(float(np.mean(leads)), 1) if leads else float("nan"),
    }


def ces_archetype_validity(ces_df, meta_df) -> pd.DataFrame:
    """CES medio por arquetipo (debe ordenar mejora>estable>deterioro)."""
    d = ces_df.merge(meta_df[["patient_id", "archetype"]], on="patient_id")
    g = d.groupby("archetype")["ces"].agg(["mean", "std", "count"]).round(2)
    return g.reindex(config.ARCHETYPES).reset_index()
