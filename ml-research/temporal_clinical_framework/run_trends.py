"""FASE 2C — Clasificación de tendencias clínicas por serie."""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_temporal import config, trends, plots  # noqa: E402


def main():
    df = pd.read_csv(config.DATASETS_DIR / "cohort_long.csv")
    tr = trends.all_trends(df)
    tr.to_csv(config.METRICS_DIR / "trends.csv", index=False)
    plots.plot_trend_distribution(tr, config.fig_dir("trends") / "trend_distribution.png")

    meta = pd.read_csv(config.DATASETS_DIR / "cohort_meta.csv")
    print("=== Tendencias por variable ===")
    print(pd.crosstab(tr.variable, tr.trend).to_string())
    print("\n=== Glucosa: tendencia × arquetipo ===")
    g = tr[tr.variable == "glucosa"].merge(meta[["patient_id", "archetype"]], on="patient_id")
    print(pd.crosstab(g.archetype, g.trend).to_string())


if __name__ == "__main__":
    main()
