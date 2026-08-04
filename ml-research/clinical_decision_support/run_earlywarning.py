"""FASE 3E — Early Warning System (Kaplan-Meier + Cox PH + riesgo por tendencia)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_cdss import config, earlywarning, plots  # noqa: E402


def main():
    snap = pd.read_csv(config.DATASETS_DIR / "snapshots.csv")
    ces_tl = pd.read_csv(config.TEMPORAL_DIR / "datasets" / "ces_timeline.csv")
    events = pd.read_csv(config.TEMPORAL_DIR / "datasets" / "cohort_events.csv")

    table = earlywarning.build_survival_table(ces_tl, events, snap)
    table.to_csv(config.DATASETS_DIR / "survival_table.csv", index=False)

    km = earlywarning.km_curve(table)
    km_groups = earlywarning.km_by_group(table)
    cox = earlywarning.cox_model(table)
    cox.to_csv(config.METRICS_DIR / "cox_hazard_ratios.csv", index=False)
    trend_risk = earlywarning.trend_deterioration_risk(snap)
    trend_risk.to_csv(config.METRICS_DIR / "trend_deterioration_risk.csv", index=False)

    plots.plot_km(km, km_groups, config.fig_dir("earlywarning") / "kaplan_meier.png")
    plots.plot_cox_forest(cox, config.fig_dir("earlywarning") / "cox_forest.png")

    with open(config.METRICS_DIR / "earlywarning.json", "w", encoding="utf-8") as f:
        json.dump({"n": len(table), "event_rate": round(float(table.event.mean()), 3),
                   "median_followup": round(float(table.duration.median()), 1),
                   "cox": cox.to_dict("records")}, f, ensure_ascii=False, indent=1)

    print("=== Early Warning System (time-to-deterioro: CES<40 o evento severo) ===")
    print(f"Pacientes: {len(table)} | tasa de evento: {table.event.mean():.1%} | "
          f"seguimiento mediano: {table.duration.median():.0f} d")
    print("\nCox PH — Hazard Ratios (covariables basales estandarizadas):")
    print(cox.to_string(index=False))
    print("\nTop-8 pacientes por riesgo de deterioro (tendencia):")
    print(trend_risk.head(8)[["patient_id", "archetype", "ces", "deterioration_risk"]].to_string(index=False))


if __name__ == "__main__":
    main()
