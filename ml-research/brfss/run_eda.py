"""FASE 1A — Análisis exploratorio y epidemiológico del BRFSS 2015.

Genera en results/eda/: auditorías (json), distribución de clases, correlaciones,
outliers, importancia preliminar, asociaciones epidemiológicas (OR/RR) por dominio,
gradientes de prevalencia por variables ordinales y exploración del dataset 012.
"""
from __future__ import annotations

import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from predia_brfss import config, data, codebook  # noqa: E402
from sklearn.ensemble import RandomForestClassifier  # noqa: E402
from sklearn.feature_selection import mutual_info_classif  # noqa: E402

OUT = config.EDA_DIR


def fig_class_distribution(df):
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.8))
    vc = df[config.TARGET].value_counts().sort_index()
    axes[0].bar(["No diabetes", "Diabetes"], vc.values, color=["#2E7D32", "#C62828"])
    for i, v in enumerate(vc.values):
        axes[0].text(i, v, f"{v:,}\n({v/len(df):.1%})", ha="center", va="bottom", fontsize=9)
    axes[0].set_title("Distribución de clases (binary completo)")
    axes[0].set_ylabel("Nº de encuestados")
    # 012
    d012 = data.load_012()
    vc3 = d012[config.TARGET_012].value_counts().sort_index()
    axes[1].bar(["No DM", "Prediabetes", "Diabetes"], vc3.values,
                color=["#2E7D32", "#F9A825", "#C62828"])
    for i, v in enumerate(vc3.values):
        axes[1].text(i, v, f"{v/len(d012):.1%}", ha="center", va="bottom", fontsize=9)
    axes[1].set_title("Gradiente natural de riesgo (dataset 012)")
    fig.tight_layout()
    fig.savefig(OUT / "class_distribution.png", bbox_inches="tight")
    plt.close(fig)


def fig_corr_with_target(audit):
    corr = audit["corr_with_target"]
    items = list(corr.items())
    names = [codebook.label(k) for k, _ in items]
    vals = [v for _, v in items]
    colors = ["#C62828" if v > 0 else "#1565C0" for v in vals]
    fig, ax = plt.subplots(figsize=(7, 7))
    order = np.argsort(np.abs(vals))
    ax.barh(np.array(names)[order], np.array(vals)[order], color=np.array(colors)[order])
    ax.set_xlabel("Correlación de Pearson con diabetes")
    ax.set_title("Correlación predictor–objetivo (rojo: riesgo, azul: protector)")
    fig.savefig(OUT / "correlation_with_target.png", bbox_inches="tight")
    plt.close(fig)


def fig_corr_heatmap(df):
    corr = df[config.FEATURES + [config.TARGET]].corr()
    fig, ax = plt.subplots(figsize=(11, 9))
    sns.heatmap(corr, cmap="coolwarm", center=0, annot=False, ax=ax,
                cbar_kws={"shrink": 0.6})
    ax.set_title("Matriz de correlación (21 predictores + objetivo)")
    fig.savefig(OUT / "correlation_heatmap.png", bbox_inches="tight")
    plt.close(fig)


def fig_prevalence_gradients(df):
    ordinals = ["Age", "GenHlth", "Income", "Education", "BMI"]
    fig, axes = plt.subplots(1, len(ordinals), figsize=(4 * len(ordinals), 3.6))
    for ax, col in zip(axes, ordinals):
        if col == "BMI":
            bins = pd.cut(df["BMI"], [0, 18.5, 25, 30, 35, 100],
                          labels=["<18.5", "18.5-25", "25-30", "30-35", "35+"])
            prev = df.groupby(bins, observed=True)[config.TARGET].mean()
            ax.bar(range(len(prev)), prev.values, color="#EF6C00")
            ax.set_xticks(range(len(prev)))
            ax.set_xticklabels(prev.index, rotation=45, fontsize=7)
        else:
            prev = df.groupby(col)[config.TARGET].mean()
            ax.plot(prev.index, prev.values, "o-", color="#EF6C00")
            ax.set_xticks(prev.index)
            ax.set_xticklabels([codebook.decode(col, v) for v in prev.index],
                               rotation=45, fontsize=7)
        ax.set_title(codebook.label(col), fontsize=9)
        ax.set_ylabel("Prevalencia")
    fig.suptitle("Gradientes de prevalencia de diabetes por variable ordinal")
    fig.tight_layout()
    fig.savefig(OUT / "prevalence_gradients.png", bbox_inches="tight")
    plt.close(fig)


