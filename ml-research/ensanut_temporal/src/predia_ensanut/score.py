"""Published and harmonized Mexican diabetes screening scores."""

from __future__ import annotations

import numpy as np
import pandas as pd


PUBLISHED_SCORE_CUTOFF = 27


def mexican_screening_score(df: pd.DataFrame) -> pd.Series:
    """Return the 0-49 score published by Rojas-Martínez et al. (2024).

    Required canonical fields are female, age, family_diabetes,
    hypertension_screen, obesity and abdominal_obesity_aha. Rows with an
    unknown component return NaN instead of silently treating unknown as no.
    """

    required = (
        "female",
        "age",
        "family_diabetes",
        "hypertension_screen",
        "obesity",
        "abdominal_obesity_aha",
    )
    missing = set(required) - set(df.columns)
    if missing:
        raise KeyError(f"Faltan variables para el puntaje: {sorted(missing)}")

    complete = df.loc[:, required].notna().all(axis=1)
    score = pd.Series(np.nan, index=df.index, dtype=float, name="mexican_score")
    values = (
        4 * df["female"].astype(float)
        + np.select(
            [df["age"] >= 55, df["age"] >= 35],
            [24.0, 12.0],
            default=0.0,
        )
        + 3 * df["family_diabetes"].astype(float)
        + 5 * df["hypertension_screen"].astype(float)
        + 5 * df["obesity"].astype(float)
        + 8 * df["abdominal_obesity_aha"].astype(float)
    )
    score.loc[complete] = values.loc[complete]
    return score

