"""FASE 2H — Dashboards clínicos por paciente (listos para integrar en PREDIA)."""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_temporal import config, ces, trends, events, plots  # noqa: E402


def main():
    df = pd.read_csv(config.DATASETS_DIR / "cohort_long.csv")
    meta = pd.read_csv(config.DATASETS_DIR / "cohort_meta.csv")
    ev_true = pd.read_csv(config.DATASETS_DIR / "cohort_events.csv")

    # Un dashboard representativo por arquetipo
    made = []
    for arch in config.ARCHETYPES:
        pid = int(meta[meta.archetype == arch].patient_id.iloc[0])
        ces_res = ces.patient_ces(df, pid)
        tl = ces.ces_timeline(df, pid)
        tr = trends.patient_trends(df, pid)
        det = events.detect_all(df, pid)
        inj = ev_true[ev_true.patient_id == pid].to_dict("records")
        meta_row = meta[meta.patient_id == pid].iloc[0].to_dict()
        out = config.DASHBOARDS_DIR / f"dashboard_{arch.replace(' ', '_')}_p{pid}.png"
        plots.plot_dashboard(df, pid, ces_res, tl, tr, det, inj, meta_row, out)
        made.append(out.name)

    print("=== Dashboards generados ===")
    for m in made:
        print(" ", m)


if __name__ == "__main__":
    main()
