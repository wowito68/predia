"""FASE 2E — Detección de eventos (Z-score, EWMA, CUSUM, IsolationForest, LOF, reglas)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_temporal import config, events, plots  # noqa: E402


def main():
    df = pd.read_csv(config.DATASETS_DIR / "cohort_long.csv")
    ev_true = pd.read_csv(config.DATASETS_DIR / "cohort_events.csv")

    detected = {}
    method_counts = {}
    for pid in sorted(df.patient_id.unique()):
        res = events.detect_all(df, pid)
        # serializa (clinical_rules son dicts; el resto listas de t)
        detected[int(pid)] = res
        for m, lst in res.items():
            method_counts[m] = method_counts.get(m, 0) + (len(lst) if isinstance(lst, list) else 0)

    # Persistir compacto (conteos por método + alertas por paciente)
    serial = {str(pid): {m: (v if all(not isinstance(i, dict) for i in v) else v)
                          for m, v in res.items()} for pid, res in detected.items()}
    with open(config.METRICS_DIR / "events_detected.json", "w", encoding="utf-8") as f:
        json.dump({"method_counts": method_counts, "by_patient": serial}, f, ensure_ascii=False, indent=1)

    # Figura de ejemplo: un paciente con evento de glucosa
    glu_ev = ev_true[ev_true.type == "incremento_subito_glucosa"]
    if len(glu_ev):
        pid = int(glu_ev.patient_id.iloc[0])
        inj = ev_true[ev_true.patient_id == pid].to_dict("records")
        plots.plot_events(df, pid, detected[pid], inj, config.fig_dir("events") / "event_example.png")

    print("=== Detección de eventos — alertas totales por método ===")
    for m, c in sorted(method_counts.items(), key=lambda kv: -kv[1]):
        print(f"  {m:24s} {c}")
    print(f"\nEventos agudos reales (ground-truth): {len(ev_true)}")


if __name__ == "__main__":
    main()
