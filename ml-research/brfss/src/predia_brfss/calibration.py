"""Calibración de probabilidades: Platt (sigmoide) e Isotónica, con métricas de
fiabilidad (Brier y ECE — Expected Calibration Error)."""
from __future__ import annotations

import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import brier_score_loss


def expected_calibration_error(y_true, y_proba, n_bins: int = 10) -> float:
    """ECE con binning uniforme: media ponderada |confianza - precisión| por bin."""
    y_true = np.asarray(y_true)
    y_proba = np.asarray(y_proba)
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    idx = np.digitize(y_proba, bins[1:-1])
    ece = 0.0
    n = len(y_true)
    for b in range(n_bins):
        m = idx == b
        if not m.any():
            continue
        conf = y_proba[m].mean()
        acc = y_true[m].mean()
        ece += (m.sum() / n) * abs(conf - acc)
    return float(ece)


def reliability(y_true, y_proba, n_bins: int = 10) -> dict:
    return {
        "brier": float(brier_score_loss(y_true, y_proba)),
        "ece": expected_calibration_error(y_true, y_proba, n_bins),
    }


def calibrate(fitted_estimator, X_cal, y_cal, method: str):
    """Calibra un estimador YA entrenado usando un conjunto de calibración aparte.

    method: 'sigmoid' (Platt) | 'isotonic'.
    Usa cv='prefit' para no reentrenar el modelo base.
    """
    cal = CalibratedClassifierCV(fitted_estimator, method=method, cv="prefit")
    cal.fit(X_cal, y_cal)
    return cal
