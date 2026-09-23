"""Survey-weighted performance, calibration and clinical utility metrics."""

from __future__ import annotations

from collections.abc import Iterable

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.special import expit
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score


EPSILON = 1e-7


def normalize_training_weights(frame: pd.DataFrame) -> np.ndarray:
    """Give each survey wave equal aggregate influence during pooled training."""
    weights = frame["survey_weight"].astype(float)
    wave_totals = weights.groupby(frame["wave"]).transform("sum")
    normalized = weights / wave_totals
    normalized *= len(frame) / frame["wave"].nunique()
    return normalized.to_numpy()


def weighted_prevalence(y: Iterable[float], sample_weight: Iterable[float]) -> float:
    return float(np.average(np.asarray(y, dtype=float), weights=sample_weight))


def calibration_parameters(
    y_true: Iterable[int],
    probability: Iterable[float],
    sample_weight: Iterable[float],
) -> tuple[float, float]:
    """Estimate calibration intercept and slope on the logit scale."""
    y = np.asarray(y_true, dtype=float)
    p = np.clip(np.asarray(probability, dtype=float), EPSILON, 1 - EPSILON)
    weights = np.asarray(sample_weight, dtype=float)
    logits = np.log(p / (1 - p))

    def objective(parameters: np.ndarray) -> float:
        intercept, slope = parameters
        fitted = np.clip(expit(intercept + slope * logits), EPSILON, 1 - EPSILON)
        loss = -(y * np.log(fitted) + (1 - y) * np.log(1 - fitted))
        return float(np.average(loss, weights=weights))

    fit = minimize(
        objective,
        x0=np.array([0.0, 1.0]),
        method="BFGS",
        options={"gtol": 1e-8, "maxiter": 500},
    )
    if not fit.success and not np.isfinite(fit.fun):
        return float("nan"), float("nan")
    return float(fit.x[0]), float(fit.x[1])


def expected_calibration_error(
    y_true: Iterable[int],
    probability: Iterable[float],
    sample_weight: Iterable[float],
    bins: int = 10,
) -> float:
    y = np.asarray(y_true, dtype=float)
    p = np.asarray(probability, dtype=float)
    weights = np.asarray(sample_weight, dtype=float)
    bin_ids = np.minimum((p * bins).astype(int), bins - 1)
    total_weight = weights.sum()
    ece = 0.0
    for bin_id in range(bins):
        mask = bin_ids == bin_id
        if not mask.any():
            continue
        bin_weight = weights[mask].sum()
        observed = np.average(y[mask], weights=weights[mask])
        predicted = np.average(p[mask], weights=weights[mask])
        ece += (bin_weight / total_weight) * abs(observed - predicted)
    return float(ece)


def select_threshold_for_sensitivity(
    y_true: Iterable[int],
    probability: Iterable[float],
    sample_weight: Iterable[float],
    target_sensitivity: float = 0.80,
) -> float:
    """Choose the highest-specificity threshold meeting target sensitivity."""
    y = np.asarray(y_true, dtype=int)
    p = np.asarray(probability, dtype=float)
    weights = np.asarray(sample_weight, dtype=float)
    candidates = np.unique(np.r_[0.0, p, 1.0])
    best_threshold = 0.0
    best_specificity = -1.0
    for threshold in candidates:
        metrics = operating_point(y, p, weights, float(threshold))
        if metrics["sensitivity"] + 1e-12 < target_sensitivity:
            continue
        if metrics["specificity"] > best_specificity:
            best_specificity = metrics["specificity"]
            best_threshold = float(threshold)
    return best_threshold


def operating_point(
    y_true: Iterable[int],
    probability: Iterable[float],
    sample_weight: Iterable[float],
    threshold: float,
) -> dict[str, float]:
    y = np.asarray(y_true, dtype=int)
    p = np.asarray(probability, dtype=float)
    weights = np.asarray(sample_weight, dtype=float)
    predicted = p >= threshold

    tp = float(weights[(predicted) & (y == 1)].sum())
    fp = float(weights[(predicted) & (y == 0)].sum())
    tn = float(weights[(~predicted) & (y == 0)].sum())
    fn = float(weights[(~predicted) & (y == 1)].sum())
    total = tp + fp + tn + fn

    def ratio(numerator: float, denominator: float) -> float:
        return numerator / denominator if denominator else float("nan")

    referrals = tp + fp
    return {
        "threshold": float(threshold),
        "sensitivity": ratio(tp, tp + fn),
        "specificity": ratio(tn, tn + fp),
        "ppv": ratio(tp, tp + fp),
        "npv": ratio(tn, tn + fn),
        "accuracy": ratio(tp + tn, total),
        "referral_fraction": ratio(referrals, total),
        "cases_detected_per_1000": 1000 * ratio(tp, total),
        "tests_per_case_detected": ratio(referrals, tp),
    }


