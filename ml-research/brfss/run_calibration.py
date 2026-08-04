"""FASE 1C — Calibración de probabilidades del modelo seleccionado.

Compara el modelo ORIGINAL vs Platt (sigmoide) vs Isotónica. La calibración se
ajusta en *val* (cv='prefit', sin reentrenar el modelo base) y la fiabilidad se
mide en *val* y en *test* (Brier y ECE). Persiste el mejor calibrador y los vectores
de probabilidad para las fases de riesgo y validación clínica.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from predia_brfss import config, calibration, plots  # noqa: E402

OUT = config.CALIB_DIR


def main():
    split = joblib.load(config.DATASETS_DIR / "split_binary.joblib")
    X_val, y_val = split["X_val"], split["y_val"].to_numpy()
    X_test, y_test = split["X_test"], split["y_test"].to_numpy()

    sel = json.load(open(config.MODELS_RES_DIR / "selection.json"))
    best_name = sel["best_model"]
    model = joblib.load(config.MODELS_DIR / f"{best_name}.joblib")
    print(f"Calibrando modelo seleccionado: {best_name}")

    raw_val = model.predict_proba(X_val)[:, 1]
    raw_test = model.predict_proba(X_test)[:, 1]

    platt = calibration.calibrate(model, X_val, y_val, "sigmoid")
    iso = calibration.calibrate(model, X_val, y_val, "isotonic")

    variants = {
        "original": (raw_val, raw_test),
        "platt": (platt.predict_proba(X_val)[:, 1], platt.predict_proba(X_test)[:, 1]),
        "isotonic": (iso.predict_proba(X_val)[:, 1], iso.predict_proba(X_test)[:, 1]),
    }

    rows, test_curves = [], {}
    for label, (pv, pt) in variants.items():
        rv = calibration.reliability(y_val, pv)
        rt = calibration.reliability(y_test, pt)
        rows.append({"variant": label,
                     "brier_val": round(rv["brier"], 5), "ece_val": round(rv["ece"], 5),
                     "brier_test": round(rt["brier"], 5), "ece_test": round(rt["ece"], 5)})
        frac_pos, mean_pred = calibration_curve(y_test, pt, n_bins=10, strategy="quantile")
        test_curves[label] = (mean_pred, frac_pos)

    tab = pd.DataFrame(rows)
    tab.to_csv(OUT / "reliability.csv", index=False)

    plots.plot_calibration_compare(
        test_curves, f"Calibración: original vs Platt vs isotónica — {best_name} (test)",
        OUT / "calibration_comparison.png")

    # Elegir mejor por ECE en test (la calibración no debe degradar el ranking/ROC)
    best_variant = min(rows, key=lambda r: r["ece_test"])["variant"]
    calibrator = {"original": model, "platt": platt, "isotonic": iso}[best_variant]
    joblib.dump({"name": best_name, "variant": best_variant, "estimator": calibrator},
                config.MODELS_DIR / "calibrated_best.joblib")

    proba_val = variants[best_variant][0]
    proba_test = variants[best_variant][1]
    joblib.dump(
        {"model": best_name, "variant": best_variant,
         "proba_val": proba_val, "y_val": y_val,
         "proba_test": proba_test, "y_test": y_test,
         "proba_val_raw": raw_val, "proba_test_raw": raw_test},
        config.DATASETS_DIR / "proba_calibrated.joblib")

    summary = {"best_model": best_name, "chosen_calibration": best_variant,
               "reliability": rows}
    with open(OUT / "summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print("\n=== Fiabilidad (Brier / ECE) ===")
    print(tab.to_string(index=False))
    print(f"\nCalibración elegida: {best_variant} (menor ECE en test)")


if __name__ == "__main__":
    main()
