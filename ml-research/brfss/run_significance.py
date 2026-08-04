"""Evaluación estadística adicional (NO reentrena): intervalos de confianza bootstrap
del ROC-AUC en TEST para los 9 modelos y test de DeLong para diferencias de AUC.
Genera results/models/significance.json y significance_table.csv."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.metrics import roc_auc_score

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_brfss import config, evaluate  # noqa: E402
from predia_brfss.models import MODEL_NAMES  # noqa: E402

RNG = np.random.default_rng(config.SEED)
N_BOOT = 1000


# ---------- Fast DeLong (Sun & Xu, 2014) ----------
def _compute_midrank(x):
    J = np.argsort(x)
    Z = x[J]
    N = len(x)
    T = np.zeros(N, dtype=float)
    i = 0
    while i < N:
        j = i
        while j < N and Z[j] == Z[i]:
            j += 1
        T[i:j] = 0.5 * (i + j - 1) + 1
        i = j
    T2 = np.empty(N, dtype=float)
    T2[J] = T
    return T2


def _fastdelong(preds_sorted, m):
    n = preds_sorted.shape[1] - m
    k = preds_sorted.shape[0]
    tx = np.empty([k, m]); ty = np.empty([k, n]); tz = np.empty([k, m + n])
    for r in range(k):
        tx[r] = _compute_midrank(preds_sorted[r, :m])
        ty[r] = _compute_midrank(preds_sorted[r, m:])
        tz[r] = _compute_midrank(preds_sorted[r])
    aucs = tx.sum(axis=1) / m / n - (m + 1.0) / 2.0 / n
    v01 = (tz[:, :m] - tx) / n
    v10 = 1.0 - (tz[:, m:] - ty) / m
    sx = np.cov(v01); sy = np.cov(v10)
    delongcov = sx / m + sy / n
    return aucs, delongcov


def delong_test(y_true, p1, p2):
    """p-valor de la diferencia de AUC (dos modelos, mismo y_true)."""
    order = (-y_true).argsort()
    label_1 = y_true[order]
    m = int(label_1.sum())
    preds = np.vstack((p1, p2))[:, order]
    aucs, cov = _fastdelong(preds, m)
    l = np.array([[1, -1]])
    var = l @ cov @ l.T
    z = (aucs[0] - aucs[1]) / np.sqrt(var[0, 0] + 1e-12)
    p = 2 * (1 - stats.norm.cdf(abs(z)))
    return float(aucs[0]), float(aucs[1]), float(z), float(p)


def main():
    sp = joblib.load(config.DATASETS_DIR / "split_binary.joblib")
    X_test, y_test = sp["X_test"], sp["y_test"].to_numpy().astype(int)

    probs, rows = {}, []
    for name in MODEL_NAMES:
        est = joblib.load(config.MODELS_DIR / f"{name}.joblib")
        p = est.predict_proba(X_test)[:, 1]
        probs[name] = p
        auc = roc_auc_score(y_test, p)
        # bootstrap CI
        boot = np.empty(N_BOOT)
        n = len(y_test)
        for b in range(N_BOOT):
            idx = RNG.integers(0, n, n)
            if y_test[idx].sum() == 0 or y_test[idx].sum() == len(idx):
                boot[b] = np.nan
                continue
            boot[b] = roc_auc_score(y_test[idx], p[idx])
        lo, hi = np.nanpercentile(boot, [2.5, 97.5])
        m = evaluate.compute_metrics(y_test, (p >= 0.5).astype(int), p)
        rows.append({"model": name, "test_roc_auc": round(float(auc), 4),
                     "auc_ci_low": round(float(lo), 4), "auc_ci_high": round(float(hi), 4),
                     "test_pr_auc": round(m["pr_auc"], 4), "test_mcc": round(m["mcc"], 4),
                     "test_brier": round(m["brier"], 4)})
        print(f"{name:24s} AUC={auc:.4f} [{lo:.4f},{hi:.4f}]")

    tab = pd.DataFrame(rows).sort_values("test_roc_auc", ascending=False).reset_index(drop=True)
    tab.to_csv(config.MODELS_RES_DIR / "significance_table.csv", index=False)

    # DeLong: mejor modelo vs LR y vs cada top
    best = tab.iloc[0]["model"]
    comparisons = {}
    for other in ["logistic_regression", "hist_gradient_boosting", "lightgbm",
                  "random_forest", "knn"]:
        if other == best:
            continue
        a1, a2, z, p = delong_test(y_test, probs[best], probs[other])
        # bootstrap del ΔAUC (emparejado)
        n = len(y_test)
        d = np.empty(N_BOOT)
        for b in range(N_BOOT):
            idx = RNG.integers(0, n, n)
            if y_test[idx].sum() in (0, len(idx)):
                d[b] = np.nan; continue
            d[b] = roc_auc_score(y_test[idx], probs[best][idx]) - roc_auc_score(y_test[idx], probs[other][idx])
        dlo, dhi = np.nanpercentile(d, [2.5, 97.5])
        comparisons[f"{best}_vs_{other}"] = {
            "auc_best": round(a1, 4), "auc_other": round(a2, 4),
            "delta_auc": round(a1 - a2, 4),
            "delta_ci": [round(float(dlo), 4), round(float(dhi), 4)],
            "delong_z": round(z, 3), "delong_p": round(p, 5)}
        print(f"DeLong {best} vs {other}: ΔAUC={a1-a2:.4f} "
              f"CI[{dlo:.4f},{dhi:.4f}] p={p:.4g}")

    out = {"n_test": int(len(y_test)), "n_boot": N_BOOT,
           "prevalence_test": round(float(y_test.mean()), 4),
           "pr_auc_baseline": round(float(y_test.mean()), 4),
           "per_model": rows, "delong": comparisons}
    with open(config.MODELS_RES_DIR / "significance.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print("\nGuardado significance.json + significance_table.csv")
    print("PR-AUC baseline (=prevalencia test):", out["pr_auc_baseline"])


if __name__ == "__main__":
    main()
