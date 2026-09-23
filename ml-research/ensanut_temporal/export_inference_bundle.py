#!/usr/bin/env python3
"""Export the locked core model to a deterministic, runtime-neutral JSON bundle."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


PROJECT_DIR = Path(__file__).resolve().parent
REPOSITORY_DIR = PROJECT_DIR.parents[1]
sys.path.insert(0, str(PROJECT_DIR / "src"))

import run_pipeline  # noqa: E402
from predia_ensanut import config  # noqa: E402


DEFAULT_OUTPUT = REPOSITORY_DIR / "apps" / "web" / "lib" / "ensanut-screening-model.json"


def as_floats(values: object) -> list[float]:
    return [float(value) for value in np.asarray(values).ravel()]


def build_bundle() -> dict:
    lock_path = PROJECT_DIR / "results" / "model_lock.json"
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    run_pipeline.verify_lock(lock, config.RAW_DATA_DIR, allow_code_drift=False)

    experiment = lock["experiments"]["core"]
    selected = next(
        item
        for item in experiment["models"]
        if item["family"] == experiment["recommended_family"]
    )
    model_path = PROJECT_DIR / selected["artifact"]
    model = joblib.load(model_path)

    features = model.named_steps["features"]
    continuous = features.named_transformers_["continuous"]
    binary = features.named_transformers_["binary"]
    spline = continuous.named_steps["spline"]
    continuous_imputer = continuous.named_steps["imputer"]
    continuous_scaler = continuous.named_steps["scale"]
    binary_imputer = binary.named_steps["imputer"]
    binary_scaler = binary.named_steps["scale"]
    classifier = model.named_steps["model"]

    indicator_indices = as_floats(binary_imputer.indicator_.features_)
    indicator_features = [
        list(binary_imputer.feature_names_in_)[int(index)]
        for index in indicator_indices
    ]

    bundle = {
        "schemaVersion": 1,
        "modelVersion": "ensanut-temporal-core-spline-v1",
        "studyFingerprint": lock["study_fingerprint"],
        "lockedAtUtc": lock["locked_at_utc"],
        "artifactSha256": selected["artifact_sha256"],
        "outcome": {
            "id": experiment["outcome"],
            "label": "Disglucemia no diagnosticada",
            "definition": "Glucosa plasmática en ayuno >= 100 mg/dL sin diagnóstico previo de diabetes",
        },
        "threshold": float(selected["threshold"]),
        "trainingWaves": experiment["training_waves"],
        "validationWave": experiment["validation_wave"],
        "testWave": experiment["test_wave"],
        "continuous": {
            "features": list(config.CONTINUOUS_CORE_FEATURES),
            "imputerStatistics": as_floats(continuous_imputer.statistics_),
            "splines": [
                {
                    "knots": as_floats(bspline.t),
                    "degree": int(bspline.k),
                    "basisCount": int(bspline.c.shape[0]),
                    "lowerBound": float(bspline.t[bspline.k]),
                    "upperBound": float(bspline.t[bspline.c.shape[0]]),
                }
                for bspline in spline.bsplines_
            ],
            "scalerMean": as_floats(continuous_scaler.mean_),
            "scalerScale": as_floats(continuous_scaler.scale_),
        },
        "binary": {
            "features": ["female", "parent_diabetes", "diagnosed_hypertension"],
            "imputerStatistics": as_floats(binary_imputer.statistics_),
            "indicatorFeatures": indicator_features,
            "scalerMean": as_floats(binary_scaler.mean_),
            "scalerScale": as_floats(binary_scaler.scale_),
        },
        "classifier": {
            "intercept": float(classifier.intercept_[0]),
            "coefficients": as_floats(classifier.coef_[0]),
        },
        "externalTest": {
            "wave": 2021,
            "rocAuc": 0.693778,
            "rocAucCi95": [0.657444, 0.729366],
            "sensitivity": 0.782388,
            "specificity": 0.441198,
            "calibrationIntercept": -0.440265,
            "calibrationSlope": 0.986834,
        },
        "clinicalUse": {
            "status": "research_prototype",
            "intendedUse": "Priorizar confirmación bioquímica en adultos sin diagnóstico previo de diabetes",
            "warning": "No diagnostica diabetes ni sustituye el juicio clínico. Requiere recalibración y validación prospectiva antes de uso asistencial.",
        },
    }

    golden_inputs = [
        {"age": 24.0, "female": 1.0, "parent_diabetes": 0.0, "diagnosed_hypertension": 0.0, "bmi": 22.0, "waist_cm": 72.0},
        {"age": 45.0, "female": 0.0, "parent_diabetes": 1.0, "diagnosed_hypertension": 0.0, "bmi": 30.0, "waist_cm": 102.0},
        {"age": 66.0, "female": 1.0, "parent_diabetes": 1.0, "diagnosed_hypertension": 1.0, "bmi": 35.0, "waist_cm": 112.0},
        {"age": 84.0, "female": 0.0, "parent_diabetes": None, "diagnosed_hypertension": None, "bmi": 27.5, "waist_cm": 96.0},
        {"age": 20.0, "female": 1.0, "parent_diabetes": 0.0, "diagnosed_hypertension": 0.0, "bmi": 12.2, "waist_cm": 50.5},
        {"age": 104.0, "female": 0.0, "parent_diabetes": 1.0, "diagnosed_hypertension": 1.0, "bmi": 72.0, "waist_cm": 173.0},
    ]
    golden_frame = pd.DataFrame(golden_inputs, columns=experiment["features"])
    predictions = model.predict_proba(golden_frame)[:, 1]
    bundle["goldenVectors"] = [
        {"input": values, "probability": float(probability)}
        for values, probability in zip(golden_inputs, predictions, strict=True)
    ]
    return bundle


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(build_bundle(), ensure_ascii=True, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Inference bundle written to {args.output}")


if __name__ == "__main__":
    main()
