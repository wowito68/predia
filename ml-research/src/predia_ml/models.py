"""Zoo de modelos + entrenamiento con búsqueda de hiperparámetros reproducible."""
from __future__ import annotations

import time
import warnings

import numpy as np
from scipy.stats import loguniform, randint, uniform
from sklearn.ensemble import (
    ExtraTreesClassifier, HistGradientBoostingClassifier, RandomForestClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.svm import SVC

from . import config
from .preprocess import build_preprocessor

# Modelos que se entrenan/tunean sobre un submuestreo (coste O(n^2) o predicción lenta)
SUBSAMPLE_MODELS = {"svm", "knn"}
SUBSAMPLE_SIZE = 8000

# La búsqueda se paraleliza (n_jobs=-1) y los estimadores corren single-thread
# para evitar sobre-suscripción de CPU (nested parallelism) en máquinas de pocos núcleos.
N_ITER = 8
CV_FOLDS = 3


def _estimator_and_space(name: str):
    """Devuelve (estimador, espacio_de_busqueda) con prefijo 'clf__' para el Pipeline."""
    if name == "logistic_regression":
        return LogisticRegression(max_iter=2000, random_state=config.SEED), {
            "clf__C": loguniform(1e-3, 1e2),
            "clf__penalty": ["l2"],
            "clf__class_weight": [None, "balanced"],
        }
    if name == "random_forest":
        return RandomForestClassifier(random_state=config.SEED, n_jobs=1), {
            "clf__n_estimators": randint(120, 280),
            "clf__max_depth": [10, 16, 24],          # acotado: evita árboles enormes en 80k filas
            "clf__min_samples_leaf": randint(2, 20),
            "clf__max_features": ["sqrt", "log2"],
        }
    if name == "extra_trees":
        return ExtraTreesClassifier(random_state=config.SEED, n_jobs=1), {
            "clf__n_estimators": randint(120, 280),
            "clf__max_depth": [12, 24],              # acotado para velocidad en 80k filas
            "clf__min_samples_leaf": randint(2, 20),
        }
    if name == "hist_gradient_boosting":
        return HistGradientBoostingClassifier(random_state=config.SEED), {
            "clf__max_iter": randint(150, 400),
            "clf__learning_rate": loguniform(1e-2, 3e-1),
            "clf__max_depth": [None, 3, 6, 10],
            "clf__l2_regularization": loguniform(1e-3, 1e1),
        }
    if name == "xgboost":
        from xgboost import XGBClassifier
        return XGBClassifier(
            random_state=config.SEED, n_jobs=1, eval_metric="logloss",
            tree_method="hist",
        ), {
            "clf__n_estimators": randint(150, 400),
            "clf__max_depth": randint(3, 8),
            "clf__learning_rate": loguniform(1e-2, 3e-1),
            "clf__subsample": uniform(0.7, 0.3),
            "clf__colsample_bytree": uniform(0.7, 0.3),
        }
    if name == "lightgbm":
        from lightgbm import LGBMClassifier
        return LGBMClassifier(random_state=config.SEED, n_jobs=1, verbose=-1), {
            "clf__n_estimators": randint(150, 400),
            "clf__num_leaves": randint(20, 80),
            "clf__learning_rate": loguniform(1e-2, 3e-1),
            "clf__subsample": uniform(0.7, 0.3),
        }
    if name == "svm":
        return SVC(probability=True, random_state=config.SEED), {
            "clf__C": loguniform(1e-1, 1e2),
            "clf__gamma": ["scale", "auto"],
            "clf__kernel": ["rbf"],
        }
    if name == "knn":
        return KNeighborsClassifier(n_jobs=1), {
            "clf__n_neighbors": randint(5, 40),
            "clf__weights": ["uniform", "distance"],
            "clf__p": [1, 2],
        }
    if name == "mlp":
        return MLPClassifier(max_iter=300, early_stopping=True, random_state=config.SEED), {
            "clf__hidden_layer_sizes": [(64,), (128, 64), (64, 32)],
            "clf__alpha": loguniform(1e-5, 1e-2),
            "clf__learning_rate_init": loguniform(1e-4, 1e-2),
        }
    raise ValueError(f"Modelo desconocido: {name}")


MODEL_NAMES = [
    "logistic_regression", "random_forest", "extra_trees", "hist_gradient_boosting",
    "xgboost", "lightgbm", "svm", "knn", "mlp",
]


def train_one(name: str, X_train, y_train, mode: str, rng: int = config.SEED) -> dict:
    """Entrena un modelo con RandomizedSearchCV (StratifiedKFold, scoring=roc_auc).

    Devuelve dict con el mejor estimador, hiperparámetros, score CV y tiempos.
    """
    estimator, space = _estimator_and_space(name)
    pipe = Pipeline([("prep", build_preprocessor(mode)), ("clf", estimator)])

    Xtr, ytr = X_train, y_train
    subsampled = False
    if name in SUBSAMPLE_MODELS and len(X_train) > SUBSAMPLE_SIZE:
        rs = np.random.RandomState(rng)
        idx = rs.choice(len(X_train), SUBSAMPLE_SIZE, replace=False)
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
        "mode": mode,
        "best_estimator": search.best_estimator_,
        "best_params": {k: (v if isinstance(v, (int, float, str, bool, type(None))) else str(v))
                        for k, v in search.best_params_.items()},
        "cv_roc_auc": float(search.best_score_),
        "fit_time_sec": round(fit_time, 2),
        "subsampled": subsampled,
        "n_train_used": int(len(Xtr)),
    }
