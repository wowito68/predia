"""FASE 1B — Entrenamiento y comparación de 9 modelos sobre BRFSS binary.

Split estratificado 60/20/20. Tuning con RandomizedSearchCV (roc_auc) en *train*;
evaluación en *val*. Persiste modelos, splits, tabla comparativa (ROC-AUC, PR-AUC,
MCC, F1, precision, recall, especificidad, Brier) y curvas (ROC/PR/calibración/
confusión) en results/models/. El conjunto *test* queda reservado para la validación
clínica final (Fase 1F).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from predia_brfss import config, data, preprocess, evaluate, plots  # noqa: E402
from predia_brfss.models import train_one, MODEL_NAMES  # noqa: E402

OUT = config.MODELS_RES_DIR


def main():
    df = data.load_binary()
    X, y = preprocess.make_xy(df)
    X_train, X_val, X_test, y_train, y_val, y_test = preprocess.split_train_val_test(X, y)

    split = {"X_train": X_train, "X_val": X_val, "X_test": X_test,
             "y_train": y_train, "y_val": y_val, "y_test": y_test}
    joblib.dump(split, config.DATASETS_DIR / "split_binary.joblib")
    print(f"Split -> train {len(X_train):,} | val {len(X_val):,} | test {len(X_test):,}")

    rows, val_curves = [], {}
    for name in MODEL_NAMES:
        print(f"[train] {name} ...", flush=True)
        res = train_one(name, X_train, y_train)
        est = res["best_estimator"]
        joblib.dump(est, config.MODELS_DIR / f"{name}.joblib")

        proba = est.predict_proba(X_val)[:, 1]
        pred = (proba >= 0.5).astype(int)
        m = evaluate.compute_metrics(y_val, pred, proba)
        m.update({"cv_roc_auc": res["cv_roc_auc"], "fit_time_sec": res["fit_time_sec"],
                  "subsampled": res["subsampled"]})
        row = evaluate.metrics_table_row(name, m)
        row.update({"cv_roc_auc": round(res["cv_roc_auc"], 4),
                    "fit_time_sec": res["fit_time_sec"]})
        rows.append(row)
        val_curves[name] = (y_val.to_numpy(), proba)

        plots.plot_roc(y_val, proba, f"ROC — {name} (val)", OUT / f"roc_{name}.png")
        plots.plot_pr(y_val, proba, f"PR — {name} (val)", OUT / f"pr_{name}.png")
        plots.plot_calibration(y_val, proba, f"Calibración — {name} (val)",
                               OUT / f"calib_{name}.png")
        plots.plot_confusion(y_val, pred, f"Matriz — {name} (val, t=0.5)",
                             OUT / f"cm_{name}.png")
        print(f"   roc_auc(val)={m['roc_auc']:.4f} pr_auc={m['pr_auc']:.4f} "
              f"brier={m['brier']:.4f} recall={m['recall_sensitivity']:.3f} "
              f"({res['fit_time_sec']}s)", flush=True)

    comp = pd.DataFrame(rows).sort_values("roc_auc", ascending=False).reset_index(drop=True)
    comp.to_csv(OUT / "comparison.csv", index=False)
    comp.to_json(OUT / "comparison.json", orient="records", indent=2)

    plots.plot_roc_multi(val_curves, "ROC — todos los modelos (val)", OUT / "roc_all.png")
    plots.plot_bar_comparison(comp["model"].tolist(), comp["roc_auc"].tolist(),
                              "Comparación ROC-AUC (val)", "ROC-AUC", OUT / "roc_auc_bar.png")

    best = comp.iloc[0]["model"]
    selection = {
        "best_model": best,
        "best_roc_auc_val": float(comp.iloc[0]["roc_auc"]),
        "ranking": comp[["model", "roc_auc", "pr_auc", "brier"]].to_dict(orient="records"),
        "note": "Selección por ROC-AUC en val. Modelo lineal interpretable de "
                "referencia: logistic_regression.",
    }
    with open(OUT / "selection.json", "w", encoding="utf-8") as f:
        json.dump(selection, f, indent=2, ensure_ascii=False)

    print("\n=== COMPARACIÓN (ordenada por ROC-AUC val) ===")
    print(comp.to_string(index=False))
    print(f"\nMejor modelo: {best}")


if __name__ == "__main__":
    main()
