"""Métricas de evaluación clínica. Extiende `predia_ml.evaluate` con PR-AUC
(average precision) y Brier score, claves para datos desbalanceados y para juzgar
la calidad de las probabilidades."""
from __future__ import annotations

import sys

from sklearn.metrics import average_precision_score, brier_score_loss

from . import config

_PREDIA_ML_SRC = str(config.ML_DIR / "src")
if _PREDIA_ML_SRC not in sys.path:
    sys.path.insert(0, _PREDIA_ML_SRC)
from predia_ml.evaluate import compute_metrics as _base_metrics  # noqa: E402


def compute_metrics(y_true, y_pred, y_proba=None) -> dict:
    """Panel de métricas: base (accuracy, balanced_acc, precision, recall/sens,
    specificity, f1, mcc, roc_auc) + pr_auc + brier."""
    out = _base_metrics(y_true, y_pred, y_proba)
    if y_proba is not None:
        out["pr_auc"] = float(average_precision_score(y_true, y_proba))
        out["brier"] = float(brier_score_loss(y_true, y_proba))
    return out


def metrics_table_row(name: str, m: dict) -> dict:
    keys = ["roc_auc", "pr_auc", "f1", "precision", "recall_sensitivity",
            "specificity", "balanced_accuracy", "accuracy", "mcc", "brier"]
    row = {"model": name}
    row.update({k: round(m.get(k, float("nan")), 4) for k in keys})
    return row
