"""12-14: Selección final + interpretabilidad (permutation importance + SHAP) + export.

Selecciona el mejor modelo del marco 'screening' (honesto) por ROC AUC, calcula
importancia por permutación y SHAP, y exporta el pipeline completo a exports/.
"""
from __future__ import annotations

import json
import pickle
import warnings
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance

from predia_ml import config, evaluate, plots
from predia_ml.data import save_json

warnings.simplefilter("ignore")
FIG = config.FIGURES_DIR / "interpretability"
FIG.mkdir(parents=True, exist_ok=True)


def main():
    comp = pd.read_json(config.METRICS_DIR / "comparison_screening.json")
    comp = comp.sort_values("roc_auc", ascending=False).reset_index(drop=True)
    best_name = comp.iloc[0]["model"]
    print(f"Mejor modelo (screening, por ROC AUC): {best_name}")

    est = joblib.load(config.MODELS_DIR / f"screening_{best_name}.joblib")
    sp = joblib.load(config.DATASETS_DIR / "split_screening.joblib")
    X_train, X_test, y_test = sp["X_train"], sp["X_test"], sp["y_test"]

    # ---- Permutation importance (sobre test, métrica ROC AUC) ----
    pi = permutation_importance(est, X_test, y_test, scoring="roc_auc",
                                n_repeats=8, random_state=config.SEED, n_jobs=-1)
    pi_df = (pd.DataFrame({"feature": X_test.columns,
                           "importance_mean": pi.importances_mean,
                           "importance_std": pi.importances_std})
             .sort_values("importance_mean", ascending=False).reset_index(drop=True))
    save_json(json.loads(pi_df.to_json(orient="records")), config.METRICS_DIR / "permutation_importance.json")
    plots.plot_feature_importance(pi_df["feature"].tolist(), pi_df["importance_mean"].tolist(),
                                  f"Permutation importance — {best_name} (screening)",
                                  FIG / "permutation_importance.png", top=20)
    print("Top 8 permutation importance:")
    print(pi_df.head(8).to_string(index=False))

    # ---- SHAP ----
    try:
        import shap
        prep = est.named_steps["prep"]
        clf = est.named_steps["clf"]
        feat_names = list(prep.get_feature_names_out())
        rng = np.random.RandomState(config.SEED)
        idx = rng.choice(len(X_test), min(800, len(X_test)), replace=False)
        Xt = prep.transform(X_test.iloc[idx])
        Xt = np.asarray(Xt.todense()) if hasattr(Xt, "todense") else np.asarray(Xt)

        try:
            explainer = shap.TreeExplainer(clf)
            sv = explainer.shap_values(Xt)
            sv = sv[1] if isinstance(sv, list) else sv
        except Exception:
            bg = shap.kmeans(Xt, 20)
            explainer = shap.KernelExplainer(lambda d: clf.predict_proba(d)[:, 1], bg)
            sv = explainer.shap_values(Xt, nsamples=100)

        import matplotlib.pyplot as plt
        shap.summary_plot(sv, Xt, feature_names=feat_names, show=False, max_display=18)
        plt.tight_layout(); plt.savefig(FIG / "shap_summary.png", bbox_inches="tight"); plt.close()
        mean_abs = np.abs(sv).mean(axis=0)
        shap_imp = sorted(zip(feat_names, mean_abs.tolist()), key=lambda kv: kv[1], reverse=True)
        save_json([{"feature": f, "mean_abs_shap": v} for f, v in shap_imp],
                  config.METRICS_DIR / "shap_importance.json")
        print("SHAP summary guardado. Top 5:", [f for f, _ in shap_imp[:5]])
    except Exception as e:  # noqa: BLE001
        print("SHAP no disponible:", e)

    # ---- Export del pipeline final ----
    y_pred = est.predict(X_test); y_proba = est.predict_proba(X_test)[:, 1]
    final_metrics = evaluate.compute_metrics(y_test, y_pred, y_proba)
    joblib.dump(est, config.EXPORTS_DIR / "predia_diabetes_model.joblib")
    with open(config.EXPORTS_DIR / "predia_diabetes_model.pkl", "wb") as f:
        pickle.dump(est, f)

    import sklearn
    card = {
        "model_name": best_name,
        "framing": "screening (sin laboratorios diagnósticos — honesto)",
        "features": config.feature_columns("screening"),
        "target": config.TARGET,
        "test_metrics": final_metrics,
        "selected_by": "ROC AUC (marco screening)",
        "sklearn_version": sklearn.__version__,
        "seed": config.SEED,
        "exported_at": datetime.now().isoformat(timespec="seconds"),
        "pipeline_steps": [s for s, _ in est.steps],
        "note": "El scaler/one-hot están DENTRO del Pipeline; recibe el dataframe crudo de features.",
    }
    save_json(card, config.EXPORTS_DIR / "model_card.json")
    print(f"\nExportado a {config.EXPORTS_DIR}: predia_diabetes_model.joblib/.pkl + model_card.json")
    print("Métricas finales:", {k: round(v, 4) for k, v in final_metrics.items() if isinstance(v, float)})


if __name__ == "__main__":
    main()
