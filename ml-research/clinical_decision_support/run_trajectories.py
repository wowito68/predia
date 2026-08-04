"""FASE 3D — Trayectorias clínicas y transiciones de banda de riesgo."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_cdss import config, trajectories, plots  # noqa: E402


def main():
    long = pd.read_csv(config.TEMPORAL_DIR / "datasets" / "cohort_long.csv")
    meta = pd.read_csv(config.TEMPORAL_DIR / "datasets" / "cohort_meta.csv")
    events = pd.read_csv(config.TEMPORAL_DIR / "datasets" / "cohort_events.csv")

    M, up_df = trajectories.transitions(long)
    Mn = trajectories.transition_matrix_norm(M)
    summary = trajectories.trajectory_summary(long, meta)
    summary.to_csv(config.METRICS_DIR / "trajectories.csv", index=False)
    evb = trajectories.events_before_transitions(up_df, events)

    plots.plot_transition_heatmap(Mn, config.fig_dir("trajectories") / "transition_matrix.png")

    out = {"transition_counts": M.tolist(), "transition_matrix": Mn.round(3).tolist(),
           "bands": config.RISK_LEVELS,
           "trajectory_types": summary.trajectory_type.value_counts().to_dict(),
           "events_before_upgrades": evb,
           "example_routes": summary[summary.n_states >= 3]["route"].head(8).tolist()}
    with open(config.METRICS_DIR / "trajectories.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    print("=== Trayectorias de pacientes (bandas de riesgo F1) ===")
    print("Tipos de trayectoria:")
    print(summary.trajectory_type.value_counts().to_string())
    print(f"\nTransiciones a peor precedidas por evento agudo (<60 d): "
          f"{evb['pct_con_evento_previo']:.0%} de {evb['n_up']}")
    print("\nMatriz de transición (Markov):")
    print(pd.DataFrame(Mn.round(2), index=config.RISK_LEVELS, columns=config.RISK_LEVELS).to_string())
    print("\nRutas de ejemplo (≥3 estados):")
    for r in out["example_routes"][:6]:
        print("  ", r)


if __name__ == "__main__":
    main()
