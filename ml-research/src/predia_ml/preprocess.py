"""Preprocesamiento: selección de features (con control de fuga), split y pipeline."""
from __future__ import annotations

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from . import config


def make_xy(df: pd.DataFrame, mode: str) -> tuple[pd.DataFrame, pd.Series]:
    """Construye X, y eliminando SIEMPRE las columnas de fuga directa."""
    cols = config.feature_columns(mode)
    missing = [c for c in cols + [config.TARGET] if c not in df.columns]
    if missing:
        raise KeyError(f"Columnas ausentes en el dataset: {missing}")
    X = df[cols].copy()
    y = df[config.TARGET].astype(int).copy()
    return X, y


def build_preprocessor(mode: str) -> ColumnTransformer:
    """Pipeline de preprocesamiento: one-hot a categóricas, escalado a numéricas,
    binarias passthrough."""
    numeric = config.numeric_columns(mode)
    return ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", drop="if_binary"), config.CATEGORICAL_COLS),
            ("num", StandardScaler(), numeric),
            ("bin", "passthrough", config.BINARY_COLS),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )


def split(X: pd.DataFrame, y: pd.Series, test_size: float = 0.2):
    """Train/test estratificado y reproducible."""
    return train_test_split(
        X, y, test_size=test_size, stratify=y, random_state=config.SEED
    )
