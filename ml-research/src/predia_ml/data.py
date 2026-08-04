"""Carga y auditoría automática del dataset."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from . import config


def load_raw() -> pd.DataFrame:
    """Carga el dataset crudo exactamente como está en el repo."""
    return pd.read_csv(config.DATASET_PATH)


def _outlier_summary(s: pd.Series) -> dict:
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    n_out = int(((s < lo) | (s > hi)).sum())
    return {
        "q1": float(q1), "q3": float(q3), "iqr": float(iqr),
        "lower_fence": float(lo), "upper_fence": float(hi),
        "n_outliers": n_out, "pct_outliers": round(100 * n_out / len(s), 3),
        "min": float(s.min()), "max": float(s.max()),
        "mean": float(s.mean()), "std": float(s.std()),
    }


def audit(df: pd.DataFrame) -> dict:
    """Auditoría completa de estructura y calidad de datos."""
    n_rows, n_cols = df.shape
    numeric = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical = df.select_dtypes(exclude=[np.number]).columns.tolist()

    nulls = df.isna().sum()
    dup_rows = int(df.duplicated().sum())

    cardinality = {c: int(df[c].nunique(dropna=False)) for c in df.columns}

    outliers = {c: _outlier_summary(df[c]) for c in numeric}

    # Balance de clases del objetivo
    target_counts = df[config.TARGET].value_counts(dropna=False).to_dict()
    target_counts = {str(k): int(v) for k, v in target_counts.items()}
    total = sum(target_counts.values())
    target_balance = {k: round(100 * v / total, 3) for k, v in target_counts.items()}
    minority = min(target_counts.values()) / total
    imbalance_ratio = round(max(target_counts.values()) / min(target_counts.values()), 3)

    # Correlación de numéricas con el objetivo (Pearson) — señal de fuga
    corr_with_target = {}
    if config.TARGET in numeric:
        for c in numeric:
            if c == config.TARGET:
                continue
            corr_with_target[c] = round(float(df[[c, config.TARGET]].corr().iloc[0, 1]), 4)
    corr_with_target = dict(sorted(corr_with_target.items(), key=lambda kv: abs(kv[1]), reverse=True))

    return {
        "shape": {"rows": n_rows, "cols": n_cols},
        "columns": df.columns.tolist(),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "numeric_cols": numeric,
        "categorical_cols": categorical,
        "n_duplicated_rows": dup_rows,
        "nulls": {c: int(nulls[c]) for c in df.columns},
        "total_nulls": int(nulls.sum()),
        "cardinality": cardinality,
        "categorical_values": {
            c: {str(k): int(v) for k, v in df[c].value_counts(dropna=False).items()}
            for c in categorical
        },
        "target": {
            "name": config.TARGET,
            "counts": target_counts,
            "balance_pct": target_balance,
            "minority_fraction": round(minority, 4),
            "imbalance_ratio": imbalance_ratio,
        },
        "outliers": outliers,
        "abs_corr_with_target": corr_with_target,
        "describe": json.loads(df[numeric].describe().to_json()),
    }


def save_json(obj: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
