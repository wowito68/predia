"""FASE 1E — Explicabilidad del modelo de riesgo.

SHAP (factores de riesgo / protectores / interacciones), permutation importance
(model-agnóstica) y partial dependence. Responde qué impulsa el riesgo y qué
variables son protectoras. Se ejecuta sobre una muestra para acotar el coste.
"""
from __future__ import annotations

import json
import sys
import warnings
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import joblib
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from predia_brfss import config, explain, plots, codebook  # noqa: E402
from predia_brfss.models import MODEL_NAMES  # noqa: E402
from sklearn.inspection import PartialDependenceDisplay  # noqa: E402

warnings.simplefilter("ignore")
OUT = config.EXPLAIN_DIR
SHAP_N = 5000
PERM_N = 20000
TREE_PREF = ["lightgbm", "xgboost", "random_forest", "extra_trees"]


def main():
    split = joblib.load(config.DATASETS_DIR / "split_binary.joblib")
    X_val, y_val = split["X_val"], split["y_val"]
    sel = json.load(open(config.MODELS_RES_DIR / "selection.json"))
    best_name = sel["best_model"]
    model = joblib.load(config.MODELS_DIR / f"{best_name}.joblib")

    rs = np.random.RandomState(config.SEED)
    idx = rs.choice(len(X_val), min(SHAP_N, len(X_val)), replace=False)
    X_shap = X_val.iloc[idx]

    # ---- SHAP (modelo de riesgo; si no es explicable rápido, usa modelo árbol) ----
    shap_model_name = best_name
    try:
        sv, names, Xt = explain.shap_values(model, X_shap)
    except ValueError:
        alt = next((m for m in TREE_PREF if m in MODEL_NAMES), None)
        shap_model_name = alt
        alt_model = joblib.load(config.MODELS_DIR / f"{alt}.joblib")
        sv, names, Xt = explain.shap_values(alt_model, X_shap)
        print(f"[shap] {best_name} no soporta SHAP rápido -> uso {alt}")

    global_imp = explain.shap_global_importance(sv, names)
    # Dirección: signo de la correlación entre valor de feature y su SHAP
    direction = {}
    for j, nm in enumerate(names):
        col = Xt[:, j]
        if np.std(col) > 0 and np.std(sv[:, j]) > 0:
            r = float(np.corrcoef(col, sv[:, j])[0, 1])
        else:
            r = 0.0
        direction[nm] = "riesgo" if r > 0 else "protector"
    for g in global_imp:
        g["label"] = codebook.label(g["feature"])
        g["direction"] = direction.get(g["feature"], "n/d")
    pd.DataFrame(global_imp).to_csv(OUT / "shap_global_importance.csv", index=False)

    plots.plot_shap_bar(global_imp, f"Importancia global SHAP — {shap_model_name}",
                        OUT / "shap_bar.png")
    try:
        plots.plot_shap_beeswarm(sv, Xt, names,
                                 f"SHAP beeswarm — {shap_model_name}",
                                 OUT / "shap_beeswarm.png")
    except Exception as e:  # noqa: BLE001
        print(f"[shap] beeswarm omitido: {e}")

    # ---- Permutation importance (model-agnóstica, sobre el modelo de riesgo) ----
    pidx = rs.choice(len(X_val), min(PERM_N, len(X_val)), replace=False)
    perm = explain.permutation_imp(model, X_val.iloc[pidx], y_val.iloc[pidx], n_repeats=10)
    for p in perm:
        p["label"] = codebook.label(p["feature"])
    pd.DataFrame(perm).to_csv(OUT / "permutation_importance.csv", index=False)
    plots.plot_feature_importance(
        [p["label"] for p in perm], [p["importance_mean"] for p in perm],
        f"Permutation importance (ROC-AUC) — {best_name}", OUT / "permutation_importance.png")

    # ---- Partial dependence de los top features ----
    top_feats = [p["feature"] for p in perm[:6]]
    fig, ax = plt.subplots(2, 3, figsize=(13, 7))
    PartialDependenceDisplay.from_estimator(
        model, X_val.iloc[pidx], top_feats, ax=ax.ravel()[:len(top_feats)],
        grid_resolution=20)
    fig.suptitle(f"Partial Dependence — {best_name}")
    fig.tight_layout()
    fig.savefig(OUT / "partial_dependence.png", bbox_inches="tight")
    plt.close(fig)

    # ---- Interacción top-2 (PDP 2D) ----
    try:
        fig2, ax2 = plt.subplots(figsize=(5.5, 4.5))
        PartialDependenceDisplay.from_estimator(
            model, X_val.iloc[pidx], [(top_feats[0], top_feats[1])], ax=ax2)
        fig2.suptitle(f"Interacción {top_feats[0]} × {top_feats[1]}")
        fig2.savefig(OUT / "interaction_pdp.png", bbox_inches="tight")
        plt.close(fig2)
    except Exception as e:  # noqa: BLE001
        print(f"[pdp] interacción 2D omitida: {e}")

    summary = {
        "risk_model": best_name, "shap_model": shap_model_name,
        "top_drivers": global_imp[:10],
        "protective_factors": [g for g in global_imp if g["direction"] == "protector"][:8],
        "risk_factors": [g for g in global_imp if g["direction"] == "riesgo"][:8],
        "permutation_top": perm[:10],
    }
    with open(OUT / "explainability.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"=== Explicabilidad ({best_name}; SHAP via {shap_model_name}) ===")
    print("Top-10 SHAP:")
    for g in global_imp[:10]:
        print(f"  {g['label']:42s} |SHAP|={g['mean_abs_shap']:.4f}  [{g['direction']}]")


if __name__ == "__main__":
    main()
