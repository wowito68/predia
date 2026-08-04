"""FASE 3D — Patient Trajectories.

Mapea la serie de riesgo(t) a las bandas de FASE 1 (Bajo/Moderado/Alto/Muy Alto),
construye la secuencia de bandas por paciente, la matriz de transición (Markov) y
analiza qué eventos preceden las transiciones a peor.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import config

BANDS = config.RISK_LEVELS
BAND_IDX = {b: i for i, b in enumerate(BANDS)}


def band_sequence(df_long: pd.DataFrame, pid: int) -> list[dict]:
    """Secuencia comprimida de bandas de riesgo del paciente (con su t de inicio).

    El riesgo se suaviza con una media móvil (ventana 3) antes de mapear a bandas,
    para que las transiciones reflejen tendencia clínica y no ruido de medición.
    """
    s = df_long[(df_long.patient_id == pid) & (df_long.variable == "riesgo")].sort_values("t_days")
    smooth = s.valor.rolling(3, center=True, min_periods=1).mean()
    seq = []
    prev = None
    for t, v in zip(s.t_days, smooth):
        b = config.risk_band(float(v))
        if b != prev:
            seq.append({"t": float(t), "band": b})
            prev = b
    return seq


def transitions(df_long: pd.DataFrame) -> tuple:
    """Cuenta transiciones banda→banda (consecutivas distintas) sobre toda la cohorte."""
    M = np.zeros((4, 4), dtype=int)
    up_transitions = []  # (pid, t, from, to)
    for pid in sorted(df_long.patient_id.unique()):
        seq = band_sequence(df_long, pid)
        for a, b in zip(seq[:-1], seq[1:]):
            i, j = BAND_IDX[a["band"]], BAND_IDX[b["band"]]
            M[i, j] += 1
            if j > i:
                up_transitions.append({"patient_id": pid, "t": b["t"],
                                       "from": a["band"], "to": b["band"]})
    return M, pd.DataFrame(up_transitions)


def transition_matrix_norm(M) -> np.ndarray:
    row = M.sum(axis=1, keepdims=True)
    return np.divide(M, row, out=np.zeros_like(M, float), where=row > 0)


def classify_trajectory(seq: list[dict]) -> str:
    if len(seq) < 2:
        return "Sin transiciones"
    first, last = BAND_IDX[seq[0]["band"]], BAND_IDX[seq[-1]["band"]]
    idxs = [BAND_IDX[s["band"]] for s in seq]
    n_up = sum(idxs[k] < idxs[k + 1] for k in range(len(idxs) - 1))
    n_down = sum(idxs[k] > idxs[k + 1] for k in range(len(idxs) - 1))
    if n_up and n_down:
        return "Oscila"
    if last > first:
        return "Empeora"
    if last < first:
        return "Mejora"
    return "Estable"


def events_before_transitions(up_df: pd.DataFrame, events: pd.DataFrame, window=60) -> dict:
    """% de transiciones a peor precedidas por un evento agudo en `window` días."""
    if up_df.empty:
        return {"n_up": 0, "pct_con_evento_previo": float("nan")}
    n_with = 0
    for tr in up_df.itertuples():
        ev = events[(events.patient_id == tr.patient_id) &
                    (events.t_event <= tr.t) & (events.t_event >= tr.t - window)]
        if len(ev):
            n_with += 1
    return {"n_up": int(len(up_df)),
            "pct_con_evento_previo": round(n_with / len(up_df), 3)}


def trajectory_summary(df_long: pd.DataFrame, meta: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for pid in sorted(df_long.patient_id.unique()):
        seq = band_sequence(df_long, pid)
        route = " → ".join(s["band"] for s in seq) if seq else "—"
        rows.append({"patient_id": pid, "trajectory_type": classify_trajectory(seq),
                     "n_states": len(seq), "route": route})
    return pd.DataFrame(rows).merge(meta[["patient_id", "archetype"]], on="patient_id")
