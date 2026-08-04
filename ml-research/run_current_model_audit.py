"""12: Auditoría forense del modelo ACTUAL de PREDIA.

Demuestra de forma reproducible:
  (a) El mismatch dataset/modelo (features Urea/Cr/VLDL ausentes; escalas distintas).
  (b) Que el ~97.89% solo es alcanzable con variables diagnósticas/fugadas.
  (c) Que HbA1c por sí sola casi determina el objetivo (fuga).
"""
from __future__ import annotations

import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_validate, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from predia_ml import config, data
from predia_ml.data import save_json

CV = StratifiedKFold(n_splits=5, shuffle=True, random_state=config.SEED)


def inspect_pkl() -> dict:
    out = {}
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            model = joblib.load(config.CURRENT_MODEL_DIR / "modelo_diabetes.pkl")
        out["loaded"] = True
        out["estimator_class"] = type(model).__name__
        out["n_features_in"] = int(getattr(model, "n_features_in_", -1))
        out["classes"] = [int(c) for c in getattr(model, "classes_", [])]
        if hasattr(model, "coef_"):
            out["coef_shape"] = list(np.asarray(model.coef_).shape)
            out["intercept"] = [float(x) for x in np.atleast_1d(model.intercept_)]
        fn = getattr(model, "feature_names_in_", None)
        out["feature_names_in"] = list(fn) if fn is not None else None
    except Exception as e:  # noqa: BLE001
        out["loaded"] = False
        out["error"] = str(e)
    return out


def feature_mismatch(df: pd.DataFrame) -> dict:
    """Mapea las 11 features del modelo actual al dataset provisto."""
    # equivalencias plausibles por nombre
    mapping = {
        "Gender": "gender", "AGE": "age", "BMI": "bmi", "HbA1c": "hba1c",
        "Chol": "cholesterol_total", "TG": "triglycerides", "HDL": "hdl_cholesterol",
        "LDL": "ldl_cholesterol", "VLDL": None, "Urea": None, "Cr": None,
    }
    present, absent = {}, []
    for feat in config.CURRENT_MODEL_FEATURES:
        col = mapping.get(feat)
        if col and col in df.columns:
            present[feat] = col
        else:
            absent.append(feat)
    return {"mapping": mapping, "present_in_dataset": present, "absent_in_dataset": absent}


def _lr_eval(X: pd.DataFrame, y: pd.Series) -> dict:
    pipe = Pipeline([("sc", StandardScaler()), ("clf", LogisticRegression(max_iter=2000, random_state=config.SEED))])
    res = cross_validate(pipe, X, y, cv=CV, scoring=["accuracy", "roc_auc"], n_jobs=-1)
    return {"accuracy": round(float(res["test_accuracy"].mean()), 4),
            "roc_auc": round(float(res["test_roc_auc"].mean()), 4)}


def leakage_demo(df: pd.DataFrame) -> dict:
    y = df[config.TARGET].astype(int)
    demos = {}

    # A) solo HbA1c
    demos["hba1c_only"] = _lr_eval(df[["hba1c"]], y)
    # B) solo glucosa en ayunas
    demos["glucose_fasting_only"] = _lr_eval(df[["glucose_fasting"]], y)
    # C) laboratorios diagnósticos
    demos["diagnostic_labs"] = _lr_eval(df[config.DIAGNOSTIC_LABS], y)
    # D) FUGA total: incluye diabetes_risk_score + diabetes_stage codificada
    leaky = df[["diabetes_risk_score"]].copy()
    leaky["stage_code"] = df["diabetes_stage"].astype("category").cat.codes
    demos["leaky_stage_plus_score"] = _lr_eval(leaky, y)
    # E) cribado honesto (solo features seguras numéricas, sin labs)
    demos["screening_numeric_safe"] = _lr_eval(df[config.NUMERIC_SAFE_COLS], y)
    return demos


def main():
    df = data.load_raw()
    report = {
        "reported_accuracy_seed_metadata": config.CURRENT_MODEL_REPORTED_ACCURACY,
        "note_conflicting_metric_in_code": "ml-predict.ts comenta 98.42% / precision 100% / AUC 99.75% (conflicto)",
        "current_model_features": config.CURRENT_MODEL_FEATURES,
        "current_model_train_samples": 757 + 190,
        "pkl_inspection": inspect_pkl(),
        "feature_mismatch": feature_mismatch(df),
        "leakage_demonstration_cv5": leakage_demo(df),
    }
    save_json(report, config.METRICS_DIR / "current_model_audit.json")

    print("== AUDITORÍA MODELO ACTUAL ==")
    print("PKL:", report["pkl_inspection"].get("estimator_class"),
          "| n_features:", report["pkl_inspection"].get("n_features_in"))
    print("Features ausentes en el dataset provisto:", report["feature_mismatch"]["absent_in_dataset"])
    print("Demostración de fuga (CV5 LogReg):")
    for k, v in report["leakage_demonstration_cv5"].items():
        print(f"  {k:28s} acc={v['accuracy']:.4f}  auc={v['roc_auc']:.4f}")


if __name__ == "__main__":
    main()
