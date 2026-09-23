#!/usr/bin/env python3
"""Exploratory resource-allocation analysis of fixed ENSANUT predictions."""

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

PROJECT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_DIR / "src"))

import run_pipeline
from predia_ensanut import config
from predia_ensanut.harmonize import load_all_waves
from predia_ensanut.models import predict_probability
from predia_ensanut.reporting import dump_json
from postlock_subgroup_analysis import _bootstrap_indices, _group_columns

CAPACITIES = (0.2, 0.4, 0.6)
SEED = 20260912


def capacity_allocation(score, weight, capacity):
    """Equal probability within ties; outcomes never determine selection."""
    score, weight = np.asarray(score, float), np.asarray(weight, float)
    if score.ndim != 1 or score.shape != weight.shape or not len(score):
        raise ValueError("Scores and weights must be nonempty matching vectors")
    if not np.isfinite(score).all() or not np.isfinite(weight).all() or (weight <= 0).any():
        raise ValueError("Scores must be finite and weights strictly positive")
    if not np.isfinite(capacity) or not 0 <= capacity <= 1:
        raise ValueError("Capacity must be between zero and one")
    if capacity in (0, 1):
        return np.full(len(score), capacity, dtype=float)
    levels, inverse = np.unique(score, return_inverse=True)
    mass = np.bincount(inverse, weights=weight, minlength=len(levels))
    mass_above = (np.cumsum(mass[::-1]) - mass[::-1])[::-1]
    probability = np.clip((capacity * weight.sum() - mass_above) / mass, 0, 1)
    return probability[inverse]


def allocation_metrics(y, weight, allocation):
    y, weight, allocation = map(lambda values: np.asarray(values, float), (y, weight, allocation))
    if not (y.shape == weight.shape == allocation.shape):
        raise ValueError("Mismatched vector lengths")
    if not np.isin(y, [0, 1]).all() or not np.isfinite(weight).all() or (weight <= 0).any():
        raise ValueError("Invalid outcome or weights")
    if not np.isfinite(allocation).all() or ((allocation < 0) | (allocation > 1)).any():
        raise ValueError("Invalid allocation")
    total = weight.sum()
    positive = np.dot(weight, y)
    detected = np.dot(weight, y * allocation)
    referrals = np.dot(weight, allocation)
    negative = total - positive
    ratio = lambda a, b: float(a / b) if b > 0 else float("nan")
    return {
        "prevalence": ratio(positive, total),
        "tests_per_1000": 1000 * ratio(referrals, total),
        "detected_per_1000": 1000 * ratio(detected, total),
        "missed_per_1000": 1000 * ratio(positive - detected, total),
        "negative_tests_per_1000": 1000 * ratio(referrals - detected, total),
        "sensitivity": ratio(detected, positive),
        "specificity": ratio(negative - referrals + detected, negative),
        "ppv": ratio(detected, referrals),
        "tests_per_detected": ratio(referrals, detected),
    }


def assess(frame, probability, threshold):
    y = frame["dysglycemia_fpg"].to_numpy(int)
    w = frame["survey_weight"].to_numpy(float)
    referral = (probability >= threshold).astype(float)
    outputs = {"locked/full": allocation_metrics(y, w, referral)}
    common = frame["mexican_score"].notna().to_numpy()
    for capacity in CAPACITIES:
        for method, scores in (("model", probability[common]), ("published", frame.loc[common, "mexican_score"].to_numpy())):
            allocation = capacity_allocation(scores, w[common], capacity)
            outputs[f"capacity/{capacity}/{method}"] = allocation_metrics(y[common], w[common], allocation)
        outputs[f"capacity/{capacity}/random"] = allocation_metrics(y[common], w[common], np.full(sum(common), capacity))
        outputs[f"difference/{capacity}"] = {
            "detected_per_1000": outputs[f"capacity/{capacity}/model"]["detected_per_1000"] - outputs[f"capacity/{capacity}/published"]["detected_per_1000"]
        }
    for category, events in (
        ("100_to_lt126", frame["glucose_mg_dl"].between(100, 126, inclusive="left")),
        ("126_or_more", frame["glucose_mg_dl"].ge(126)),
    ):
        outputs[f"glycemia/{category}"] = allocation_metrics(events.to_numpy(int), w, referral)
    grouped = _group_columns(frame)
    for dimension in ("sex_group", "age_group", "area_group"):
        for label in grouped[dimension].dropna().unique():
            mask = grouped[dimension].eq(label).fillna(False).to_numpy(bool)
            metrics = allocation_metrics(y[mask], w[mask], referral[mask])
            metrics["share_of_all_missed"] = float(np.dot(w[mask], y[mask] * (1 - referral[mask])) / np.dot(w, y * (1 - referral)))
            outputs[f"subgroup/{dimension}/{label}"] = metrics
    return outputs


def enrich(points, samples):
    result = {}
    for key, metrics in points.items():
        result[key] = {}
        for metric, value in metrics.items():
            values = np.asarray(samples[key][metric], float)
            values = values[np.isfinite(values)]
            if len(values) < 0.95 * len(samples[key][metric]):
                raise ValueError(f"Too few finite bootstrap estimates: {key}/{metric}")
            lower, upper = np.quantile(values, [0.025, 0.975])
            result[key][metric] = {"estimate": value, "lower": float(lower), "upper": float(upper), "repetitions": len(values)}
    return result


