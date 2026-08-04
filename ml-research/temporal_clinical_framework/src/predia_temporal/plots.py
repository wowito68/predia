"""Visualización clínica y dashboards (Fase 2H). Backend headless (Agg)."""
from __future__ import annotations

from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from . import config
from . import timeseries as ts

plt.rcParams.update({"figure.dpi": 110, "savefig.bbox": "tight", "font.size": 9})

BAND_COLORS = {
    "Excelente evolución": "#2E7D32", "Estable": "#66BB6A",
    "Riesgo moderado": "#F9A825", "Riesgo alto": "#EF6C00", "Deterioro severo": "#C62828",
}
ARCH_COLORS = {
    "Mejora rápida": "#2E7D32", "Estable": "#66BB6A", "Deterioro lento": "#EF6C00",
    "Alto riesgo persistente": "#C62828", "Oscilante": "#6A1B9A",
}


def _save(fig, path: Path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path)
    plt.close(fig)


def _series(df_long, pid, key):
    s = df_long[(df_long.patient_id == pid) & (df_long.variable == key)].sort_values("t_days")
    return s["t_days"].to_numpy(), s["valor"].to_numpy()


def plot_patient_timeline(df_long, pid, path, title=None):
    panels = [("glucosa", "mg/dL"), ("imc", "kg/m²"), ("pas", "mmHg"), ("riesgo", "prob")]
    fig, axes = plt.subplots(2, 2, figsize=(11, 6))
    for ax, (key, unit) in zip(axes.ravel(), panels):
        t, x = _series(df_long, pid, key)
        ax.plot(t, x, "o-", ms=3, lw=1, color="#1565C0", alpha=0.8)
        if key == "pas":
            t2, x2 = _series(df_long, pid, "pad")
            ax.plot(t2, x2, "s-", ms=3, lw=1, color="#7B1FA2", alpha=0.7, label="PAD")
            ax.legend(fontsize=7)
        if len(x) >= 2:  # línea de tendencia
            lr = ts.linear_regression(t, x)
            ax.plot(t, lr["intercept"] + lr["slope"] * t, "--", color="#C62828", lw=1.2)
        ax.set_title(f"{key} ({unit})", fontsize=9)
        ax.set_xlabel("días")
    fig.suptitle(title or f"Timeline clínica — paciente {pid}")
    fig.tight_layout()
    _save(fig, path)


def plot_trend_distribution(trends_df, path):
    piv = (trends_df[trends_df.trend != "Sin datos"]
           .groupby(["variable", "trend"]).size().unstack(fill_value=0))
    order = [c for c in config.TREND_CLASSES if c in piv.columns]
    piv = piv[order]
    fig, ax = plt.subplots(figsize=(8, 4.2))
    piv.plot(kind="bar", stacked=True, ax=ax,
             color={"Mejorando": "#2E7D32", "Estable": "#66BB6A",
                    "Empeorando": "#C62828", "Oscilante": "#6A1B9A"})
    ax.set_ylabel("Nº de pacientes")
    ax.set_title("Distribución de tendencias por variable")
    ax.legend(fontsize=8)
    plt.xticks(rotation=30, ha="right")
    _save(fig, path)


def plot_ces_by_archetype(ces_df, meta_df, path):
    d = ces_df.merge(meta_df[["patient_id", "archetype"]], on="patient_id")
    order = config.ARCHETYPES
    fig, ax = plt.subplots(figsize=(8, 4.5))
    data = [d[d.archetype == a]["ces"].to_numpy() for a in order]
    bp = ax.boxplot(data, labels=order, patch_artist=True, showmeans=True)
    for patch, a in zip(bp["boxes"], order):
        patch.set_facecolor(ARCH_COLORS[a]); patch.set_alpha(0.6)
    for lo, lab in config.CES_BANDS:
        ax.axhline(lo, color="gray", ls=":", lw=0.7)
    ax.set_ylabel("CES (0-100)")
    ax.set_title("Clinical Evolution Score por arquetipo")
    plt.xticks(rotation=20, ha="right")
    _save(fig, path)


def plot_ces_gauge(ax, ces, band):
    ax.barh([0], [100], color="#ECEFF1", height=0.5)
    ax.barh([0], [ces], color=BAND_COLORS.get(band, "#1565C0"), height=0.5)
    ax.set_xlim(0, 100); ax.set_ylim(-1, 1); ax.set_yticks([])
    for lo, _ in config.CES_BANDS[1:]:
        ax.axvline(lo, color="white", lw=2)
    ax.text(ces, 0, f" {ces:.0f}", va="center", fontsize=12, fontweight="bold")
    ax.set_title(f"CES = {ces:.0f} · {band}", fontsize=10)


def plot_ces_timeline(timeline, path, title=None):
    if not timeline:
        return
    df = pd.DataFrame(timeline)
    fig, ax = plt.subplots(figsize=(8, 3.6))
    ax.plot(df.t_days, df.ces, "o-", color="#1565C0")
    for lo, lab in config.CES_BANDS:
        ax.axhspan(lo, lo + (20 if lo < 80 else 20), alpha=0.06,
                   color=BAND_COLORS.get(lab, "#999"))
    ax.set_ylim(0, 100); ax.set_xlabel("días"); ax.set_ylabel("CES")
    ax.set_title(title or "Evolución del CES (ventana móvil 120 d)")
    _save(fig, path)