def evaluate_predictions(
    y_true: Iterable[int],
    probability: Iterable[float],
    sample_weight: Iterable[float],
    threshold: float,
) -> dict[str, float]:
    y = np.asarray(y_true, dtype=int)
    p = np.asarray(probability, dtype=float)
    weights = np.asarray(sample_weight, dtype=float)
    intercept, slope = calibration_parameters(y, p, weights)
    return {
        "n": int(len(y)),
        "events": int(y.sum()),
        "weighted_prevalence": weighted_prevalence(y, weights),
        "roc_auc": float(roc_auc_score(y, p, sample_weight=weights)),
        "pr_auc": float(average_precision_score(y, p, sample_weight=weights)),
        "brier": float(brier_score_loss(y, p, sample_weight=weights)),
        "calibration_intercept": intercept,
        "calibration_slope": slope,
        "ece_10": expected_calibration_error(y, p, weights),
        **operating_point(y, p, weights, threshold),
    }


def evaluate_ranking_score(
    y_true: Iterable[int],
    score: Iterable[float],
    sample_weight: Iterable[float],
    cutoff: float,
) -> dict[str, float]:
    """Evaluate a point score without pretending it is a calibrated probability."""
    y = np.asarray(y_true, dtype=int)
    values = np.asarray(score, dtype=float)
    weights = np.asarray(sample_weight, dtype=float)
    return {
        "n": int(len(y)),
        "events": int(y.sum()),
        "weighted_prevalence": weighted_prevalence(y, weights),
        "roc_auc": float(roc_auc_score(y, values, sample_weight=weights)),
        "pr_auc": float(average_precision_score(y, values, sample_weight=weights)),
        **operating_point(y, values, weights, cutoff),
    }


def discrimination_metrics(
    y_true: Iterable[int],
    score: Iterable[float],
    sample_weight: Iterable[float],
) -> dict[str, float]:
    """Evaluate ranking only when a score is not calibrated for this outcome."""
    y = np.asarray(y_true, dtype=int)
    values = np.asarray(score, dtype=float)
    weights = np.asarray(sample_weight, dtype=float)
    return {
        "n": int(len(y)),
        "events": int(y.sum()),
        "weighted_prevalence": weighted_prevalence(y, weights),
        "roc_auc": float(roc_auc_score(y, values, sample_weight=weights)),
        "pr_auc": float(average_precision_score(y, values, sample_weight=weights)),
    }


def decision_curve(
    y_true: Iterable[int],
    probability: Iterable[float],
    sample_weight: Iterable[float],
    thresholds: Iterable[float] | None = None,
) -> pd.DataFrame:
    y = np.asarray(y_true, dtype=int)
    p = np.asarray(probability, dtype=float)
    weights = np.asarray(sample_weight, dtype=float)
    total = weights.sum()
    prevalence = weighted_prevalence(y, weights)
    values = thresholds or np.linspace(0.05, 0.50, 46)
    rows = []
    for threshold in values:
        predicted = p >= threshold
        tp = weights[predicted & (y == 1)].sum() / total
        fp = weights[predicted & (y == 0)].sum() / total
        odds = threshold / (1 - threshold)
        rows.append(
            {
                "threshold": float(threshold),
                "model": float(tp - fp * odds),
                "treat_all": float(prevalence - (1 - prevalence) * odds),
                "treat_none": 0.0,
            }
        )
    return pd.DataFrame(rows)


def subgroup_metrics(
    frame: pd.DataFrame,
    probability: np.ndarray,
    outcome: str,
    threshold: float,
    min_n: int = 100,
    min_events: int = 20,
) -> pd.DataFrame:
    work = frame.copy()
    work["probability"] = probability
    work["age_group"] = pd.cut(
        work["age"],
        bins=[19, 34, 54, np.inf],
        labels=["20-34", "35-54", "55+"],
    )
    work["sex_group"] = work["female"].map({0.0: "Hombre", 1.0: "Mujer"})
    work["area_group"] = work["rural"].map({0.0: "Urbana/metropolitana", 1.0: "Rural"})

    rows: list[dict[str, object]] = []
    for dimension in ("sex_group", "age_group", "area_group"):
        for label, group in work.groupby(dimension, observed=True, dropna=True):
            y = group[outcome].astype(int).to_numpy()
            if len(group) < min_n or int(y.sum()) < min_events or len(np.unique(y)) < 2:
                continue
            metrics = evaluate_predictions(
                y,
                group["probability"].to_numpy(),
                group["survey_weight"].to_numpy(),
                threshold,
            )
            rows.append({"dimension": dimension, "group": str(label), **metrics})
    return pd.DataFrame(rows)


