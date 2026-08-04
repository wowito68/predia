"""FASE 2D — Clinical Evolution Score (CES) por paciente + timelines."""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_temporal import config, ces, plots  # noqa: E402


def main():
    df = pd.read_csv(config.DATASETS_DIR / "cohort_long.csv")
    meta = pd.read_csv(config.DATASETS_DIR / "cohort_meta.csv")

    rows, timelines = [], []
    for pid in sorted(df.patient_id.unique()):
        r = ces.patient_ces(df, pid)
        rows.append({"patient_id": pid, "ces": r["ces"], "band": r["band"],
                     "E_evolution": r["E_evolution"], "G_state": r["G_state"],
                     "s_bar": r["s_bar"], "S_stability": r["S_stability"]})
        for pt in ces.ces_timeline(df, pid):
            pt["patient_id"] = pid
            timelines.append(pt)

    ces_df = pd.DataFrame(rows)
    ces_df.to_csv(config.METRICS_DIR / "ces.csv", index=False)
    pd.DataFrame(timelines).to_csv(config.DATASETS_DIR / "ces_timeline.csv", index=False)

    plots.plot_ces_by_archetype(ces_df, meta, config.fig_dir("ces") / "ces_by_archetype.png")
    for arch in config.ARCHETYPES:
        pid = int(meta[meta.archetype == arch].patient_id.iloc[0])
        tl = [t for t in timelines if t["patient_id"] == pid]
        plots.plot_ces_timeline(tl, config.fig_dir("ces") / f"ces_timeline_{arch.replace(' ', '_')}.png",
                                title=f"CES en el tiempo — {arch} (paciente {pid})")

    d = ces_df.merge(meta[["patient_id", "archetype"]], on="patient_id")
    print("=== CES 0-100 (fórmula: 100·(0.5·G_estado + 0.5·E_evolución)) ===")
    print("CES medio por arquetipo:")
    print(d.groupby("archetype")["ces"].mean().round(1).reindex(config.ARCHETYPES).to_string())
    print("\nDistribución de bandas:")
    print(ces_df.band.value_counts().to_string())


if __name__ == "__main__":
    main()
