"""FASE 2: deriva umbrales de estratificación de riesgo clínico (4 niveles) a
partir de la curva ROC real del modelo de cribado seleccionado, con justificación
estadística (no umbrales arbitrarios).

Estrategia (puntos de operación clínicos sobre el conjunto de test):
  - t_bajo  = mayor probabilidad que aún conserva sensibilidad >= 0.90 (regla de
              EXCLUSIÓN: por debajo se pierden <10% de los diabéticos).
  - t_mid   = punto de Youden (max. sensibilidad+especificidad-1): mejor equilibrio.
  - t_alto  = menor probabilidad que alcanza especificidad >= 0.90 (regla de
              INCLUSIÓN: por encima, <10% de falsos positivos).
Bandas: Bajo [0,t_bajo) | Moderado [t_bajo,t_mid) | Alto [t_mid,t_alto) | Muy Alto [t_alto,1].
"""
from __future__ import annotations

import json
import warnings

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import roc_curve

from predia_ml import config

warnings.simplefilter("ignore")


def main():
    est = joblib.load(config.MODELS_DIR / "screening_logistic_regression.joblib")
    sp = joblib.load(config.DATASETS_DIR / "split_screening.joblib")
    X_test, y_test = sp["X_test"], sp["y_test"].to_numpy()
    proba = est.predict_proba(X_test)[:, 1]

    fpr, tpr, thr = roc_curve(y_test, proba)
    youden = tpr - fpr
    t_mid = float(thr[np.argmax(youden)])

    # sensibilidad >= 0.90 -> mayor umbral que la conserva (regla de exclusión)
    sens_mask = tpr >= 0.90
    t_bajo = float(thr[sens_mask].max())
    # especificidad >= 0.90 (fpr <= 0.10) -> menor umbral que la alcanza (regla de inclusión)
    spec_mask = fpr <= 0.10
    t_alto = float(thr[spec_mask].min())

    # Redondeo clínico a 2 decimales, garantizando orden estricto
    t_bajo, t_mid, t_alto = round(t_bajo, 2), round(t_mid, 2), round(t_alto, 2)
    if not (t_bajo < t_mid < t_alto):
        t_bajo, t_mid, t_alto = sorted({t_bajo, t_mid, t_alto}) if len({t_bajo, t_mid, t_alto}) == 3 else (0.35, 0.50, 0.65)

    bounds = [0.0, t_bajo, t_mid, t_alto, 1.01]
    names = ["Bajo", "Moderado", "Alto", "Muy Alto"]
    bands = []
    for i, name in enumerate(names):
        lo, hi = bounds[i], bounds[i + 1]
        m = (proba >= lo) & (proba < hi)
        n = int(m.sum())
        prev = float(y_test[m].mean()) if n else 0.0  # prevalencia observada (riesgo empírico)
        bands.append({
            "nivel": name, "rango": [round(lo, 2), round(min(hi, 1.0), 2)],
            "n": n, "pct_poblacion": round(100 * n / len(proba), 1),
            "prevalencia_observada": round(prev, 4),
        })

    # Métricas en cada punto de corte
    def sens_spec_at(t):
        pred = (proba >= t).astype(int)
        tp = int(((pred == 1) & (y_test == 1)).sum()); fn = int(((pred == 0) & (y_test == 1)).sum())
        tn = int(((pred == 0) & (y_test == 0)).sum()); fp = int(((pred == 1) & (y_test == 0)).sum())
        return {"threshold": t,
                "sensibilidad": round(tp / (tp + fn), 4),
                "especificidad": round(tn / (tn + fp), 4),
                "ppv": round(tp / (tp + fp), 4) if (tp + fp) else 0.0}

    out = {
        "model": "screening_logistic_regression",
        "thresholds": {"t_bajo": t_bajo, "t_mid": t_mid, "t_alto": t_alto},
        "operating_points": {
            "t_bajo (sens>=0.90, regla de exclusión)": sens_spec_at(t_bajo),
            "t_mid (Youden J)": sens_spec_at(t_mid),
            "t_alto (espec>=0.90, regla de inclusión)": sens_spec_at(t_alto),
        },
        "bands": bands,
        "proba_summary": {
            "min": round(float(proba.min()), 4), "max": round(float(proba.max()), 4),
            "mean": round(float(proba.mean()), 4), "median": round(float(np.median(proba)), 4),
        },
        "base_rate_test": round(float(y_test.mean()), 4),
    }
    (config.METRICS_DIR / "risk_thresholds.json").write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")

    # Figura: histograma de probabilidades con bandas + ROC con puntos de operación
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.2))
    colors = ["#64748B", "#D97706", "#EA580C", "#991B1B"]
    ax1.hist(proba, bins=40, color="#CBD5E1", edgecolor="white")
    for t, c in zip([t_bajo, t_mid, t_alto], colors[1:]):
        ax1.axvline(t, color=c, lw=2, label=f"corte = {t}")
    ax1.set_title("Distribución de probabilidad + cortes de riesgo")
    ax1.set_xlabel("P(diabetes)"); ax1.set_ylabel("frecuencia"); ax1.legend(fontsize=8)
    ax2.plot(fpr, tpr, color="#1565C0", label="ROC")
    ax2.plot([0, 1], [0, 1], "--", color="gray", lw=1)
    for t, name in [(t_bajo, "t_bajo"), (t_mid, "t_mid"), (t_alto, "t_alto")]:
        i = int(np.argmin(np.abs(thr - t)))
        ax2.scatter(fpr[i], tpr[i], s=40, zorder=5); ax2.annotate(name, (fpr[i], tpr[i]), fontsize=8)
    ax2.set_title("Puntos de operación sobre la ROC"); ax2.set_xlabel("1 - especificidad"); ax2.set_ylabel("sensibilidad")
    fig.tight_layout(); fig.savefig(config.FIGURES_DIR / "risk_thresholds.png", bbox_inches="tight"); plt.close(fig)

    print("Umbrales:", out["thresholds"])
    print("Base rate (test):", out["base_rate_test"])
    for b in bands:
        print(f"  {b['nivel']:9s} P{b['rango']}  n={b['n']:5d} ({b['pct_poblacion']:4.1f}%)  prevalencia={b['prevalencia_observada']:.3f}")
    for k, v in out["operating_points"].items():
        print(f"  {k}: sens={v['sensibilidad']} espec={v['especificidad']} ppv={v['ppv']}")


if __name__ == "__main__":
    main()
