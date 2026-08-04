"""03-11: Preprocesamiento + entrenamiento del zoo de modelos + comparación.

Marco honesto = 'screening' (sin laboratorios diagnósticos).
Marco 'clinical' (con labs) se entrena para 3 modelos y cuantificar el salto por fuga.
Genera: datasets/ (splits), models/*.joblib, metrics/*.json, figures/models/*.png.
"""
from __future__ import annotations

import json
import warnings

import joblib
import numpy as np
import pandas as pd

from predia_ml import config, data, evaluate, plots
from predia_ml.data import save_json
from predia_ml.models import MODEL_NAMES, train_one
from predia_ml.preprocess import make_xy, split

FIGM = config.FIGURES_DIR / "models"
FIGM.mkdir(parents=True, exist_ok=True)
warnings.simplefilter("ignore")


def _prep_split(df, mode):
    X, y = make_xy(df, mode)
    Xtr, Xte, ytr, yte = split(X, y)
    joblib.dump({"X_train": Xtr, "X_test": Xte, "y_train": ytr, "y_test": yte, "mode": mode},
                config.DATASETS_DIR / f"split_{mode}.joblib")
    return Xtr, Xte, ytr, yte


def _eval_and_plot(name, est, Xte, yte, mode, make_figs=True):
    y_pred = est.predict(Xte)
    y_proba = est.predict_proba(Xte)[:, 1]
    m = evaluate.compute_metrics(yte, y_pred, y_proba)
    if make_figs:
        tag = f"{mode}_{name}"
        plots.plot_confusion(yte, y_pred, f"Matriz de confusión — {name} ({mode})", FIGM / f"cm_{tag}.png")
        plots.plot_roc(yte, y_proba, f"ROC — {name} ({mode})", FIGM / f"roc_{tag}.png")
        plots.plot_pr(yte, y_proba, f"Precision-Recall — {name} ({mode})", FIGM / f"pr_{tag}.png")
        plots.plot_calibration(yte, y_proba, f"Calibración — {name} ({mode})", FIGM / f"cal_{tag}.png")
    return m, y_proba


def main():
    df = data.load_raw()

    # ===== SCREENING (marco honesto) =====
    Xtr, Xte, ytr, yte = _prep_split(df, "screening")
    print(f"[screening] train={len(Xtr):,} test={len(Xte):,} | features={Xtr.shape[1]}")

    rows, roc_curves, trained = [], {}, {}
    for name in MODEL_NAMES:
        print(f"  entrenando {name} ...", flush=True)
        res = train_one(name, Xtr, ytr, "screening")
        est = res["best_estimator"]
        m, y_proba = _eval_and_plot(name, est, Xte, yte, "screening")
        joblib.dump(est, config.MODELS_DIR / f"screening_{name}.joblib")
        record = {**res, "test_metrics": m}
        record.pop("best_estimator")
        save_json(record, config.METRICS_DIR / f"screening_{name}.json")
        row = evaluate.metrics_table_row(name, m)
        row["cv_roc_auc"] = round(res["cv_roc_auc"], 4)
        row["fit_time_sec"] = res["fit_time_sec"]
        row["subsampled"] = res["subsampled"]
        rows.append(row)
        roc_curves[name] = (yte.values, y_proba)
        trained[name] = est
        print(f"    -> acc={m['accuracy']:.4f} auc={m['roc_auc']:.4f} recall={m['recall_sensitivity']:.4f} f1={m['f1']:.4f}")

    comp = pd.DataFrame(rows).sort_values("roc_auc", ascending=False).reset_index(drop=True)
    comp.to_csv(config.METRICS_DIR / "comparison_screening.csv", index=False)
    save_json(json.loads(comp.to_json(orient="records")), config.METRICS_DIR / "comparison_screening.json")

    plots.plot_roc_multi(roc_curves, "ROC comparativa — modelos (screening)", config.FIGURES_DIR / "comparison_roc.png")
    plots.plot_bar_comparison(comp["model"].tolist(), comp["roc_auc"].tolist(),
                              "ROC AUC por modelo (screening)", "ROC AUC", config.FIGURES_DIR / "comparison_auc.png")
    plots.plot_bar_comparison(comp["model"].tolist(), comp["recall_sensitivity"].tolist(),
                              "Sensibilidad (recall) por modelo (screening)", "Recall", config.FIGURES_DIR / "comparison_recall.png")

    print("\n== RANKING (screening) por ROC AUC ==")
    print(comp[["model", "accuracy", "roc_auc", "recall_sensitivity", "specificity", "f1", "mcc"]].to_string(index=False))

    # ===== CLINICAL (con labs diagnósticos) — cuantificar fuga =====
    Xtr_c, Xte_c, ytr_c, yte_c = _prep_split(df, "clinical")
    clinical_rows = []
    for name in ["logistic_regression", "random_forest", "xgboost"]:
        res = train_one(name, Xtr_c, ytr_c, "clinical")
        m, _ = _eval_and_plot(name, res["best_estimator"], Xte_c, yte_c, "clinical", make_figs=False)
        joblib.dump(res["best_estimator"], config.MODELS_DIR / f"clinical_{name}.joblib")
        clinical_rows.append({**evaluate.metrics_table_row(name, m), "cv_roc_auc": round(res["cv_roc_auc"], 4)})
    save_json(clinical_rows, config.METRICS_DIR / "comparison_clinical.json")
    print("\n== CLINICAL (con labs) — salto por incluir variables diagnósticas ==")
    print(pd.DataFrame(clinical_rows)[["model", "accuracy", "roc_auc", "recall_sensitivity"]].to_string(index=False))


if __name__ == "__main__":
    main()
