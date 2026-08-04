"""Explicabilidad: SHAP, permutation importance y partial dependence.
Responde qué factores impulsan el riesgo, cuáles son protectores y qué
interacciones existen."""
from __future__ import annotations

import numpy as np
from sklearn.inspection import permutation_importance

from . import config


def _split_pipeline(pipe):
    """Devuelve (preprocesador, clasificador) de un Pipeline ('prep','clf')."""
    return pipe.named_steps["prep"], pipe.named_steps["clf"]


def transformed_feature_names(pipe) -> list[str]:
    prep, _ = _split_pipeline(pipe)
    try:
        return list(prep.get_feature_names_out())
    except Exception:
        return config.NUMERIC_COLS + config.BINARY_COLS


def shap_values(pipe, X_sample):
    """SHAP del clasificador sobre features transformadas. Elige el explainer
    según el tipo de modelo (Tree para ensembles, Linear para LogReg).

    Devuelve (shap_matrix [n, n_features], feature_names, X_transformed).
    Lanza ValueError si el modelo no es directamente explicable con SHAP rápido.
    """
    import shap

    prep, clf = _split_pipeline(pipe)
    Xt = prep.transform(X_sample)
    names = transformed_feature_names(pipe)
    clf_name = type(clf).__name__

    tree_models = {"RandomForestClassifier", "ExtraTreesClassifier",
                   "XGBClassifier", "LGBMClassifier"}
    if clf_name in tree_models:
        explainer = shap.TreeExplainer(clf)
        sv = explainer.shap_values(Xt)
        # Binario: algunas versiones devuelven lista [clase0, clase1]
        if isinstance(sv, list):
            sv = sv[1]
        sv = np.asarray(sv)
        if sv.ndim == 3:           # (n, features, clases)
            sv = sv[:, :, 1]
        return sv, names, Xt
    if clf_name == "LogisticRegression":
        explainer = shap.LinearExplainer(clf, Xt)
        sv = np.asarray(explainer.shap_values(Xt))
        return sv, names, Xt
    raise ValueError(f"SHAP rápido no disponible para {clf_name}")


def shap_global_importance(sv, names) -> list[dict]:
    """Importancia global = media de |SHAP|; signo de la correlación SHAP-valor
    indica dirección (protector vs de riesgo)."""
    mean_abs = np.abs(sv).mean(axis=0)
    order = np.argsort(mean_abs)[::-1]
    return [{"feature": names[i], "mean_abs_shap": round(float(mean_abs[i]), 5)}
            for i in order]


def permutation_imp(pipe, X, y, n_repeats: int = 10, scoring: str = "roc_auc") -> list[dict]:
    """Permutation importance model-agnóstica sobre el pipeline completo."""
    r = permutation_importance(
        pipe, X, y, n_repeats=n_repeats, random_state=config.SEED,
        scoring=scoring, n_jobs=-1,
    )
    order = np.argsort(r.importances_mean)[::-1]
    cols = list(X.columns)
    return [{
        "feature": cols[i],
        "importance_mean": round(float(r.importances_mean[i]), 5),
        "importance_std": round(float(r.importances_std[i]), 5),
    } for i in order]
