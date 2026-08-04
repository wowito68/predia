"""Visualizaciones reutilizables. Backend headless (Agg) para ejecución por script."""
from __future__ import annotations

from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    ConfusionMatrixDisplay, auc, precision_recall_curve, roc_curve,
)

plt.rcParams.update({"figure.dpi": 110, "savefig.bbox": "tight", "font.size": 10})


def _save(fig, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path)
    plt.close(fig)


def plot_confusion(y_true, y_pred, title: str, path: Path):
    fig, ax = plt.subplots(figsize=(4.2, 3.8))
    ConfusionMatrixDisplay.from_predictions(
        y_true, y_pred, labels=[0, 1], display_labels=["No Diabetes", "Diabetes"],
        cmap="Blues", ax=ax, colorbar=False,
    )
    ax.set_title(title)
    _save(fig, path)


def plot_roc(y_true, y_proba, title: str, path: Path):
    fpr, tpr, _ = roc_curve(y_true, y_proba)
    a = auc(fpr, tpr)
    fig, ax = plt.subplots(figsize=(4.6, 4.0))
    ax.plot(fpr, tpr, label=f"AUC = {a:.4f}", color="#1565C0")
    ax.plot([0, 1], [0, 1], "--", color="gray", lw=1)
    ax.set_xlabel("Tasa de falsos positivos (1 - especificidad)")
    ax.set_ylabel("Sensibilidad (recall)")
    ax.set_title(title)
    ax.legend(loc="lower right")
    _save(fig, path)


def plot_pr(y_true, y_proba, title: str, path: Path):
    prec, rec, _ = precision_recall_curve(y_true, y_proba)
    a = auc(rec, prec)
    fig, ax = plt.subplots(figsize=(4.6, 4.0))
    ax.plot(rec, prec, label=f"AP(area) = {a:.4f}", color="#15803D")
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_title(title)
    ax.legend(loc="lower left")
    _save(fig, path)


def plot_calibration(y_true, y_proba, title: str, path: Path):
    frac_pos, mean_pred = calibration_curve(y_true, y_proba, n_bins=10, strategy="quantile")
    fig, ax = plt.subplots(figsize=(4.6, 4.0))
    ax.plot(mean_pred, frac_pos, "o-", color="#D97706", label="Modelo")
    ax.plot([0, 1], [0, 1], "--", color="gray", lw=1, label="Perfecta")
    ax.set_xlabel("Probabilidad predicha media")
    ax.set_ylabel("Fracción de positivos")
    ax.set_title(title)
    ax.legend(loc="upper left")
    _save(fig, path)


def plot_roc_multi(curves: dict, title: str, path: Path):
    """curves: {nombre: (y_true, y_proba)}."""
    fig, ax = plt.subplots(figsize=(5.6, 4.8))
    for name, (y_true, y_proba) in curves.items():
        fpr, tpr, _ = roc_curve(y_true, y_proba)
        ax.plot(fpr, tpr, label=f"{name} (AUC={auc(fpr, tpr):.3f})")
    ax.plot([0, 1], [0, 1], "--", color="gray", lw=1)
    ax.set_xlabel("Tasa de falsos positivos")
    ax.set_ylabel("Sensibilidad")
    ax.set_title(title)
    ax.legend(loc="lower right", fontsize=8)
    _save(fig, path)


def plot_feature_importance(names, importances, title: str, path: Path, top: int = 20):
    order = np.argsort(importances)[::-1][:top]
    names = np.asarray(names)[order]
    vals = np.asarray(importances)[order]
    fig, ax = plt.subplots(figsize=(6.2, max(3.5, 0.32 * len(names))))
    ax.barh(range(len(names)), vals[::-1], color="#1E88E5")
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(names[::-1], fontsize=8)
    ax.set_xlabel("Importancia")
    ax.set_title(title)
    _save(fig, path)


def plot_bar_comparison(labels, values, title: str, ylabel: str, path: Path):
    fig, ax = plt.subplots(figsize=(7.0, 4.0))
    bars = ax.bar(labels, values, color="#1565C0")
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    ax.set_ylim(0, 1)
    for b, v in zip(bars, values):
        ax.text(b.get_x() + b.get_width() / 2, v + 0.01, f"{v:.3f}", ha="center", fontsize=8)
    plt.xticks(rotation=30, ha="right")
    _save(fig, path)