def cluster_bootstrap_ci(
    frame: pd.DataFrame,
    probability: np.ndarray,
    outcome: str,
    threshold: float,
    repetitions: int,
    seed: int,
) -> dict[str, dict[str, float]]:
    """Approximate uncertainty by resampling PSUs within survey strata."""
    if repetitions <= 0:
        return {}

    work = frame.reset_index(drop=True).copy()
    work["probability"] = np.asarray(probability, dtype=float)
    work["_stratum"] = work["stratum"].fillna("unknown").astype(str)
    work["_psu"] = work["psu"].fillna(work["person_id"]).astype(str)
    rng = np.random.default_rng(seed)
    samples: list[dict[str, float]] = []

    strata = []
    for _, group in work.groupby("_stratum", sort=False):
        psu_to_indices = {
            psu: indices.to_numpy()
            for psu, indices in group.groupby("_psu", sort=False).groups.items()
        }
        strata.append(psu_to_indices)

    for _ in range(repetitions):
        sampled_indices: list[np.ndarray] = []
        for psu_to_indices in strata:
            psus = np.asarray(list(psu_to_indices), dtype=object)
            draws = rng.choice(psus, size=len(psus), replace=True)
            sampled_indices.extend(psu_to_indices[psu] for psu in draws)
        indices = np.concatenate(sampled_indices)
        sample = work.iloc[indices]
        y = sample[outcome].astype(int).to_numpy()
        if len(np.unique(y)) < 2:
            continue
        samples.append(
            evaluate_predictions(
                y,
                sample["probability"].to_numpy(),
                sample["survey_weight"].to_numpy(),
                threshold,
            )
        )

    if not samples:
        return {}
    metrics = (
        "roc_auc",
        "pr_auc",
        "brier",
        "calibration_intercept",
        "calibration_slope",
        "sensitivity",
        "specificity",
        "ppv",
        "npv",
        "referral_fraction",
        "cases_detected_per_1000",
        "tests_per_case_detected",
    )
    result: dict[str, dict[str, float]] = {}
    for metric in metrics:
        values = np.asarray([sample[metric] for sample in samples], dtype=float)
        values = values[np.isfinite(values)]
        if values.size:
            lower, upper = np.quantile(values, [0.025, 0.975])
            result[metric] = {
                "lower": float(lower),
                "upper": float(upper),
                "repetitions": int(values.size),
            }
    return result


def cluster_bootstrap_auc_difference(
    frame: pd.DataFrame,
    score_a: np.ndarray,
    score_b: np.ndarray,
    outcome: str,
    repetitions: int,
    seed: int,
) -> dict[str, float | int]:
    """Paired survey-cluster bootstrap for the difference AUC(a) - AUC(b)."""
    work = frame.reset_index(drop=True).copy()
    work["score_a"] = np.asarray(score_a, dtype=float)
    work["score_b"] = np.asarray(score_b, dtype=float)
    work["_stratum"] = work["stratum"].fillna("unknown").astype(str)
    work["_psu"] = work["psu"].fillna(work["person_id"]).astype(str)

    y = work[outcome].astype(int).to_numpy()
    weights = work["survey_weight"].to_numpy()
    point = float(
        roc_auc_score(y, work["score_a"], sample_weight=weights)
        - roc_auc_score(y, work["score_b"], sample_weight=weights)
    )
    if repetitions <= 0:
        return {"estimate": point, "repetitions": 0}

    strata = []
    for _, group in work.groupby("_stratum", sort=False):
        strata.append(
            {
                psu: indices.to_numpy()
                for psu, indices in group.groupby("_psu", sort=False).groups.items()
            }
        )

    rng = np.random.default_rng(seed)
    differences = []
    for _ in range(repetitions):
        sampled_indices: list[np.ndarray] = []
        for psu_to_indices in strata:
            psus = np.asarray(list(psu_to_indices), dtype=object)
            draws = rng.choice(psus, size=len(psus), replace=True)
            sampled_indices.extend(psu_to_indices[psu] for psu in draws)
        sample = work.iloc[np.concatenate(sampled_indices)]
        sample_y = sample[outcome].astype(int).to_numpy()
        if len(np.unique(sample_y)) < 2:
            continue
        sample_weight = sample["survey_weight"].to_numpy()
        differences.append(
            roc_auc_score(sample_y, sample["score_a"], sample_weight=sample_weight)
            - roc_auc_score(sample_y, sample["score_b"], sample_weight=sample_weight)
        )

    values = np.asarray(differences, dtype=float)
    if not values.size:
        return {"estimate": point, "repetitions": 0}
    lower, upper = np.quantile(values, [0.025, 0.975])
    return {
        "estimate": point,
        "lower": float(lower),
        "upper": float(upper),
        "repetitions": int(values.size),
    }
