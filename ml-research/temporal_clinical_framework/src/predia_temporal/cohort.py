"""Generador de una cohorte longitudinal sintética realista (Fase 2A).

Cada paciente sigue un ARQUETIPO clínico que define trayectorias acopladas (peso→IMC,
glucosa↔riesgo, presión) con tendencia + oscilación + ruido de medición y MUESTREO
IRREGULAR (cada variable en su propio calendario, como en la práctica). Algunos
pacientes reciben EVENTOS agudos inyectados (con día de verdad-terreno) para validar la
detección de eventos. La estructura imita el esquema PREDIA (Automonitoreo /
MedicionAntropometrica / Prediccion), de modo que el mismo pipeline sirva con datos reales.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import config

HORIZON_DAYS = 365

# Pendientes mensuales por arquetipo (unidades clínicas / mes) y amplitud de oscilación.
# 'base' desplaza las líneas base (perfil de alto riesgo arranca peor).
ARCHETYPE_PARAMS = {
    "Mejora rápida": dict(
        slope=dict(glucosa=-7, imc=-0.35, pas=-3.0, pad=-1.5, peso=-1.0, actividad=+15),
        osc=0.4, base=dict(glucosa=150, imc=31, pas=138, pad=88, actividad=60)),
    "Estable": dict(
        slope=dict(glucosa=0.3, imc=0.0, pas=0.2, pad=0.1, peso=0.0, actividad=0),
        osc=0.5, base=dict(glucosa=108, imc=26, pas=122, pad=78, actividad=140)),
    "Deterioro lento": dict(
        slope=dict(glucosa=+5, imc=+0.2, pas=+2.0, pad=+1.0, peso=+0.6, actividad=-6),
        osc=0.5, base=dict(glucosa=115, imc=27, pas=124, pad=80, actividad=120)),
    "Alto riesgo persistente": dict(
        slope=dict(glucosa=+0.5, imc=+0.05, pas=+0.3, pad=+0.2, peso=+0.1, actividad=-2),
        osc=0.7, base=dict(glucosa=178, imc=35, pas=150, pad=94, actividad=45)),
    "Oscilante": dict(
        slope=dict(glucosa=0.0, imc=0.0, pas=0.0, pad=0.0, peso=0.0, actividad=0),
        osc=2.2, base=dict(glucosa=140, imc=30, pas=134, pad=86, actividad=90)),
}
ARCHETYPE_PROBS = [0.20, 0.28, 0.22, 0.15, 0.15]

# Ruido de medición (σ) y amplitud base de oscilación por variable
NOISE = dict(glucosa=9.0, imc=0.25, pas=4.5, pad=3.0, peso=0.7, actividad=18)
OSC_AMP = dict(glucosa=12, imc=0.4, pas=6, pad=4, peso=1.0, actividad=25)
# Intervalo de muestreo (días) por variable -> irregularidad realista
SAMPLE_EVERY = dict(glucosa=(4, 9), antropometria=(12, 22))  # glucosa frecuente; peso/PA/IMC juntos


def _risk_from_state(glucosa, imc, pas, age) -> float:
    """Proxy logístico del riesgo de diabetes (sustituye al modelo de FASE 1)."""
    z = (-2.4 + 1.15 * (glucosa - 105) / 30 + 0.8 * (imc - 25) / 5
         + 0.5 * (pas - 120) / 15 + 0.45 * (age - 50) / 10)
    return float(1 / (1 + np.exp(-z)))


def _sample_days(rng, lo_hi) -> np.ndarray:
    lo, hi = lo_hi
    days, t = [], float(rng.integers(0, 4))
    while t <= HORIZON_DAYS:
        days.append(round(t, 1))
        t += rng.integers(lo, hi + 1)
    return np.array(days)


def _series(rng, key, params, age, days) -> np.ndarray:
    base = params["base"].get(key)
    if base is None:  # peso se deriva del IMC; no debería pedirse aquí
        base = 75.0
    base = base * rng.normal(1.0, 0.06)
    slope_m = params["slope"].get(key, 0.0) * rng.normal(1.0, 0.15)
    amp = OSC_AMP[key] * params["osc"] * rng.normal(1.0, 0.2)
    period = rng.uniform(45, 110)
    phase = rng.uniform(0, 2 * np.pi)
    t = np.asarray(days, float)
    trend = base + slope_m * (t / config.DAYS_PER_MONTH)
    osc = amp * np.sin(2 * np.pi * t / period + phase)
    noise = rng.normal(0, NOISE[key], size=len(t))
    vals = trend + osc + noise
    if key in ("glucosa", "imc", "pas", "pad", "peso"):
        vals = np.clip(vals, {"glucosa": 55, "imc": 16, "pas": 85, "pad": 50, "peso": 40}[key], None)
    if key == "actividad":
        vals = np.clip(vals, 0, None)
    return vals


def _inject_event(rng, key, days, vals, archetype):
    """Inyecta un evento agudo; devuelve (vals, evento|None)."""
    if len(days) < 6:
        return vals, None
    # probabilidad de evento mayor en perfiles de deterioro / alto riesgo / oscilante
    p = {"Mejora rápida": 0.05, "Estable": 0.08, "Deterioro lento": 0.30,
         "Alto riesgo persistente": 0.40, "Oscilante": 0.25}[archetype]
    if rng.random() > p:
        return vals, None
    i = int(rng.integers(len(days) // 2, len(days) - 1))
    kinds = {"glucosa": ("incremento_subito_glucosa", rng.uniform(60, 110)),
             "peso": ("aumento_rapido_peso", rng.uniform(4, 8)),
             "pas": ("descontrol_hipertensivo", rng.uniform(25, 45))}
    if key not in kinds:
        return vals, None
    kind, delta = kinds[key]
    vals = vals.copy()
    vals[i:] += delta  # salto sostenido a partir del día del evento
    return vals, {"variable": key, "t_event": float(days[i]), "type": kind}


def generate(n_patients: int = 400, seed: int = config.SEED):
    """Genera la cohorte. Devuelve (df_long, meta_df, events_df)."""
    rng = np.random.default_rng(seed)
    long_rows, meta_rows, event_rows = [], [], []
    base_date = pd.Timestamp("2025-01-01")

    for pid in range(1, n_patients + 1):
        arch = rng.choice(config.ARCHETYPES, p=ARCHETYPE_PROBS)
        params = ARCHETYPE_PARAMS[arch]
        sex = int(rng.integers(0, 2))
        age = int(np.clip(rng.normal(54, 13), 25, 88))
        height = rng.normal(1.70 if sex else 1.60, 0.07)

        # Calendarios de muestreo
        d_glu = _sample_days(rng, SAMPLE_EVERY["glucosa"])
        d_ant = _sample_days(rng, SAMPLE_EVERY["antropometria"])

        # Series antropométricas/PA en el calendario 'd_ant'
        imc = _series(rng, "imc", params, age, d_ant)
        pas = _series(rng, "pas", params, age, d_ant)
        pad = _series(rng, "pad", params, age, d_ant)
        act = _series(rng, "actividad", params, age, d_ant)
        peso = np.clip(imc * (height ** 2), 40, None)  # peso derivado del IMC (acoplado)

        # Glucosa en su propio calendario (más frecuente)
        glu = _series(rng, "glucosa", params, age, d_glu)

        # Inyección de eventos
        glu, ev_g = _inject_event(rng, "glucosa", d_glu, glu, arch)
        peso, ev_w = _inject_event(rng, "peso", d_ant, peso, arch)
        pas, ev_p = _inject_event(rng, "pas", d_ant, pas, arch)
        for ev in (ev_g, ev_w, ev_p):
            if ev:
                ev["patient_id"] = pid
                event_rows.append(ev)

        # Riesgo: calculado en el calendario antropométrico, interpolando la glucosa
        glu_at_ant = np.interp(d_ant, d_glu, glu)
        riesgo = np.array([_risk_from_state(g, b, s, age)
                           for g, b, s in zip(glu_at_ant, imc, pas)])

        # Volcar a formato largo
        def add(days, key, vals):
            for t, v in zip(days, vals):
                long_rows.append((pid, arch, base_date + pd.Timedelta(days=float(t)),
                                  round(float(t), 1), key, round(float(v), 3)))

        add(d_glu, "glucosa", glu)
        add(d_ant, "imc", imc)
        add(d_ant, "peso", peso)
        add(d_ant, "pas", pas)
        add(d_ant, "pad", pad)
        add(d_ant, "actividad", act)
        add(d_ant, "riesgo", riesgo)

        meta_rows.append(dict(patient_id=pid, archetype=arch, sex=sex, age=age,
                              height=round(float(height), 3),
                              n_glucosa=len(d_glu), n_antropometria=len(d_ant)))

    df_long = pd.DataFrame(long_rows, columns=[
        "patient_id", "archetype", "fecha", "t_days", "variable", "valor"])
    meta_df = pd.DataFrame(meta_rows)
    events_df = pd.DataFrame(event_rows, columns=["patient_id", "variable", "t_event", "type"]) \
        if event_rows else pd.DataFrame(columns=["patient_id", "variable", "t_event", "type"])
    return df_long, meta_df, events_df


def series_for(df_long: pd.DataFrame, patient_id: int, key: str):
    """Devuelve (t_days, valores) ordenados de una variable de un paciente."""
    s = df_long[(df_long.patient_id == patient_id) & (df_long.variable == key)] \
        .sort_values("t_days")
    return s["t_days"].to_numpy(), s["valor"].to_numpy()
