"""Pre-specified model families for temporal validation."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import SplineTransformer, StandardScaler


@dataclass(frozen=True)
class ModelCandidate:
    family: str
    label: str
    parameters: dict[str, float | int]


def candidates() -> tuple[ModelCandidate, ...]:
    result: list[ModelCandidate] = []
    for c_value in (0.05, 0.2, 1.0):
        result.append(
            ModelCandidate(
                family="logistic",
                label=f"Regresión logística (C={c_value:g})",
                parameters={"c": c_value},
            )
        )
    for knots in (3, 4, 5):
        for c_value in (0.1, 1.0):
            result.append(
                ModelCandidate(
                    family="spline_logistic",
                    label=f"Modelo aditivo explicable (nudos={knots}, C={c_value:g})",
                    parameters={"knots": knots, "c": c_value},
                )
            )
    for leaf_nodes in (7, 15):
        for regularization in (1.0, 5.0):
            result.append(
                ModelCandidate(
                    family="monotonic_boosting",
                    label=(
                        "Boosting monotónico "
                        f"(hojas={leaf_nodes}, L2={regularization:g})"
                    ),
                    parameters={
                        "max_leaf_nodes": leaf_nodes,
                        "l2_regularization": regularization,
                    },
                )
            )
    return tuple(result)


def build_model(
    candidate: ModelCandidate,
    features: tuple[str, ...],
    continuous_features: tuple[str, ...],
    seed: int,
) -> Pipeline:
    binary_features = tuple(feature for feature in features if feature not in continuous_features)

    if candidate.family == "logistic":
        return Pipeline(
            [
                ("imputer", SimpleImputer(strategy="median", add_indicator=True)),
                ("scale", StandardScaler()),
                (
                    "model",
                    LogisticRegression(
                        C=float(candidate.parameters["c"]),
                        max_iter=5000,
                        solver="lbfgs",
                        random_state=seed,
                    ),
                ),
            ]
        )

    if candidate.family == "spline_logistic":
        continuous = Pipeline(
            [
                ("imputer", SimpleImputer(strategy="median")),
                (
                    "spline",
                    SplineTransformer(
                        n_knots=int(candidate.parameters["knots"]),
                        degree=2,
                        knots="quantile",
                        include_bias=False,
                    ),
                ),
                ("scale", StandardScaler()),
            ]
        )
        binary = Pipeline(
            [
                ("imputer", SimpleImputer(strategy="most_frequent", add_indicator=True)),
                ("scale", StandardScaler()),
            ]
        )
        return Pipeline(
            [
                (
                    "features",
                    ColumnTransformer(
                        [
                            ("continuous", continuous, list(continuous_features)),
                            ("binary", binary, list(binary_features)),
                        ],
                        remainder="drop",
                    ),
                ),
                (
                    "model",
                    LogisticRegression(
                        C=float(candidate.parameters["c"]),
                        max_iter=5000,
                        solver="lbfgs",
                        random_state=seed,
                    ),
                ),
            ]
        )

    if candidate.family == "monotonic_boosting":
        constraints = np.asarray(
            [0 if feature == "female" else 1 for feature in features], dtype=int
        )
        return Pipeline(
            [
                ("imputer", SimpleImputer(strategy="median")),
                (
                    "model",
                    HistGradientBoostingClassifier(
                        learning_rate=0.05,
                        max_iter=250,
                        max_leaf_nodes=int(candidate.parameters["max_leaf_nodes"]),
                        min_samples_leaf=40,
                        l2_regularization=float(
                            candidate.parameters["l2_regularization"]
                        ),
                        monotonic_cst=constraints,
                        early_stopping=False,
                        random_state=seed,
                    ),
                ),
            ]
        )

    raise ValueError(f"Familia no soportada: {candidate.family}")


def fit_model(
    model: Pipeline,
    frame: pd.DataFrame,
    features: tuple[str, ...],
    outcome: str,
    sample_weight: np.ndarray,
) -> Pipeline:
    model.fit(
        frame.loc[:, features],
        frame[outcome].astype(int),
        model__sample_weight=sample_weight,
    )
    return model


def predict_probability(
    model: Pipeline, frame: pd.DataFrame, features: tuple[str, ...]
) -> np.ndarray:
    return model.predict_proba(frame.loc[:, features])[:, 1]

