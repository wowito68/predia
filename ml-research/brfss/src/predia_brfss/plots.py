"""Visualizaciones. Reutiliza los plots genéricos de `predia_ml.plots`
(ROC/PR/calibración/confusión/importancia/comparación) y añade los específicos
del framework de riesgo (distribución de bandas, forest plot, SHAP)."""
from __future__ import annotations

import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from . import config

_PREDIA_ML_SRC = str(config.ML_DIR / "src")
if _PREDIA_ML_SRC not in sys.path:
    sys.path.insert(0, _PREDIA_ML_SRC)
# Reexporta los plots genéricos ya existentes
from predia_ml.plots import (  # noqa: E402,F401
    plot_confusion, plot_roc, plot_pr, plot_calibration, plot_roc_multi,
    plot_feature_importance, plot_bar_comparison,
)

plt.rcParams.update({"figure.dpi": 110, "savefig.bbox": "tight", "font.size": 10})


def _save(fig, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path)
    plt.close(fig)


def plot_calibration_compare(curves: dict, title: str, path: Path):
    """curves: {label: (mean_pred, frac_pos)} ya binned. Compara original vs calibrados."""
    fig, ax = plt.subplots(figsize=(5.2, 4.6))
    for label, (mean_pred, frac_pos) in curves.items():
        ax.plot(mean_pred, frac_pos, "o-", label=label, markersize=4)
    ax.plot([0, 1], [0, 1], "--", color="gray", lw=1, label="Perfecta")
    ax.set_xlabel("Probabilidad predicha media")
    ax.set_ylabel("Fracción observada de positivos")
    ax.set_title(title)
    ax.legend(loc="upper left", fontsize=8)
    _save(fig, path)


def plot_risk_distribution(proba, thresholds, title: str, path: Path):
    """Histograma del score con las bandas de riesgo coloreadas."""
    fig, ax = plt.subplots(figsize=(7.0, 4.0))
    ax.hist(proba, bins=60, color="#90A4AE", edgecolor="white")
    bounds = [0] + list(thresholds) + [max(proba)]
    for i, name in enumerate(config.RISK_LEVELS):
        ax.axvspan(bounds[i], bounds[i + 1], alpha=0.18,
                   color=config.RISK_COLORS[name], label=name)
    for t in thresholds:
        ax.axvline(t, color="black", lw=1, ls="--")
    ax.set_xlabel("Probabilidad de diabetes (calibrada)")
    ax.set_ylabel("Nº de pacientes")
    ax.set_title(title)
    ax.legend(fontsize=8)
    _save(fig, path)


def plot_band_prevalence(bands_table, title: str, path: Path):
    """Barras de prevalencia observada por banda (validez clínica)."""
    names = [r["band"] for r in bands_table]
    prevs = [r["observed_prevalence"] or 0 for r in bands_table]
    colors = [config.RISK_COLORS[n] for n in names]
    fig, ax = plt.subplots(figsize=(6.0, 4.0))
    bars = ax.bar(names, prevs, color=colors)
    for b, v in zip(bars, prevs):
        ax.text(b.get_x() + b.get_width() / 2, v + 0.005, f"{v:.1%}", ha="center", fontsize=9)
    ax.set_ylabel("Prevalencia observada de diabetes")
    ax.set_title(title)
    _save(fig, path)


def plot_forest(rows, value_key, ci_key, title: str, path: Path, ref_line=1.0):
    """Forest plot de OR o RR por banda con IC95%."""
    labels = [r["band"] for r in rows]
    vals = [r[value_key] for r in rows]
    cis = [r[ci_key] for r in rows]
    y = np.arange(len(labels))[::-1]
    fig, ax = plt.subplots(figsize=(6.2, 3.8))
    for yi, v, ci, lab in zip(y, vals, cis, labels):
        ax.plot([ci[0], ci[1]], [yi, yi], color="#455A64", lw=1.5)
        ax.plot(v, yi, "o", color=config.RISK_COLORS[lab], markersize=8)
    ax.axvline(ref_line, color="gray", ls="--", lw=1)
    ax.set_yticks(y)
    ax.set_yticklabels(labels)
    ax.set_xscale("log")
    ax.set_xlabel(value_key.upper())
    ax.set_title(title)
    _save(fig, path)


def plot_shap_bar(global_imp, title: str, path: Path, top: int = 20):
    items = global_imp[:top][::-1]
    names = [i["feature"] for i in items]
    vals = [i["mean_abs_shap"] for i in items]
    fig, ax = plt.subplots(figsize=(6.4, max(3.5, 0.32 * len(names))))
    ax.barh(range(len(names)), vals, color="#6A1B9A")
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(names, fontsize=8)
    ax.set_xlabel("Media |valor SHAP|")
    ax.set_title(title)
    _save(fig, path)


def plot_shap_beeswarm(sv, Xt, names, title: str, path: Path, max_display: int = 15):
    import shap
    fig = plt.figure(figsize=(7.0, 5.0))
    shap.summary_plot(sv, Xt, feature_names=names, max_display=max_display, show=False)
    plt.title(title)
    fig = plt.gcf()
    _save(fig, path)
