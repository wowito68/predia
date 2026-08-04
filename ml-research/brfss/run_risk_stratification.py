"""FASE 1D — Estratificación de riesgo a partir de probabilidades CALIBRADAS.

Compara 4 métodos de umbralización (percentiles, cuartiles, sensibilidad clínica,
cost-sensitive) sobre *val*, evalúa su capacidad de separación de grupos y elige el
mejor según criterios clínicos (monotonía + separación). Persiste los umbrales
elegidos para la validación clínica.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from predia_brfss import config, risk, plots  # noqa: E402

OUT = config.RISK_DIR


def _score_method(name, thresholds, proba, y):
    sep = risk.separation_metrics(proba, y, thresholds)
    bands = risk.band_table(proba, y, thresholds)
    return {"method": name, "method_desc": risk.METHODS[name],
            "thresholds": thresholds, **sep, "bands": bands}


def main():
    pk = joblib.load(config.DATASETS_DIR / "proba_calibrated.joblib")
    proba, y = pk["proba_val"], pk["y_val"]
    print(f"Modelo {pk['model']} ({pk['variant']}) — derivando umbrales en val "
          f"({len(y):,} pacientes)")

    all_thr = risk.all_thresholds(y, proba)
    results = {name: _score_method(name, thr, proba, y) for name, thr in all_thr.items()}

    # Tabla comparativa de métodos
    comp = pd.DataFrame([{
        "method": r["method"],
        "thresholds": r["thresholds"],
        "band_sizes": r["band_sizes"],
        "min_band_size": r["min_band_size"],
        "monotonic": r["monotonic_increasing"],
        "prev_ratio_extreme": r["prevalence_ratio_extreme"],
        "eta_squared": r["eta_squared"],
        "band_prevalences": r["band_prevalences"],
    } for r in results.values()])
    comp.to_csv(OUT / "method_comparison.csv", index=False)

    # Selección: monótono + mayor eta^2, exigiendo bandas no triviales (>1% población)
    min_band_floor = 0.01 * len(y)
    valid = [r for r in results.values()
             if r["monotonic_increasing"] and r["min_band_size"] >= min_band_floor]
    pool = valid if valid else list(results.values())
    chosen = max(pool, key=lambda r: r["eta_squared"])
    chosen_name = chosen["method"]

    # Plots del método elegido
    plots.plot_risk_distribution(
        proba, chosen["thresholds"],
        f"Distribución de riesgo — método {chosen_name} (val)",
        OUT / "risk_distribution.png")
    plots.plot_band_prevalence(
        chosen["bands"], f"Prevalencia por banda — método {chosen_name} (val)",
        OUT / "band_prevalence_val.png")

    # eta^2 por método (capacidad de separación)
    plots.plot_bar_comparison(
        [r["method"] for r in results.values()],
        [r["eta_squared"] for r in results.values()],
        "Separación de grupos por método (η²)", "η² (varianza explicada)",
        OUT / "method_separation.png")

    out = {
        "model": pk["model"], "calibration": pk["variant"],
        "methods": results,
        "chosen_method": chosen_name,
        "chosen_thresholds": chosen["thresholds"],
        "selection_rule": "monótono en prevalencia + bandas >=1% población + máximo η²",
        "risk_levels": config.RISK_LEVELS,
        "risk_actions": config.RISK_ACTIONS,
    }
    with open(OUT / "stratification.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)

    print("\n=== Comparación de métodos ===")
    print(comp.to_string(index=False))
    print(f"\nMétodo elegido: {chosen_name} | umbrales {chosen['thresholds']}")
    print("Bandas (val):")
    for b in chosen["bands"]:
        print(f"  {b['band']:9s} n={b['n']:>7,} ({b['pct_population']:5.1f}%) "
              f"prev={b['observed_prevalence']:.3f}  rango={b['score_range']}")


if __name__ == "__main__":
    main()
