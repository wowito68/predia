#!/usr/bin/env python3
"""Honest fixed-model comparisons after the locked temporal evaluation."""

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


PROJECT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_DIR / "src"))

import run_pipeline  # noqa: E402
from predia_ensanut import config  # noqa: E402
from predia_ensanut.harmonize import load_wave  # noqa: E402
from predia_ensanut.metrics import (  # noqa: E402
    cluster_bootstrap_auc_difference,
    discrimination_metrics,
)
from predia_ensanut.models import predict_probability  # noqa: E402
from predia_ensanut.reporting import COLORS, dump_json  # noqa: E402


OUTCOMES = ("dysglycemia_fpg", "dysglycemia_composite")


def compare_with_published_score(
    frame: pd.DataFrame,
    probability: np.ndarray,
    wave: int,
    repetitions: int,
) -> list[dict]:
    rows = []
    for index, outcome in enumerate(OUTCOMES):
        available = frame[outcome].notna() & frame["mexican_score"].notna()
        subset = frame.loc[available].reset_index(drop=True)
        model_score = probability[available.to_numpy()]
        published_score = subset["mexican_score"].to_numpy()
        model_metrics = discrimination_metrics(
            subset[outcome].astype(int), model_score, subset["survey_weight"]
        )
        published_metrics = discrimination_metrics(
            subset[outcome].astype(int), published_score, subset["survey_weight"]
        )
        difference = cluster_bootstrap_auc_difference(
            subset,
            model_score,
            published_score,
            outcome,
            repetitions=repetitions,
            seed=config.RANDOM_SEED + wave + index,
        )
        rows.append(
            {
                "wave": wave,
                "outcome": outcome,
                "n_common": len(subset),
                "events": int(subset[outcome].sum()),
                "model_roc_auc": model_metrics["roc_auc"],
                "published_score_roc_auc": published_metrics["roc_auc"],
                "auc_difference": difference["estimate"],
                "auc_difference_lower": difference.get("lower"),
                "auc_difference_upper": difference.get("upper"),
                "bootstrap_repetitions": difference["repetitions"],
            }
        )
    return rows


def plot_comparisons(data: pd.DataFrame, output: Path) -> None:
    labels = {
        "dysglycemia_fpg": "Glucosa en ayuno >=100 mg/dL",
        "dysglycemia_composite": "Glucosa >=100 mg/dL o HbA1c >=5.7%",
    }
    work = data.copy()
    work["label"] = work.apply(
        lambda row: f"ENSANUT {row['wave']} · {labels[row['outcome']]}", axis=1
    )
    work = work.sort_values(["wave", "outcome"])
    y = np.arange(len(work))
    errors = np.vstack(
        (
            np.maximum(0, work["auc_difference"] - work["auc_difference_lower"]),
            np.maximum(0, work["auc_difference_upper"] - work["auc_difference"]),
        )
    )

    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10})
    fig, axis = plt.subplots(figsize=(9.2, 4.8))
    axis.errorbar(
        work["auc_difference"],
        y,
        xerr=errors,
        fmt="o",
        color=COLORS["navy"],
        ecolor=COLORS["blue_gray"],
        capsize=4,
        markersize=7,
    )
    axis.axvline(0, color=COLORS["rose"], linewidth=1.3, linestyle="--")
    axis.set_yticks(y, work["label"])
    axis.set_xlabel("Diferencia de ROC-AUC: PREDIA - puntaje publicado (IC95%)")
    axis.set_title(
        "Comparación emparejada con el puntaje mexicano de 2024",
        loc="left",
        fontweight="bold",
    )
    axis.spines[["top", "right"]].set_visible(False)
    axis.grid(axis="x", color="#DDE3E6")
    axis.set_axisbelow(True)
    fig.tight_layout()
    fig.savefig(output, dpi=220, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compara modelos bloqueados sin volver a seleccionarlos."
    )
    parser.add_argument("--bootstrap-repetitions", type=int, default=1000)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    results_dir = config.RESULTS_DIR
    output_path = results_dir / "postlock_comparator_analysis.json"
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
    locked_models = {model["family"]: model for model in experiment["models"]}
    selected_family = experiment["recommended_family"]
    selected_lock = locked_models[selected_family]
    selected_model = joblib.load(PROJECT_DIR / selected_lock["artifact"])

    waves = {year: load_wave(year, config.RAW_DATA_DIR).cohort for year in (2018, 2021)}
    selected_predictions = {
        year: predict_probability(
            selected_model, frame, tuple(experiment["features"])
        )
        for year, frame in waves.items()
    }
    comparator_rows = []
    for year, frame in waves.items():
        comparator_rows.extend(
            compare_with_published_score(
                frame,
                selected_predictions[year],
                wave=year,
                repetitions=args.bootstrap_repetitions,
            )
        )
    comparator_table = pd.DataFrame(comparator_rows)

    family_rows = []
    test = waves[2021]
    selected_probability = selected_predictions[2021]
    for index, family in enumerate(("logistic", "monotonic_boosting")):
        comparison_model = joblib.load(PROJECT_DIR / locked_models[family]["artifact"])
        comparison_probability = predict_probability(
            comparison_model, test, tuple(experiment["features"])
        )
        difference = cluster_bootstrap_auc_difference(
            test,
            selected_probability,
            comparison_probability,
            experiment["outcome"],
            repetitions=args.bootstrap_repetitions,
            seed=config.RANDOM_SEED + 500 + index,
        )
        family_rows.append(
            {
                "comparison": f"{selected_family}_minus_{family}",
                **difference,
            }
        )
    family_table = pd.DataFrame(family_rows)

    comparator_csv = results_dir / "published_score_comparisons.csv"
    family_csv = results_dir / "locked_family_comparisons_2021.csv"
    comparator_table.to_csv(comparator_csv, index=False)
    family_table.to_csv(family_csv, index=False)
    plot_comparisons(
        comparator_table,
        results_dir / "figures" / "published_score_comparisons.png",
    )
    dump_json(
        {
            "schema_version": 1,
            "analysis_status": "post-lock fixed-model comparison",
            "created_at_utc": datetime.now(timezone.utc).isoformat(),
            "primary_evaluation_sha256": run_pipeline.file_sha256(evaluation_path),
            "model_artifact_sha256": selected_lock["artifact_sha256"],
            "selected_family_unchanged": selected_family,
            "published_comparator": {
                "citation": (
                    "Rojas-Martinez et al. Deteccion oportuna de prediabetes y "
                    "diabetes. Salud Publica Mex. 2024;66:520-529. "
                    "doi:10.21149/15837"
                ),
                "important_limitation": (
                    "El puntaje se desarrollo con ENSANUT Continua 2021-2023; "
                    "por ello, su resultado en 2021 no es una validacion externa "
                    "independiente del puntaje publicado."
                ),
            },
            "bootstrap_repetitions": args.bootstrap_repetitions,
            "published_score_comparisons": comparator_table.to_dict(orient="records"),
            "locked_family_comparisons_2021": family_table.to_dict(orient="records"),
        },
        output_path,
    )
    print(f"Comparaciones publicadas: {comparator_csv}")
    print(f"Familias bloqueadas: {family_csv}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
