"""Carga de los datasets BRFSS, auditoría/EDA y helpers epidemiológicos
(prevalencia, odds ratio y riesgo relativo con IC95%)."""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

from . import config


# ----------------------------------------------------------------------------
# Carga
# ----------------------------------------------------------------------------
def _ensure_file(fname: str) -> Path:
    """Devuelve la ruta del CSV; si falta en data/, lo descarga vía kagglehub."""
    p = config.DATA_DIR / fname
    if p.exists():
        return p
    import shutil
    import kagglehub
    src = Path(kagglehub.dataset_download(config.KAGGLE_SLUG)) / fname
    shutil.copy(src, p)
    return p


def load_binary() -> pd.DataFrame:
    return pd.read_csv(_ensure_file(config.FILE_BINARY))


def load_5050() -> pd.DataFrame:
    return pd.read_csv(_ensure_file(config.FILE_5050))


def load_012() -> pd.DataFrame:
    return pd.read_csv(_ensure_file(config.FILE_012))


# ----------------------------------------------------------------------------
# Auditoría / EDA
# ----------------------------------------------------------------------------
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


def audit(df: pd.DataFrame, target: str = config.TARGET) -> dict:
    """Auditoría de estructura, calidad, balance de clases y correlaciones."""
    n_rows, n_cols = df.shape
    nulls = df.isna().sum()
    dup_rows = int(df.duplicated().sum())

    target_counts = {str(int(k)): int(v) for k, v in df[target].value_counts().items()}
    total = sum(target_counts.values())
    target_balance = {k: round(100 * v / total, 3) for k, v in target_counts.items()}
    imbalance_ratio = round(max(target_counts.values()) / min(target_counts.values()), 3)

    # Correlación de Pearson de cada predictor con el objetivo (señal preliminar)
    corr_with_target = {}
    for c in df.columns:
        if c == target:
            continue
        corr_with_target[c] = round(float(df[[c, target]].corr().iloc[0, 1]), 4)
    corr_with_target = dict(sorted(corr_with_target.items(),
                                   key=lambda kv: abs(kv[1]), reverse=True))

    numeric = [c for c in config.NUMERIC_COLS if c in df.columns]
    outliers = {c: _outlier_summary(df[c]) for c in numeric}

    return {
        "shape": {"rows": n_rows, "cols": n_cols},
        "columns": df.columns.tolist(),
        "n_duplicated_rows": dup_rows,
        "pct_duplicated_rows": round(100 * dup_rows / n_rows, 3),
        "total_nulls": int(nulls.sum()),
        "nulls": {c: int(nulls[c]) for c in df.columns},
        "target": {
            "name": target,
            "counts": target_counts,
            "balance_pct": target_balance,
            "imbalance_ratio": imbalance_ratio,
        },
        "corr_with_target": corr_with_target,
        "outliers": outliers,
        "describe": json.loads(df.describe().to_json()),
    }


# ----------------------------------------------------------------------------
# Epidemiología: prevalencia, odds ratio, riesgo relativo
# ----------------------------------------------------------------------------
def two_by_two(exposed_mask: np.ndarray, y: np.ndarray) -> tuple[int, int, int, int]:
    """Tabla 2x2: (a=exp&caso, b=exp&no, c=noexp&caso, d=noexp&no)."""
    e = np.asarray(exposed_mask).astype(bool)
    y = np.asarray(y).astype(bool)
    a = int(np.sum(e & y)); b = int(np.sum(e & ~y))
    c = int(np.sum(~e & y)); d = int(np.sum(~e & ~y))
    return a, b, c, d


def odds_ratio(a, b, c, d, cc: float = 0.5) -> dict:
    """OR con IC95% (Woolf). Aplica corrección de continuidad si hay celdas 0."""
    if min(a, b, c, d) == 0:
        a, b, c, d = a + cc, b + cc, c + cc, d + cc
    or_ = (a * d) / (b * c)
    se = math.sqrt(1 / a + 1 / b + 1 / c + 1 / d)
    lo = math.exp(math.log(or_) - 1.96 * se)
    hi = math.exp(math.log(or_) + 1.96 * se)
    return {"or": round(or_, 3), "ci95": [round(lo, 3), round(hi, 3)]}


def relative_risk(a, b, c, d) -> dict:
    """RR con IC95%. a/b = expuestos caso/no; c/d = no expuestos caso/no."""
    n_exp = a + b
    n_noexp = c + d
    if n_exp == 0 or n_noexp == 0:
        return {"rr": float("nan"), "ci95": [float("nan"), float("nan")]}
    r1 = a / n_exp
    r0 = c / n_noexp
    if r0 == 0 or r1 == 0:
        a2, b2, c2, d2 = a + 0.5, b + 0.5, c + 0.5, d + 0.5
        r1, r0 = a2 / (a2 + b2), c2 / (c2 + d2)
        a, b, c, d = a2, b2, c2, d2
        n_exp, n_noexp = a + b, c + d
    rr = r1 / r0
    se = math.sqrt((1 - r1) / a + (1 - r0) / c)
    lo = math.exp(math.log(rr) - 1.96 * se)
    hi = math.exp(math.log(rr) + 1.96 * se)
    return {"rr": round(rr, 3), "ci95": [round(lo, 3), round(hi, 3)]}


def association_for_binary(df: pd.DataFrame, col: str, target: str = config.TARGET) -> dict:
    """Asociación epidemiológica de una variable binaria con el objetivo."""
    y = df[target].to_numpy()
    exposed = df[col].to_numpy() == 1
    a, b, c, d = two_by_two(exposed, y)
    prev_exposed = a / (a + b) if (a + b) else float("nan")
    prev_unexposed = c / (c + d) if (c + d) else float("nan")
    return {
        "variable": col,
        "prev_exposed": round(prev_exposed, 4),
        "prev_unexposed": round(prev_unexposed, 4),
        **{f"or_{k}": v for k, v in odds_ratio(a, b, c, d).items()},
        **{f"rr_{k}": v for k, v in relative_risk(a, b, c, d).items()},
    }


def save_json(obj: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
