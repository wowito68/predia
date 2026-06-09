"""Zoo de modelos para BRFSS. Reutiliza las definiciones de modelos e
hiperparámetros de `predia_ml.models._estimator_and_space` (los 9 estimadores ya
calibrados para este tipo de tarea) envolviéndolos con el preprocesador BRFSS.
"""
from __future__ import annotations

import sys
import time
import warnings

import numpy as np
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold
from sklearn.pipeline import Pipeline

from . import config
from .preprocess import build_preprocessor

# Hacer importable el paquete hermano predia_ml (ml-research/src)
_PREDIA_ML_SRC = str(config.ML_DIR / "src")
if _PREDIA_ML_SRC not in sys.path:
    sys.path.insert(0, _PREDIA_ML_SRC)
from predia_ml.models import _estimator_and_space, MODEL_NAMES  # noqa: E402

# Modelos cuyo coste (CPU o memoria) escala mal con n -> submuestreo para el tuning.
# SVM/KNN por coste algorítmico; RandomForest/ExtraTrees por presión de memoria al
# construir árboles profundos en paralelo sobre ~150k filas en máquinas con poca RAM.
SUBSAMPLE_SIZES = {"svm": 8000, "knn": 15000,
                   "random_forest": 60000, "extra_trees": 60000}

N_ITER = 10
CV_FOLDS = 3


def train_one(name: str, X_train, y_train, rng: int = config.SEED) -> dict:
    """Entrena un modelo con RandomizedSearchCV (StratifiedKFold, scoring=roc_auc)
    sobre el preprocesador BRFSS. Submuestrea los modelos de coste alto."""
    estimator, space = _estimator_and_space(name)
    pipe = Pipeline([("prep", build_preprocessor()), ("clf", estimator)])

    Xtr, ytr = X_train, y_train
    subsampled = False
    cap = SUBSAMPLE_SIZES.get(name)
    if cap and len(X_train) > cap:
        rs = np.random.RandomState(rng)
        idx = rs.choice(len(X_train), cap, replace=False)
        Xtr, ytr = X_train.iloc[idx], y_train.iloc[idx]
        subsampled = True

    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=rng)
    search = RandomizedSearchCV(
        pipe, space, n_iter=N_ITER, scoring="roc_auc", cv=cv,
        random_state=rng, n_jobs=-1, refit=True,
    )

    t0 = time.time()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        search.fit(Xtr, ytr)
    fit_time = time.time() - t0

    return {
        "name": name,
        "best_estimator": search.best_estimator_,
        "best_params": {k: (v if isinstance(v, (int, float, str, bool, type(None))) else str(v))
                        for k, v in search.best_params_.items()},
        "cv_roc_auc": float(search.best_score_),
        "fit_time_sec": round(fit_time, 2),
        "subsampled": subsampled,
        "n_train_used": int(len(Xtr)),
    }
