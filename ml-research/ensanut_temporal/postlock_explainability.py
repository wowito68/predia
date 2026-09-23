#!/usr/bin/env python3
"""Explain the locked additive model without using the test wave for selection."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score


PROJECT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_DIR / "src"))

import run_pipeline  # noqa: E402
from predia_ensanut import config  # noqa: E402
from predia_ensanut.harmonize import load_wave  # noqa: E402
from predia_ensanut.models import predict_probability  # noqa: E402
from predia_ensanut.reporting import COLORS, dump_json  # noqa: E402


FEATURE_LABELS = {
    "age": "Edad (años)",
    "female": "Sexo registrado (mujer)",
    "parent_diabetes": "Diabetes en padre o madre",
    "diagnosed_hypertension": "Hipertensión diagnosticada",
    "bmi": "Índice de masa corporal (kg/m²)",
    "waist_cm": "Circunferencia de cintura (cm)",
}


def marginal_curves(
    model: object,
    frame: pd.DataFrame,
    features: tuple[str, ...],
) -> pd.DataFrame:
    weights = frame["survey_weight"].to_numpy()
    rows = []
    for feature in config.CONTINUOUS_CORE_FEATURES:
        observed = frame[feature].dropna()
        grid = np.linspace(observed.quantile(0.025), observed.quantile(0.975), 60)
        for value in grid:
            counterfactual = frame.loc[:, features].copy()
            counterfactual[feature] = value
            probability = model.predict_proba(counterfactual)[:, 1]
            rows.append(
                {
                    "feature": feature,
                    "value": float(value),
                    "weighted_mean_probability": float(
                        np.average(probability, weights=weights)
                    ),
                }
            )
    return pd.DataFrame(rows)


def permutation_importance(
    model: object,
    frame: pd.DataFrame,
    features: tuple[str, ...],
    repetitions: int,
    seed: int,
) -> pd.DataFrame:
    y = frame[config.PRIMARY_OUTCOME].astype(int).to_numpy()
    weights = frame["survey_weight"].to_numpy()
    baseline_probability = predict_probability(model, frame, features)
    baseline_auc = roc_auc_score(y, baseline_probability, sample_weight=weights)
    rng = np.random.default_rng(seed)
    rows = []
    for feature in features:
        losses = []
        for _ in range(repetitions):
            permuted = frame.loc[:, features].copy()
            permuted[feature] = rng.permutation(permuted[feature].to_numpy())
            probability = model.predict_proba(permuted)[:, 1]
            auc = roc_auc_score(y, probability, sample_weight=weights)
            losses.append(baseline_auc - auc)
        rows.append(
            {
                "feature": feature,
                "label": FEATURE_LABELS[feature],
                "baseline_roc_auc": float(baseline_auc),
                "mean_auc_loss": float(np.mean(losses)),
                "sd_auc_loss": float(np.std(losses, ddof=1)),
                "repetitions": repetitions,
            }
        )
    return pd.DataFrame(rows).sort_values("mean_auc_loss", ascending=False)


def plot_explainability(
    curves: pd.DataFrame,
    importance: pd.DataFrame,
    output: Path,
) -> None:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "font.size": 9,
            "axes.spines.top": False,
            "axes.spines.right": False,
        }
    )
    fig, axes = plt.subplots(2, 2, figsize=(10.5, 7.2))
    colors = (COLORS["navy"], COLORS["teal"], COLORS["amber"])
    for axis, feature, color in zip(
        axes.flat[:3], config.CONTINUOUS_CORE_FEATURES, colors, strict=True
    ):
        data = curves.loc[curves["feature"].eq(feature)]
        axis.plot(
            data["value"],
            data["weighted_mean_probability"],
            color=color,
            linewidth=2.4,
        )
        axis.set_xlabel(FEATURE_LABELS[feature])
        axis.set_ylabel("Riesgo medio predicho")
        axis.grid(color="#DDE3E6")
        axis.set_axisbelow(True)

    axis = axes.flat[3]
    ordered = importance.sort_values("mean_auc_loss")
    y = np.arange(len(ordered))
    axis.barh(y, ordered["mean_auc_loss"], color=COLORS["blue_gray"])
    axis.errorbar(
        ordered["mean_auc_loss"],
        y,
        xerr=ordered["sd_auc_loss"],
        fmt="none",
        ecolor=COLORS["navy"],
        capsize=3,
    )
    axis.set_yticks(y, ordered["label"])
    axis.set_xlabel("Pérdida media de ROC-AUC al permutar")
    axis.grid(axis="x", color="#DDE3E6")
    axis.set_axisbelow(True)

    fig.suptitle(
        "Comportamiento explicable del modelo bloqueado · ENSANUT 2018",
        x=0.06,
        ha="left",
        fontsize=15,
        fontweight="bold",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.95))
    fig.savefig(output, dpi=220, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Curvas marginales e importancia del modelo fijo."
    )
    parser.add_argument("--permutation-repetitions", type=int, default=50)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    results_dir = config.RESULTS_DIR
    output_path = results_dir / "postlock_explainability.json"
    if output_path.exists() and not args.overwrite:
        raise RuntimeError(f"El análisis ya existe: {output_path}")

    lock_path = results_dir / "model_lock.json"
    evaluation_path = results_dir / "evaluation_2021.json"
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    evaluation = json.loads(evaluation_path.read_text(encoding="utf-8"))
    run_pipeline.verify_lock(lock, config.RAW_DATA_DIR, allow_code_drift=False)
    if evaluation["lock_sha256"] != run_pipeline.file_sha256(lock_path):
        raise RuntimeError("La evaluación primaria no corresponde al bloqueo actual.")

    experiment = lock["experiments"]["core"]
    selected = next(
        item
        for item in experiment["models"]
        if item["family"] == experiment["recommended_family"]
    )
    model = joblib.load(PROJECT_DIR / selected["artifact"])
    frame = load_wave(config.VALIDATION_WAVE, config.RAW_DATA_DIR).cohort
    features = tuple(experiment["features"])
    curves = marginal_curves(model, frame, features)
    importance = permutation_importance(
        model,
        frame,
        features,
        repetitions=args.permutation_repetitions,
        seed=config.RANDOM_SEED + 600,
    )

    curves_path = results_dir / "model_effect_curves_2018.csv"
    importance_path = results_dir / "permutation_importance_2018.csv"
    curves.to_csv(curves_path, index=False)
    importance.to_csv(importance_path, index=False)
    plot_explainability(
        curves, importance, results_dir / "figures" / "model_explainability_2018.png"
    )
    dump_json(
        {
            "schema_version": 1,
            "analysis_status": "post-lock explanation on validation wave",
            "created_at_utc": datetime.now(timezone.utc).isoformat(),
            "primary_evaluation_sha256": run_pipeline.file_sha256(evaluation_path),
            "model_artifact_sha256": selected["artifact_sha256"],
            "model_family": experiment["recommended_family"],
            "explanation_wave": config.VALIDATION_WAVE,
            "test_wave_not_used_for_explanation": True,
            "marginal_method": (
                "Survey-weighted mean prediction after replacing one continuous "
                "feature over its 2.5th-97.5th percentile range."
            ),
            "permutation_repetitions": args.permutation_repetitions,
            "importance": importance.to_dict(orient="records"),
        },
        output_path,
    )
    print(f"Curvas marginales: {curves_path}")
    print(f"Importancia por permutación: {importance_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
