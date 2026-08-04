"""FASE 3B — Priority Score para toda la cohorte."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_cdss import config, priority, plots  # noqa: E402


def main():
    snap = pd.read_csv(config.DATASETS_DIR / "snapshots.csv")
    rows = priority.score_frame(snap)
    pr = pd.DataFrame(rows)

    # CSV plano (sin dicts) + JSON completo
    flat = pr[["patient_id", "priority_score", "priority_band", "top_driver"]] \
        .merge(snap[["patient_id", "archetype"]], on="patient_id")
    flat.to_csv(config.METRICS_DIR / "priority.csv", index=False)
    with open(config.METRICS_DIR / "priority_full.json", "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)

    plots.plot_priority_distribution(pr, config.fig_dir("priority") / "priority_distribution.png")
    plots.plot_priority_components(pr, config.fig_dir("priority") / "priority_components.png")

    print("=== Priority Score 0-100 ===")
    print("Pacientes por banda:")
    print(pr.priority_band.value_counts().reindex(["Crítica", "Alta", "Media", "Baja"]).to_string())
    print("\nDriver principal (frecuencia):")
    print(pr.top_driver.value_counts().to_string())
    print("\nPriority medio por arquetipo:")
    print(flat.groupby("archetype").priority_score.mean().round(1).sort_values(ascending=False).to_string())


if __name__ == "__main__":
    main()
