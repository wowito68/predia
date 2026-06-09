"""FASE 2B — Construye la matriz de features temporales (incl. rolling windows)."""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_temporal import config, features  # noqa: E402


def main():
    df = pd.read_csv(config.DATASETS_DIR / "cohort_long.csv")
    fm = features.build_feature_matrix(df)
    fm.to_csv(config.DATASETS_DIR / "features.csv", index=False)
    print(f"=== Features temporales: {fm.shape[0]} pacientes × {fm.shape[1]} columnas ===")
    print(f"Ventanas rolling: {config.ROLLING_WINDOWS_DAYS} días")
    sample_cols = [c for c in fm.columns if c.startswith("glucosa_")][:14]
    print("Ejemplo de features de glucosa:", sample_cols)
    print(fm[["archetype"] + [c for c in ["glucosa_slope_m", "glucosa_w30_slope_m",
          "imc_slope_m", "riesgo_current"] if c in fm.columns]].groupby("archetype").mean().round(3).to_string())


if __name__ == "__main__":
    main()