def plot_capacity(result, output):
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11})
    fig, ax = plt.subplots(figsize=(8.1, 5))
    for method, color, label, offset in (
        ("model", "#20645E", "Modelo bloqueado", -6),
        ("published", "#745064", "Puntaje mexicano", 6),
        ("random", "#666666", "Selección aleatoria (esperada)", 0),
    ):
        items = [result[f"capacity/{c}/{method}"]["detected_per_1000"] for c in CAPACITIES]
        estimates = np.array([row["estimate"] for row in items])
        errors = np.array([[max(0, row["estimate"] - row["lower"]) for row in items], [max(0, row["upper"] - row["estimate"]) for row in items]])
        ax.errorbar(np.array(CAPACITIES)*1000+offset, estimates, yerr=errors, color=color, label=label, marker="o", capsize=4, linestyle="--" if method=="random" else "-")
    ax.set(xlabel="Pruebas iniciales disponibles por 1,000 adultos", ylabel="Alteraciones identificadas por 1,000 adultos", xticks=[200,400,600], ylim=(0,220))
    ax.set_title("Detección con igual capacidad de laboratorio", loc="left", fontweight="bold", pad=14)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", alpha=.2)
    ax.legend(frameon=False, loc="upper left")
    fig.tight_layout()
    fig.savefig(output, dpi=240, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bootstrap-repetitions", type=int, default=1000)
    args = parser.parse_args()
    if args.bootstrap_repetitions < 100:
        raise ValueError("Use at least 100 replicates; manuscript uses 1,000")
    output = config.RESULTS_DIR / "postlock_policy_analysis.json"
    if output.exists():
        raise FileExistsError("Policy output already exists; do not overwrite inspected results")
    lock_path = config.RESULTS_DIR / "model_lock.json"
    primary = config.RESULTS_DIR / "evaluation_2021.json"
    original_hash = run_pipeline.file_sha256(primary)
    lock = json.loads(lock_path.read_text())
    run_pipeline.verify_lock(lock, config.RAW_DATA_DIR, allow_code_drift=False)
    evaluation = json.loads(primary.read_text())
    if evaluation["lock_sha256"] != run_pipeline.file_sha256(lock_path):
        raise ValueError("Primary evaluation does not match model lock")
    experiment = lock["experiments"]["core"]
    model_meta = next(row for row in experiment["models"] if row["family"] == experiment["recommended_family"])
    model = joblib.load(PROJECT_DIR / model_meta["artifact"])
    waves = load_all_waves()
    frame = waves[2021].cohort.reset_index(drop=True)
    probability = predict_probability(model, frame, tuple(experiment["features"]))
    threshold = model_meta["threshold"]
    points = assess(frame, probability, threshold)
    samples = defaultdict(lambda: defaultdict(list))
    for iteration, indices in enumerate(_bootstrap_indices(frame, args.bootstrap_repetitions, SEED), 1):
        values = assess(frame.iloc[indices].reset_index(drop=True), probability[indices], threshold)
        for key, metrics in values.items():
            for metric, value in metrics.items():
                samples[key][metric].append(value)
        if iteration % 200 == 0:
            print(f"Bootstrap {iteration}/{args.bootstrap_repetitions}", flush=True)
    estimates = enrich(points, samples)
    design_sizes = frame.groupby("stratum")["psu"].nunique()
    singleton = frame["stratum"].isin(design_sizes[design_sizes.eq(1)].index)
    common = frame["mexican_score"].notna()
    payload = {
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "status": "exploratory post-lock analysis; model and threshold unchanged",
        "script_sha256": run_pipeline.file_sha256(Path(__file__)),
        "addendum_sha256": run_pipeline.file_sha256(PROJECT_DIR / "POLICY_ANALYSIS_ADDENDUM.md"),
        "primary_evaluation_sha256": original_hash,
        "study_fingerprint": lock["study_fingerprint"],
        "model_artifact_sha256": model_meta["artifact_sha256"],
        "threshold": threshold, "seed": SEED, "bootstrap_repetitions": args.bootstrap_repetitions,
        "n_full": len(frame), "n_common": int(common.sum()), "events_common": int(frame.loc[common, "dysglycemia_fpg"].sum()),
        "common_weighted_prevalence": float(np.average(frame.loc[common, "dysglycemia_fpg"], weights=frame.loc[common, "survey_weight"])),
        "design": {"strata": len(design_sizes), "psus": int(design_sizes.sum()), "singleton_strata": int(design_sizes.eq(1).sum()), "singleton_weight_fraction": float(frame.loc[singleton, "survey_weight"].sum()/frame["survey_weight"].sum())},
        "cohorts": {str(year): {"n": len(wave.cohort), "complete_core": wave.flow["complete_core_predictors"], "weighted_prevalence": float(np.average(wave.cohort["dysglycemia_fpg"], weights=wave.cohort["survey_weight"]))} for year, wave in waves.items()},
        "estimates": estimates,
    }
    if run_pipeline.file_sha256(primary) != original_hash:
        raise RuntimeError("Primary evaluation changed during this analysis")
    dump_json(payload, output)
    rows = [{"scenario": scenario, "metric": metric, **value} for scenario, metrics in estimates.items() for metric, value in metrics.items()]
    pd.DataFrame(rows).to_csv(config.RESULTS_DIR / "policy_metrics_2021.csv", index=False)
    plot_capacity(estimates, config.RESULTS_DIR / "figures" / "capacity_comparison_2021.png")
    print(json.dumps({"output": str(output), "design": payload["design"], "differences": {str(c): estimates[f"difference/{c}"] for c in CAPACITIES}}, indent=2))


if __name__ == "__main__":
    main()
