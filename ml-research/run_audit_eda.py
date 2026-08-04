"""01-02: Auditoría del dataset + Análisis Exploratorio (EDA). Genera artefactos reales."""
from __future__ import annotations

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns

from predia_ml import config, data
from predia_ml.data import save_json

FIG = config.FIGURES_DIR / "eda"
FIG.mkdir(parents=True, exist_ok=True)


def main():
    df = data.load_raw()
    print(f"Dataset: {df.shape[0]:,} filas x {df.shape[1]} columnas")

    # ---- Auditoría ----
    audit = data.audit(df)
    save_json(audit, config.METRICS_DIR / "dataset_audit.json")
    print("Balance objetivo:", audit["target"]["balance_pct"],
          "| ratio:", audit["target"]["imbalance_ratio"])
    print("Nulos totales:", audit["total_nulls"], "| duplicados:", audit["n_duplicated_rows"])
    print("Top |corr| con objetivo:",
          dict(list(audit["abs_corr_with_target"].items())[:6]))

    num = [c for c in audit["numeric_cols"] if c != config.TARGET]

    # ---- Balance de clases ----
    fig, ax = plt.subplots(figsize=(4.5, 3.6))
    vc = df[config.TARGET].value_counts().sort_index()
    ax.bar(["No Diabetes (0)", "Diabetes (1)"], vc.values, color=["#15803D", "#DC2626"])
    for i, v in enumerate(vc.values):
        ax.text(i, v, f"{v:,}\n({100*v/len(df):.1f}%)", ha="center", va="bottom", fontsize=9)
    ax.set_title("Balance de clases — diagnosed_diabetes")
    ax.set_ylim(0, vc.max() * 1.15)
    fig.savefig(FIG / "class_balance.png", bbox_inches="tight"); plt.close(fig)

    # ---- Histogramas de numéricas clave ----
    key = [c for c in ["age", "bmi", "hba1c", "glucose_fasting", "glucose_postprandial",
                       "insulin_level", "cholesterol_total", "triglycerides", "systolic_bp"]
           if c in df.columns]
    fig, axes = plt.subplots(3, 3, figsize=(12, 9))
    for ax, c in zip(axes.ravel(), key):
        ax.hist(df[c].dropna(), bins=40, color="#1E88E5")
        ax.set_title(c, fontsize=9)
    fig.suptitle("Distribuciones de variables numéricas clave")
    fig.savefig(FIG / "histograms.png", bbox_inches="tight"); plt.close(fig)

    # ---- Boxplots por clase (separabilidad / fuga) ----
    diag = [c for c in ["hba1c", "glucose_fasting", "glucose_postprandial", "insulin_level"] if c in df.columns]
    fig, axes = plt.subplots(1, len(diag), figsize=(4 * len(diag), 4))
    for ax, c in zip(np.atleast_1d(axes), diag):
        sns.boxplot(data=df, x=config.TARGET, y=c, ax=ax, palette=["#15803D", "#DC2626"])
        ax.set_title(c, fontsize=10); ax.set_xlabel("diagnosed_diabetes")
    fig.suptitle("Laboratorios diagnósticos por clase (candidatos a fuga)")
    fig.savefig(FIG / "diagnostic_by_class.png", bbox_inches="tight"); plt.close(fig)

    # ---- Heatmap de correlaciones ----
    corr = df[num + [config.TARGET]].corr()
    fig, ax = plt.subplots(figsize=(13, 11))
    sns.heatmap(corr, cmap="coolwarm", center=0, ax=ax, square=False,
                cbar_kws={"shrink": 0.6}, annot=False)
    ax.set_title("Matriz de correlación (Pearson)")
    fig.savefig(FIG / "correlation_heatmap.png", bbox_inches="tight"); plt.close(fig)

    # ---- |Correlación| con el objetivo (señal de fuga) ----
    cwt = audit["abs_corr_with_target"]
    items = list(cwt.items())[:15]
    fig, ax = plt.subplots(figsize=(7, 5))
    names = [k for k, _ in items][::-1]
    vals = [abs(v) for _, v in items][::-1]
    colors = ["#DC2626" if n in (config.DIAGNOSTIC_LABS + config.LEAKY_COLS) else "#1565C0" for n in names]
    ax.barh(names, vals, color=colors)
    ax.set_xlabel("|correlación de Pearson| con diagnosed_diabetes")
    ax.set_title("Correlación con el objetivo (rojo = fuga/diagnóstico)")
    fig.savefig(FIG / "leakage_correlation.png", bbox_inches="tight"); plt.close(fig)

    print(f"Figuras EDA guardadas en {FIG}")


if __name__ == "__main__":
    main()
