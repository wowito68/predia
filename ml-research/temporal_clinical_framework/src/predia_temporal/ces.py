"""FASE 2D — Clinical Evolution Score (CES) 0-100.

Índice propio que combina dos componentes, ambos en [0,1]:

  E (EVOLUCIÓN)  = (1 + W)/2,  W = clip( s̄ − μ(1−S), −1, 1)
                   s̄ = Σ ω_v s_v / Σ ω_v  (tendencia direccional ponderada, motor existente)
                   S  = estabilidad media (penaliza la volatilidad)
  G (ESTADO)     = control clínico actual ponderado (glucosa, IMC, PA, actividad, riesgo ML)

  CES = 100 · ( W_STATE · G + W_TREND · E )

Justificación: un paciente *estable y bien controlado* (E=0.5, G≈0.8) obtiene ≈65
("Estable"); mejorar eleva E y el control eleva G hacia "Excelente"; deteriorarse y
perder control hunden el CES a "Riesgo alto/Deterioro severo" — consistente con las
bandas de la Fase 2D. Hereda la matemática de `docs/clinical-evolution-score.md`.
"""
from __future__ import annotations

import numpy as np

from . import config
from . import timeseries as ts
from .trends import directional_score


def _analyze_var(t, x, key) -> dict | None:
    t = np.asarray(t, float)
    x = np.asarray(x, float)
    if len(x) < 2 or (t[-1] - t[0]) < config.MIN_SPAN_DAYS:
        return {"current": float(x[-1]) if len(x) else None, "s": 0.0,
                "stability": 0.0, "reliable": False} if len(x) else None
    lr = ts.linear_regression(t, x)
    vol = ts.volatility(t, x)
    slope_m = lr["slope"] * config.DAYS_PER_MONTH
    return {
        "current": float(x[-1]),
        "slope_m": float(slope_m),
        "s": directional_score(slope_m, key),
        "stability": float(np.clip(1 - vol["cv"] / config.CV_MAX, 0, 1)),
        "reliable": True,
    }


def _control_score(key, value) -> float:
    """g_k ∈ [0,1]: qué tan bien controlado está el valor ACTUAL frente al objetivo clínico."""
    if value is None:
        return np.nan
    if key == "actividad":
        return float(np.clip(value / config.ACTIVITY_TARGET_MIN, 0, 1))
    if key == "riesgo":
        return float(np.clip(1 - value, 0, 1))
    cfg = config.VAR_BY_KEY.get(key)
    if cfg is None:
        return np.nan
    lo, hi, width = cfg.target_lo, cfg.target_hi, max(cfg.target_hi - cfg.target_lo, 1e-6)
    if lo <= value <= hi:
        return 1.0
    if value > hi:
        return float(np.clip(1 - (value - hi) / width, 0, 1))   # 1 ancho por encima → 0
    return float(np.clip(1 - (lo - value) / width * 0.5, 0, 1))  # por debajo, penaliza menos


def compute_ces(series: dict) -> dict:
    """series: {key: (t, x)} con al menos las variables de tendencia/estado disponibles."""
    analyzed = {}
    for key in ["glucosa", "imc", "pas", "pad"]:
        if key in series and len(series[key][1]):
            a = _analyze_var(*series[key], key)
            if a:
                analyzed[key] = a

    # --- Componente de tendencia E ---
    contrib = {k: a for k, a in analyzed.items()
               if config.VAR_BY_KEY[k].omega > 0 and a.get("reliable")}
    if contrib:
        sum_omega = sum(config.VAR_BY_KEY[k].omega for k in contrib)
        s_bar = sum(config.VAR_BY_KEY[k].omega * contrib[k]["s"] for k in contrib) / sum_omega
        S = float(np.mean([contrib[k]["stability"] for k in contrib]))
        W = float(np.clip(s_bar - config.VOL_PENALTY * (1 - S), -1, 1))
    else:
        s_bar, S, W = 0.0, 0.0, 0.0
    E = (1 + W) / 2

    # --- Componente de estado G ---
    g_parts, w_parts = [], []
    for key, w in config.STATE_WEIGHTS.items():
        cur = None
        if key in series and len(series[key][1]):
            cur = float(series[key][1][-1])
        g = _control_score(key, cur)
        if not np.isnan(g):
            g_parts.append(w * g)
            w_parts.append(w)
    G = float(sum(g_parts) / sum(w_parts)) if w_parts else 0.5

    ces = float(np.clip(100 * (config.W_STATE * G + config.W_TREND * E), 0, 100))
    return {
        "ces": round(ces, 1),
        "band": config.ces_band(ces),
        "E_evolution": round(E, 3),
        "G_state": round(G, 3),
        "s_bar": round(s_bar, 3),
        "S_stability": round(S, 3),
        "W": round(W, 3),
        "components": {k: {"s": round(a["s"], 3),
                           "stability": round(a.get("stability", 0), 3)}
                       for k, a in analyzed.items()},
    }


def patient_series_dict(df_long, patient_id, t_lo=None, t_hi=None) -> dict:
    sub = df_long[df_long.patient_id == patient_id]
    if t_hi is not None:
        sub = sub[sub.t_days <= t_hi]
    if t_lo is not None:
        sub = sub[sub.t_days >= t_lo]
    out = {}
    for key in config.SERIES_KEYS:
        s = sub[sub.variable == key].sort_values("t_days")
        if not s.empty:
            out[key] = (s["t_days"].to_numpy(), s["valor"].to_numpy())
    return out


def patient_ces(df_long, patient_id) -> dict:
    return compute_ces(patient_series_dict(df_long, patient_id))


def ces_timeline(df_long, patient_id, window=120, step_var="imc") -> list[dict]:
    """CES calculado en cada fecha de medición antropométrica usando una ventana
    móvil trailing de `window` días (CES que evoluciona en el tiempo)."""
    sub = df_long[df_long.patient_id == patient_id]
    times = np.sort(sub[sub.variable == step_var]["t_days"].unique())
    out = []
    for tc in times:
        sd = patient_series_dict(df_long, patient_id, t_lo=tc - window, t_hi=tc)
        if "imc" not in sd:
            continue
        res = compute_ces(sd)
        out.append({"t_days": float(tc), "ces": res["ces"], "band": res["band"],
                    "E": res["E_evolution"], "G": res["G_state"]})
    return out
