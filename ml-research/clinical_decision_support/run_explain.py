"""FASE 3C — Modelo explicable de deterioro + SHAP (entrena y persiste atribuciones)."""
from __future__ import annotations

import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_cdss import config, explain, plots  # noqa: E402


def main():
    snap = pd.read_csv(config.DATASETS_DIR / "snapshots.csv")
    model, X, y = explain.train_risk_model(snap)
    joblib.dump({"model": model, "features": explain.MODEL_FEATURES},
                config.MODELS_DIR / "risk_model.joblib")

    sv = explain.shap_matrix(model, X)
    np.save(config.DATASETS_DIR / "shap_values.npy", sv)
    snap[["patient_id"]].to_csv(config.DATASETS_DIR / "shap_index.csv", index=False)

    mean_abs = np.abs(sv).mean(axis=0)
    glob = pd.DataFrame({"feature": explain.MODEL_FEATURES,
                         "label": [explain.FEATURE_LABELS[f] for f in explain.MODEL_FEATURES],
                         "mean_abs_shap": np.round(mean_abs, 4)}).sort_values(
        "mean_abs_shap", ascending=False)
    glob.to_csv(config.METRICS_DIR / "shap_global.csv", index=False)
    plots.plot_shap_global(mean_abs, [explain.FEATURE_LABELS[f] for f in explain.MODEL_FEATURES],
                           config.fig_dir("explain") / "shap_global.png")

    print("=== Modelo explicable de deterioro (objetivo: CES<40) ===")
    print(f"Prevalencia deterioro: {y.mean():.1%} | AUC train aprox no reportada (uso explicativo)")
    print("\nFactores globales (media |SHAP|):")
    print(glob.to_string(index=False))


if __name__ == "__main__":
    main()
