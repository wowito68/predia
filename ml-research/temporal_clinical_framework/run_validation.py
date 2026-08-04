"""FASE 2I — Validación clínica: interpretabilidad, recuperación de estructura,
lead-time de alertas e indicadores más útiles."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_temporal import config, validation, events, plots  # noqa: E402


def main():
    df = pd.read_csv(config.DATASETS_DIR / "cohort_long.csv")
    feat = pd.read_csv(config.DATASETS_DIR / "features.csv")
    meta = pd.read_csv(config.DATASETS_DIR / "cohort_meta.csv")
    ces_df = pd.read_csv(config.METRICS_DIR / "ces.csv")
    ev_true = pd.read_csv(config.DATASETS_DIR / "cohort_events.csv")
    clu = json.load(open(config.METRICS_DIR / "clustering.json"))

    # 1) CES recupera el orden clínico de los arquetipos
    ces_valid = validation.ces_archetype_validity(ces_df, meta)
    ces_valid.to_csv(config.METRICS_DIR / "validation_ces_by_archetype.csv", index=False)

    # 2) Indicadores más útiles para anticipar deterioro
    imp = validation.indicator_usefulness(feat, meta)
    imp.to_csv(config.METRICS_DIR / "indicator_usefulness.csv", index=False)
    plots.plot_indicator_importance(imp, config.fig_dir("validation") / "indicator_importance.png")

    # 3) Lead-time de las alertas frente a los eventos reales
    detected = {pid: events.detect_all(df, pid) for pid in sorted(df.patient_id.unique())}
    lead = validation.event_lead_time(ev_true, detected)

    # 4) Concordancia clustering ↔ arquetipo (ARI del mejor método, ya en clustering.json)
    best = clu["best_method"]
    ari = next(c["ari_vs_arquetipo"] for c in clu["comparison"] if c["method"] == best)

    summary = {
        "ces_recupera_orden_clinico": ces_valid.to_dict("records"),
        "clustering_best": best, "ari_vs_arquetipo": ari,
        "alertas_lead_time": lead,
        "top_indicadores_deterioro": imp.head(12).to_dict("records"),
    }
    with open(config.METRICS_DIR / "validation.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print("=== Validación clínica ===")
    print("\nCES por arquetipo (debe ordenar mejora>estable>deterioro):")
    print(ces_valid.to_string(index=False))
    print(f"\nClustering {best}: ARI vs arquetipo = {ari}")
    print(f"\nAlertas tempranas: detección={lead['detection_rate']:.0%}, "
          f"lead-time mediano={lead['median_lead_time_days']} días "
          f"(n={lead['n_events']} eventos)")
    print("\nTop-8 indicadores para anticipar deterioro:")
    print(imp.head(8).to_string(index=False))


if __name__ == "__main__":
    main()