def plot_events(df_long, pid, detected, injected, path):
    fig, ax = plt.subplots(figsize=(9, 3.8))
    t, x = _series(df_long, pid, "glucosa")
    ax.plot(t, x, "o-", ms=3, color="#1565C0", label="glucosa")
    for td in detected.get("cusum_glucosa", []):
        ax.axvline(td, color="#EF6C00", ls="--", lw=1, alpha=0.7)
    for ev in injected:
        if ev["variable"] == "glucosa":
            ax.axvline(ev["t_event"], color="#C62828", lw=2, alpha=0.8, label="evento real")
    ax.set_xlabel("días"); ax.set_ylabel("mg/dL")
    ax.set_title(f"Detección de eventos (glucosa) — paciente {pid}")
    h, l = ax.get_legend_handles_labels()
    if l:
        ax.legend(dict(zip(l, h)).values(), dict(zip(l, h)).keys(), fontsize=8)
    _save(fig, path)


def plot_clusters_pca(emb, labels, path, title="Clustering temporal (PCA 2D)"):
    fig, ax = plt.subplots(figsize=(6.5, 5))
    sc = ax.scatter(emb[:, 0], emb[:, 1], c=labels, cmap="tab10", s=18, alpha=0.8)
    ax.set_xlabel("PC1"); ax.set_ylabel("PC2"); ax.set_title(title)
    legend = ax.legend(*sc.legend_elements(), title="cluster", fontsize=8)
    ax.add_artist(legend)
    _save(fig, path)


def plot_forecast_rmse(results_by_target, path):
    fig, axes = plt.subplots(1, len(results_by_target), figsize=(4.2 * len(results_by_target), 4))
    if len(results_by_target) == 1:
        axes = [axes]
    for ax, (target, res) in zip(axes, results_by_target.items()):
        names = list(res.keys())
        rmse = [res[n]["rmse"] for n in names]
        colors = ["#C62828" if "baseline" in n.lower() or "Persist" in n else "#1565C0" for n in names]
        ax.barh(names, rmse, color=colors)
        ax.set_title(f"RMSE — {target}", fontsize=9)
        ax.invert_yaxis()
    fig.suptitle("Forecasting one-step: modelos vs baseline")
    fig.tight_layout()
    _save(fig, path)


def plot_indicator_importance(imp_df, path, top=15, title="Indicadores más útiles para anticipar deterioro"):
    d = imp_df.head(top).iloc[::-1]
    fig, ax = plt.subplots(figsize=(7, max(3.5, 0.32 * len(d))))
    ax.barh(d["feature"], d["importance"], color="#00695C")
    ax.set_xlabel("Importancia (RandomForest)")
    ax.set_title(title)
    _save(fig, path)


def plot_dashboard(df_long, pid, ces_res, timeline, trends_rows, detected, injected, meta_row, path):
    """Dashboard clínico integral por paciente (Fase 2H)."""
    fig = plt.figure(figsize=(13, 8))
    gs = fig.add_gridspec(3, 3, height_ratios=[1, 1, 0.9])

    panels = [("glucosa", "mg/dL"), ("imc", "kg/m²"), ("pas", "mmHg")]
    for j, (key, unit) in enumerate(panels):
        ax = fig.add_subplot(gs[0, j])
        t, x = _series(df_long, pid, key)
        ax.plot(t, x, "o-", ms=3, color="#1565C0")
        if len(x) >= 2:
            lr = ts.linear_regression(t, x)
            ax.plot(t, lr["intercept"] + lr["slope"] * t, "--", color="#C62828", lw=1)
        ax.set_title(f"{key} ({unit})", fontsize=9); ax.set_xlabel("días")

    ax_g = fig.add_subplot(gs[1, 0]); plot_ces_gauge(ax_g, ces_res["ces"], ces_res["band"])
    ax_t = fig.add_subplot(gs[1, 1:])
    if timeline:
        df = pd.DataFrame(timeline)
        ax_t.plot(df.t_days, df.ces, "o-", color="#2E7D32"); ax_t.set_ylim(0, 100)
        ax_t.set_title("Evolución del CES", fontsize=9); ax_t.set_xlabel("días")

    ax_tab = fig.add_subplot(gs[2, :]); ax_tab.axis("off")
    tr = pd.DataFrame(trends_rows)
    tr = tr[tr.variable.isin(["glucosa", "imc", "pas", "pad", "riesgo"])]
    cells = [[r.variable, f"{r.slope_m:+.2f}", f"{r.r2:.2f}", r.trend] for r in tr.itertuples()]
    n_alert = sum(len(v) for k, v in detected.items() if isinstance(v, list))
    tabla = ax_tab.table(cellText=cells, colLabels=["variable", "pendiente/mes", "R²", "tendencia"],
                         loc="center", cellLoc="center")
    tabla.scale(1, 1.3)
    fig.suptitle(f"Dashboard clínico — paciente {pid} · {meta_row['archetype']} · "
                 f"{n_alert} alertas · {len(injected)} eventos reales", fontsize=12)
    _save(fig, path)
