"""FASE 1F — Validación clínica de las bandas de riesgo en el conjunto TEST
(held-out, nunca visto en tuning/calibración/umbralización).

Para cada banda: prevalencia observada, odds ratio y riesgo relativo vs banda Bajo.
Para cada umbral de decisión: sensibilidad, especificidad, PPV, NPV, LR+.
Determina si los grupos tienen significado clínico real (monotonía + OR/RR crecientes).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from predia_brfss import config, clinical, risk, plots  # noqa: E402

OUT = config.CLINICAL_DIR


def main():
    pk = joblib.load(config.DATASETS_DIR / "proba_calibrated.joblib")
    strat = json.load(open(config.RISK_DIR / "stratification.json"))
    thr = strat["chosen_thresholds"]
    proba, y = pk["proba_test"], pk["y_test"]   # TEST held-out
    print(f"Validación clínica en TEST ({len(y):,}) | método {strat['chosen_method']} "
          f"| umbrales {thr}")

    bands = risk.band_table(proba, y, thr)
    assoc = clinical.per_band_association(proba, y, thr)
    oper = clinical.per_threshold_operating(proba, y, thr)

    pd.DataFrame(bands).to_csv(OUT / "bands_test.csv", index=False)
    pd.DataFrame(assoc).to_csv(OUT / "band_association_test.csv", index=False)
    pd.DataFrame(oper).to_csv(OUT / "operating_points_test.csv", index=False)

    plots.plot_band_prevalence(bands, "Prevalencia observada por banda — TEST",
                               OUT / "band_prevalence_test.png")
    plots.plot_forest(assoc, "odds_ratio_vs_bajo", "or_ci95",
                      "Odds Ratio por banda vs Bajo — TEST", OUT / "forest_or.png")
    plots.plot_forest(assoc, "relative_risk_vs_bajo", "rr_ci95",
                      "Riesgo relativo por banda vs Bajo — TEST", OUT / "forest_rr.png")

    prevs = [b["observed_prevalence"] for b in bands]
    monotonic = all(prevs[i] > prevs[i - 1] for i in range(1, 4))
    or_increasing = all(
        assoc[i]["odds_ratio_vs_bajo"] >= assoc[i - 1]["odds_ratio_vs_bajo"]
        for i in range(1, 4))
    verdict = {
        "monotonic_prevalence": bool(monotonic),
        "or_increasing": bool(or_increasing),
        "prevalence_low_band": prevs[0],
        "prevalence_high_band": prevs[-1],
        "fold_increase_extreme": round(prevs[-1] / prevs[0], 2) if prevs[0] else None,
        "clinically_meaningful": bool(monotonic and or_increasing),
    }

    out = {"model": pk["model"], "calibration": pk["variant"],
           "method": strat["chosen_method"], "thresholds": thr,
           "bands": bands, "association": assoc, "operating_points": oper,
           "verdict": verdict}
    with open(OUT / "clinical_validation.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)

    print("\n=== Bandas en TEST ===")
    for b, a in zip(bands, assoc):
        print(f"  {b['band']:9s} n={b['n']:>6,} prev={b['observed_prevalence']:.3f} "
              f"OR={a['odds_ratio_vs_bajo']:>6} RR={a['relative_risk_vs_bajo']:>5} "
              f"-> {b['action']}")
    print("\n=== Puntos de operación (cribado >= umbral) ===")
    print(pd.DataFrame(oper).to_string(index=False))
    print(f"\nVeredicto: clínicamente significativo = {verdict['clinically_meaningful']} "
          f"| incremento extremo x{verdict['fold_increase_extreme']}")


if __name__ == "__main__":
    main()
