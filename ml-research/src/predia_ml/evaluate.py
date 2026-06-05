"""Métricas de evaluación con énfasis clínico (sensibilidad/especificidad)."""
from __future__ import annotations

import numpy as np
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, confusion_matrix, f1_score,
    matthews_corrcoef, precision_score, recall_score, roc_auc_score,
)


def compute_metrics(y_true, y_pred, y_proba=None) -> dict:
    """Panel completo de métricas para clasificación binaria clínica."""
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    specificity = tn / (tn + fp) if (tn + fp) else 0.0
    out = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall_sensitivity": float(recall_score(y_true, y_pred, zero_division=0)),
        "specificity": float(specificity),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "mcc": float(matthews_corrcoef(y_true, y_pred)),
        "tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp),
    }
    if y_proba is not None:
        out["roc_auc"] = float(roc_auc_score(y_true, y_proba))
    return out


def metrics_table_row(name: str, m: dict) -> dict:
    """Aplana una fila para tablas comparativas."""
    keys = ["accuracy", "balanced_accuracy", "precision", "recall_sensitivity",
            "specificity", "f1", "roc_auc", "mcc"]
    row = {"model": name}
    row.update({k: round(m.get(k, float("nan")), 4) for k in keys})
    return row
