"""Preprocesamiento BRFSS: pipeline (escalado de ordinales/continuas, binarias
passthrough) y split estratificado train/val/test = 60/20/20."""
from __future__ import annotations

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from . import config


def make_xy(df: pd.DataFrame, target: str = config.TARGET) -> tuple[pd.DataFrame, pd.Series]:
    cols = config.feature_columns()
    missing = [c for c in cols + [target] if c not in df.columns]
    if missing:
        raise KeyError(f"Columnas ausentes: {missing}")
    return df[cols].copy(), df[target].astype(int).copy()


def build_preprocessor() -> ColumnTransformer:
    """Escala numéricas/ordinales; deja binarias 0/1 intactas."""
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), config.NUMERIC_COLS),
            ("bin", "passthrough", config.BINARY_COLS),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )


def split_train_val_test(X, y, val_size: float = 0.2, test_size: float = 0.2):
    """Split estratificado 60/20/20 reproducible.

    Devuelve (X_train, X_val, X_test, y_train, y_val, y_test).
    """
    X_tmp, X_test, y_tmp, y_test = train_test_split(
        X, y, test_size=test_size, stratify=y, random_state=config.SEED
    )
    # val relativo al resto para que sea el 20% del total
    rel_val = val_size / (1.0 - test_size)
    X_train, X_val, y_train, y_val = train_test_split(
        X_tmp, y_tmp, test_size=rel_val, stratify=y_tmp, random_state=config.SEED
    )
    return X_train, X_val, X_test, y_train, y_val, y_test
