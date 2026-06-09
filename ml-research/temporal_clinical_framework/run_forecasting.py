"""FASE 2G — Predicción de tendencia futura (Glucosa/IMC/Riesgo/CES en t+1)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_temporal import config, forecasting, plots  # noqa: E402


def main():
    df = pd.read_csv(config.DATASETS_DIR / "cohort_long.csv")
    ces_tl = pd.read_csv(config.DATASETS_DIR / "ces_timeline.csv")

    targets = {}
    for key in ["glucosa", "imc", "riesgo"]:
        targets[key] = forecasting.series_by_patient(df, key)
    # CES como serie por paciente (de su timeline)
    ces_series = {}
    for pid, grp in ces_tl.groupby("patient_id"):
        g = grp.sort_values("t_days")
        ces_series[pid] = (g["t_days"].to_numpy(), g["ces"].to_numpy())
    targets["ces"] = ces_series

    all_res = {}
    for tgt, sbp in targets.items():
        table = forecasting.make_lag_table(sbp)
        res = forecasting.evaluate(table)
        hw = forecasting.holt_winters_baseline(sbp)
        if hw:
            res["Holt-Winters (statsmodels)"] = hw
        all_res[tgt] = res

    with open(config.METRICS_DIR / "forecasting.json", "w", encoding="utf-8") as f:
        json.dump(all_res, f, ensure_ascii=False, indent=1)
    plots.plot_forecast_rmse(all_res, config.fig_dir("forecasting") / "forecast_rmse.png")

    print("=== Forecasting one-step (RMSE / MAE / MAPE / R²) ===")
    for tgt, res in all_res.items():
        print(f"\n# {tgt}")
        tab = pd.DataFrame(res).T[["rmse", "mae", "mape", "r2"]].round(3)
        print(tab.sort_values("rmse").to_string())


if __name__ == "__main__":
    main()