def epidemiology_table(df):
    """OR/RR de cada variable binaria, agrupadas por dominio epidemiológico."""
    rows = []
    for domain, cols in config.FEATURE_GROUPS.items():
        for c in cols:
            if c in config.BINARY_COLS:
                a = data.association_for_binary(df, c)
                a["domain"] = domain
                a["label"] = codebook.label(c)
                rows.append(a)
    tab = pd.DataFrame(rows)[
        ["domain", "variable", "label", "prev_exposed", "prev_unexposed",
         "or_or", "or_ci95", "rr_rr", "rr_ci95"]
    ].sort_values("or_or", ascending=False)
    tab.to_csv(OUT / "epidemiology_associations.csv", index=False)
    return tab


def fig_epi_forest(tab):
    tab = tab.sort_values("or_or")
    fig, ax = plt.subplots(figsize=(7.5, 6.5))
    y = np.arange(len(tab))
    for yi, (_, r) in zip(y, tab.iterrows()):
        ci = r["or_ci95"]
        ax.plot([ci[0], ci[1]], [yi, yi], color="#455A64", lw=1.3)
        ax.plot(r["or_or"], yi, "o", color="#C62828", markersize=6)
    ax.axvline(1.0, color="gray", ls="--", lw=1)
    ax.set_yticks(y)
    ax.set_yticklabels(tab["label"], fontsize=8)
    ax.set_xscale("log")
    ax.set_xlabel("Odds Ratio (escala log) con IC95%")
    ax.set_title("Asociación de factores binarios con diabetes")
    fig.savefig(OUT / "epidemiology_forest.png", bbox_inches="tight")
    plt.close(fig)


def preliminary_importance(df):
    """Importancia preliminar: RandomForest rápido (subsample) + información mutua."""
    rs = np.random.RandomState(config.SEED)
    idx = rs.choice(len(df), 40000, replace=False)
    X = df.iloc[idx][config.FEATURES]
    y = df.iloc[idx][config.TARGET]
    rf = RandomForestClassifier(n_estimators=200, max_depth=16, n_jobs=-1,
                                random_state=config.SEED, class_weight="balanced")
    rf.fit(X, y)
    mi = mutual_info_classif(X, y, random_state=config.SEED)
    imp = pd.DataFrame({
        "feature": config.FEATURES,
        "label": [codebook.label(c) for c in config.FEATURES],
        "rf_importance": np.round(rf.feature_importances_, 5),
        "mutual_info": np.round(mi, 5),
    }).sort_values("rf_importance", ascending=False)
    imp.to_csv(OUT / "preliminary_importance.csv", index=False)

    fig, ax = plt.subplots(figsize=(7, 6))
    t = imp.sort_values("rf_importance")
    ax.barh(t["label"], t["rf_importance"], color="#1E88E5")
    ax.set_xlabel("Importancia (RandomForest, Gini)")
    ax.set_title("Importancia preliminar de predictores")
    fig.savefig(OUT / "preliminary_importance.png", bbox_inches="tight")
    plt.close(fig)
    return imp


def main():
    df = data.load_binary()
    df5050 = data.load_5050()
    d012 = data.load_012()

    # Auditorías
    data.save_json(data.audit(df), OUT / "audit_binary.json")
    data.save_json(data.audit(df5050), OUT / "audit_5050.json")
    data.save_json(data.audit(d012, target=config.TARGET_012), OUT / "audit_012.json")
    audit_bin = data.audit(df)

    # Figuras
    fig_class_distribution(df)
    fig_corr_with_target(audit_bin)
    fig_corr_heatmap(df)
    fig_prevalence_gradients(df)
    tab = epidemiology_table(df)
    fig_epi_forest(tab)
    imp = preliminary_importance(df)

    # Resumen de outliers (solo numéricas continuas/ordinales)
    pd.DataFrame(audit_bin["outliers"]).T.to_csv(OUT / "outliers_summary.csv")

    print("=== EDA completo ===")
    print(f"binary: {audit_bin['shape']} | prevalencia {df[config.TARGET].mean():.4f} "
          f"| duplicados {audit_bin['n_duplicated_rows']:,} ({audit_bin['pct_duplicated_rows']}%)")
    print(f"5050: {df5050.shape} | 012 prevalencias: "
          f"{d012[config.TARGET_012].value_counts(normalize=True).round(4).to_dict()}")
    print("\nTop-8 |correlación| con objetivo:")
    for k, v in list(audit_bin["corr_with_target"].items())[:8]:
        print(f"  {codebook.label(k):42s} r={v:+.3f}")
    print("\nTop-5 OR (factores de riesgo binarios):")
    for _, r in tab.head(5).iterrows():
        print(f"  {r['label']:42s} OR={r['or_or']:.2f} {r['or_ci95']}")
    print("\nArtefactos en", OUT)


if __name__ == "__main__":
    main()
