#!/usr/bin/env python3
"""Pre-specified subgroup uncertainty using the already locked 2021 predictions."""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
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
from predia_ensanut.metrics import (  # noqa: E402
    evaluate_predictions,
    operating_point,
)
from predia_ensanut.models import predict_probability  # noqa: E402
from predia_ensanut.reporting import COLORS, dump_json  # noqa: E402


def _group_columns(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    result["sex_group"] = result["female"].map({0.0: "Hombre", 1.0: "Mujer"})
    result["age_group"] = pd.cut(
        result["age"],
        bins=[19, 34, 54, np.inf],
        labels=["20-34", "35-54", "55+"],
    ).astype("string")
    result["area_group"] = result["rural"].map(
        {0.0: "Urbana/metropolitana", 1.0: "Rural"}
    )
    return result


def _bootstrap_indices(frame: pd.DataFrame, repetitions: int, seed: int):
    work = frame.reset_index(drop=True)
    strata = []
    for _, group in work.groupby("stratum", sort=False, dropna=False):
        psu_to_indices = {
            psu: indices.to_numpy()
            for psu, indices in group.groupby("psu", sort=False, dropna=False).groups.items()
        }
        strata.append(psu_to_indices)

    rng = np.random.default_rng(seed)
    for _ in range(repetitions):
        sampled = []
        for psu_to_indices in strata:
            psus = np.asarray(list(psu_to_indices), dtype=object)
            draws = rng.choice(psus, size=len(psus), replace=True)
            sampled.extend(psu_to_indices[psu] for psu in draws)
        yield np.concatenate(sampled)


def analyze_subgroups(
    frame: pd.DataFrame,
    probability: np.ndarray,
    outcome: str,
    threshold: float,
    repetitions: int,
    seed: int,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    work = _group_columns(frame.reset_index(drop=True))
    work["probability"] = np.asarray(probability, dtype=float)
    dimensions = ("sex_group", "age_group", "area_group")
    group_keys = [
        (dimension, str(label))
        for dimension in dimensions
        for label in work[dimension].dropna().unique()
    ]

    rows = []
    for dimension, label in group_keys:
        group = work.loc[work[dimension].astype("string").eq(label)]
        metrics = evaluate_predictions(
            group[outcome].astype(int),
            group["probability"],
            group["survey_weight"],
            threshold,
        )
        rows.append({"dimension": dimension, "group": label, **metrics})

    bootstrap_values: dict[tuple[str, str], dict[str, list[float]]] = {
        key: defaultdict(list) for key in group_keys
    }
    contrasts = {
        "mujer_minus_hombre_auc": (("sex_group", "Mujer"), ("sex_group", "Hombre")),
        "rural_minus_urban_auc": (
            ("area_group", "Rural"),
            ("area_group", "Urbana/metropolitana"),
        ),
        "age_35_54_minus_20_34_auc": (
            ("age_group", "35-54"),
            ("age_group", "20-34"),
        ),
        "age_55_plus_minus_20_34_auc": (
            ("age_group", "55+"),
            ("age_group", "20-34"),
        ),
    }
    contrast_values: dict[str, list[float]] = defaultdict(list)

    for indices in _bootstrap_indices(work, repetitions, seed):
        sample = work.iloc[indices]
        iteration_auc = {}
        for dimension, label in group_keys:
            group = sample.loc[sample[dimension].astype("string").eq(label)]
            y = group[outcome].astype(int).to_numpy()
            if len(np.unique(y)) < 2:
                continue
            weights = group["survey_weight"].to_numpy()
            score = group["probability"].to_numpy()
            auc = float(roc_auc_score(y, score, sample_weight=weights))
            point = operating_point(y, score, weights, threshold)
            iteration_auc[(dimension, label)] = auc
            bootstrap_values[(dimension, label)]["roc_auc"].append(auc)
            for metric in ("sensitivity", "specificity", "ppv", "npv"):
                value = point[metric]
                if np.isfinite(value):
                    bootstrap_values[(dimension, label)][metric].append(value)

        for contrast_name, (left, right) in contrasts.items():
            if left in iteration_auc and right in iteration_auc:
                contrast_values[contrast_name].append(
                    iteration_auc[left] - iteration_auc[right]
                )

    output_rows = []
    for row in rows:
        key = (row["dimension"], row["group"])
        enriched = dict(row)
        for metric in ("roc_auc", "sensitivity", "specificity", "ppv", "npv"):
            values = np.asarray(bootstrap_values[key][metric], dtype=float)
            if values.size:
                lower, upper = np.quantile(values, [0.025, 0.975])
                enriched[f"{metric}_lower"] = float(lower)
                enriched[f"{metric}_upper"] = float(upper)
                enriched[f"{metric}_repetitions"] = int(values.size)
        output_rows.append(enriched)

    contrast_rows = []
    point_by_key = {
        (row["dimension"], row["group"]): row["roc_auc"] for row in rows
    }
    for contrast_name, (left, right) in contrasts.items():
        values = np.asarray(contrast_values[contrast_name], dtype=float)
        lower, upper = np.quantile(values, [0.025, 0.975])
        contrast_rows.append(
            {
                "contrast": contrast_name,
                "estimate": point_by_key[left] - point_by_key[right],
                "lower": float(lower),
                "upper": float(upper),
                "repetitions": int(values.size),
            }
        )
    return pd.DataFrame(output_rows), pd.DataFrame(contrast_rows)


def plot_subgroups_with_ci(subgroups: pd.DataFrame, output: Path) -> None:
    labels = {
        "sex_group": "Sexo",
        "age_group": "Edad",
        "area_group": "Área",
    }
    colors = {
        "sex_group": COLORS["navy"],
        "age_group": COLORS["teal"],
        "area_group": COLORS["amber"],
    }
    data = subgroups.copy().sort_values(["dimension", "roc_auc"])
    data["label"] = data.apply(
        lambda row: f"{labels[row['dimension']]}: {row['group']}", axis=1
    )
    y = np.arange(len(data))
    errors = np.vstack(
        (
            np.maximum(0, data["roc_auc"] - data["roc_auc_lower"]),
            np.maximum(0, data["roc_auc_upper"] - data["roc_auc"]),
        )
    )

    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10})
    fig, axis = plt.subplots(figsize=(8.4, 5.2))
    for index, row in data.reset_index(drop=True).iterrows():
        axis.errorbar(
            row["roc_auc"],
            index,
            xerr=errors[:, index].reshape(2, 1),
            fmt="o",
            color=colors[row["dimension"]],
            ecolor=colors[row["dimension"]],
            capsize=4,
            markersize=7,
        )
    axis.set_yticks(y, data["label"])
    axis.set_xlabel("ROC-AUC ponderada (IC95% por bootstrap de UPM)")
    axis.set_title(
        "Transporte por subgrupos · ENSANUT 2021", loc="left", fontweight="bold"
    )
    axis.spines[["top", "right"]].set_visible(False)
    axis.grid(axis="x", color="#DDE3E6")
    axis.set_axisbelow(True)
    axis.set_xlim(
        max(0.45, data["roc_auc_lower"].min() - 0.03),
        min(1.0, data["roc_auc_upper"].max() + 0.03),
    )
    fig.tight_layout()
    fig.savefig(output, dpi=220, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Incertidumbre por subgrupos con el modelo ya bloqueado."
    )
    parser.add_argument("--bootstrap-repetitions", type=int, default=1000)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    results_dir = config.RESULTS_DIR
    output_path = results_dir / "postlock_subgroup_analysis.json"
    if output_path.exists() and not args.overwrite:
        raise RuntimeError(f"El análisis ya existe: {output_path}")

    lock_path = results_dir / "model_lock.json"
    evaluation_path = results_dir / "evaluation_2021.json"
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    evaluation = json.loads(evaluation_path.read_text(encoding="utf-8"))
    run_pipeline.verify_lock(lock, config.RAW_DATA_DIR, allow_code_drift=False)
    if evaluation["lock_sha256"] != run_pipeline.file_sha256(lock_path):
        raise RuntimeError("La evaluación no corresponde al bloqueo actual.")

    experiment = lock["experiments"]["core"]
    selected = next(
        model
        for model in experiment["models"]
        if model["family"] == experiment["recommended_family"]
    )
    frame = load_wave(config.TEST_WAVE, config.RAW_DATA_DIR).cohort
    model = joblib.load(PROJECT_DIR / selected["artifact"])
    probability = predict_probability(model, frame, tuple(experiment["features"]))
    subgroups, contrasts = analyze_subgroups(
        frame,
        probability,
        experiment["outcome"],
        float(selected["threshold"]),
        repetitions=args.bootstrap_repetitions,
        seed=config.RANDOM_SEED + 300,
    )

    subgroups_path = results_dir / "subgroups_2021_with_ci.csv"
    contrasts_path = results_dir / "subgroup_contrasts_2021.csv"
    subgroups.to_csv(subgroups_path, index=False)
    contrasts.to_csv(contrasts_path, index=False)
    plot_subgroups_with_ci(
        subgroups, results_dir / "figures" / "subgroups_2021_with_ci.png"
    )
    dump_json(
        {
            "schema_version": 1,
            "analysis_status": "post-lock, pre-specified subgroup uncertainty",
            "created_at_utc": datetime.now(timezone.utc).isoformat(),
            "primary_evaluation_sha256": run_pipeline.file_sha256(evaluation_path),
            "model_artifact_sha256": selected["artifact_sha256"],
            "model_family": experiment["recommended_family"],
            "threshold_unchanged": selected["threshold"],
            "bootstrap": {
                "method": "PSU resampling within strata",
                "repetitions_requested": args.bootstrap_repetitions,
                "seed": config.RANDOM_SEED + 300,
            },
            "subgroups": subgroups.to_dict(orient="records"),
            "contrasts": contrasts.to_dict(orient="records"),
        },
        output_path,
    )
    print(f"Subgrupos con incertidumbre: {subgroups_path}")
    print(f"Contrastes: {contrasts_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
