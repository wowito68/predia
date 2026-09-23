"""Publication-oriented figures and a concise generated technical report."""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from .metrics import decision_curve


COLORS = {
    "navy": "#18344A",
    "teal": "#287B78",
    "amber": "#B67A28",
    "rose": "#A9535A",
    "blue_gray": "#60798A",
    "light": "#E8EDF0",
    "muted": "#6D7880",
}


def _style() -> None:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "font.size": 10,
            "axes.titlesize": 13,
            "axes.labelsize": 10,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "axes.edgecolor": "#AAB4BA",
            "axes.linewidth": 0.8,
            "grid.color": "#DDE3E6",
            "grid.linewidth": 0.7,
            "figure.facecolor": "white",
            "axes.facecolor": "white",
            "savefig.facecolor": "white",
        }
    )


def weighted_calibration_table(
    frame: pd.DataFrame,
    probability: np.ndarray,
    outcome: str,
    bins: int = 10,
) -> pd.DataFrame:
    work = pd.DataFrame(
        {
            "y": frame[outcome].astype(int).to_numpy(),
            "p": probability,
            "w": frame["survey_weight"].to_numpy(),
        }
    )
    work["bin"] = pd.qcut(work["p"], q=bins, duplicates="drop")
    rows = []
    for _, group in work.groupby("bin", observed=True):
        rows.append(
            {
                "predicted": float(np.average(group["p"], weights=group["w"])),
                "observed": float(np.average(group["y"], weights=group["w"])),
                "n": int(len(group)),
                "weight": float(group["w"].sum()),
            }
        )
    return pd.DataFrame(rows)


def plot_cohort_flow(flow: dict[str, dict[str, int]], output: Path) -> None:
    _style()
    years = list(flow)
    biomarker = [flow[year]["biomarker_rows"] for year in years]
    eligible = [flow[year]["valid_fasting_glucose"] for year in years]
    complete = [flow[year]["complete_core_predictors"] for year in years]
    positions = np.arange(len(years))
    width = 0.24

    fig, axis = plt.subplots(figsize=(8.4, 4.6))
    axis.bar(positions - width, biomarker, width, label="Biomarcador disponible", color=COLORS["blue_gray"])
    axis.bar(positions, eligible, width, label="Cohorte elegible", color=COLORS["teal"])
    axis.bar(positions + width, complete, width, label="Predictores núcleo completos", color=COLORS["amber"])
    axis.set_xticks(positions, years)
    axis.set_ylabel("Participantes")
    axis.set_title("Construcción de la cohorte por ola ENSANUT", loc="left", fontweight="bold")
    axis.grid(axis="y", alpha=0.8)
    axis.legend(frameon=False, ncols=3, fontsize=8, loc="upper right")
    axis.set_axisbelow(True)
    fig.tight_layout()
    fig.savefig(output, dpi=220, bbox_inches="tight")
    plt.close(fig)


def plot_validation_models(development: dict, output: Path) -> None:
    _style()
    experiments = development["experiments"]
    rows = []
    for experiment_name, experiment in experiments.items():
        for finalist in experiment["finalists"]:
            rows.append(
                {
                    "experiment": experiment_name,
                    "model": finalist["family"],
                    "auc": finalist["validation"]["roc_auc"],
                    "brier": finalist["validation"]["brier"],
                    "recommended": finalist["family"] == experiment["recommended_family"],
                }
            )
    data = pd.DataFrame(rows)
    labels = {
        "logistic": "Logística",
        "spline_logistic": "Aditivo explicable",
        "monotonic_boosting": "Boosting monotónico",
    }
    experiments_labels = {"core": "Núcleo", "enhanced": "Clínico ampliado"}

    fig, axes = plt.subplots(1, 2, figsize=(10, 4.5))
    for axis, metric, title, lower_is_better in (
        (axes[0], "auc", "Discriminación en ENSANUT 2018", False),
        (axes[1], "brier", "Error probabilístico en ENSANUT 2018", True),
    ):
        pivot = data.pivot(index="model", columns="experiment", values=metric)
        pivot = pivot.reindex(["logistic", "spline_logistic", "monotonic_boosting"])
        x = np.arange(len(pivot))
        for offset, experiment_name, color in (
            (-0.18, "core", COLORS["navy"]),
            (0.18, "enhanced", COLORS["teal"]),
        ):
            axis.bar(
                x + offset,
                pivot[experiment_name],
                width=0.34,
                label=experiments_labels[experiment_name],
                color=color,
            )
        axis.set_xticks(x, [labels[index] for index in pivot.index], rotation=15, ha="right")
        axis.set_title(title, loc="left", fontweight="bold")
        axis.set_ylabel("Brier (menor es mejor)" if lower_is_better else "ROC-AUC")
        axis.grid(axis="y")
        axis.set_axisbelow(True)
    axes[0].legend(frameon=False)
    fig.tight_layout()
    fig.savefig(output, dpi=220, bbox_inches="tight")
    plt.close(fig)


def plot_temporal_evaluation(
    evaluation: dict,
    output: Path,
) -> None:
    _style()
    rows = []
    for experiment_name, experiment in evaluation["experiments"].items():
        for finalist in experiment["models"]:
            rows.append(
                {
                    "experiment": experiment_name,
                    "model": finalist["family"],
                    "auc": finalist["test"]["roc_auc"],
                    "lower": finalist.get("bootstrap_ci", {}).get("roc_auc", {}).get("lower", np.nan),
                    "upper": finalist.get("bootstrap_ci", {}).get("roc_auc", {}).get("upper", np.nan),
                }
            )
    data = pd.DataFrame(rows)
    model_labels = {
        "logistic": "Logística",
        "spline_logistic": "Aditivo",
        "monotonic_boosting": "Boosting",
    }
    experiment_labels = {"core": "Núcleo", "enhanced": "Ampliado"}
    data["label"] = data.apply(
        lambda row: f"{experiment_labels[row['experiment']]} · {model_labels[row['model']]}",
        axis=1,
    )
    data = data.sort_values("auc")
    y = np.arange(len(data))
    errors = np.vstack(
        (
            np.maximum(0.0, data["auc"] - data["lower"]),
            np.maximum(0.0, data["upper"] - data["auc"]),
        )
    )

    fig, axis = plt.subplots(figsize=(7.8, 4.8))
    axis.errorbar(
        data["auc"],
        y,
        xerr=errors,
        fmt="o",
        color=COLORS["navy"],
        ecolor=COLORS["blue_gray"],
        capsize=4,
        markersize=7,
    )
    axis.set_yticks(y, data["label"])
    axis.set_xlabel("ROC-AUC ponderada (IC95% por bootstrap de UPM)")
    axis.set_title("Evaluación temporal bloqueada · ENSANUT 2021", loc="left", fontweight="bold")
    axis.grid(axis="x")
    axis.set_axisbelow(True)
    left = max(0.5, float(np.nanmin(data["lower"])) - 0.03)
    right = min(1.0, float(np.nanmax(data["upper"])) + 0.03)
    axis.set_xlim(left, right)
    fig.tight_layout()
    fig.savefig(output, dpi=220, bbox_inches="tight")
    plt.close(fig)


def plot_calibration(
    frame: pd.DataFrame,
    probability: np.ndarray,
    outcome: str,
    output: Path,
) -> pd.DataFrame:
    _style()
    calibration = weighted_calibration_table(frame, probability, outcome)
    fig, axis = plt.subplots(figsize=(5.4, 5.0))
    axis.plot([0, 1], [0, 1], linestyle="--", color=COLORS["muted"], label="Calibración ideal")
    axis.plot(
        calibration["predicted"],
        calibration["observed"],
        marker="o",
        linewidth=2,
        color=COLORS["teal"],
        label="PREDIA",
    )
    axis.set_xlabel("Riesgo medio predicho")
    axis.set_ylabel("Frecuencia ponderada observada")
    axis.set_title("Calibración temporal · ENSANUT 2021", loc="left", fontweight="bold")
    limit = max(0.45, calibration[["predicted", "observed"]].to_numpy().max() + 0.04)
    axis.set_xlim(0, limit)
    axis.set_ylim(0, limit)
    axis.grid()
    axis.legend(frameon=False)
    axis.set_axisbelow(True)
    fig.tight_layout()
    fig.savefig(output, dpi=220, bbox_inches="tight")
    plt.close(fig)
    return calibration


def plot_decision_utility(
    frame: pd.DataFrame,
    probability: np.ndarray,
    outcome: str,
    output: Path,
) -> pd.DataFrame:
    _style()
    curve = decision_curve(
        frame[outcome].astype(int), probability, frame["survey_weight"]
    )
    fig, axis = plt.subplots(figsize=(7.2, 4.6))
    axis.plot(curve["threshold"], curve["model"], color=COLORS["teal"], linewidth=2.3, label="PREDIA")
    axis.plot(curve["threshold"], curve["treat_all"], color=COLORS["rose"], linewidth=1.5, label="Enviar a todos")
    axis.plot(curve["threshold"], curve["treat_none"], color=COLORS["muted"], linewidth=1.3, label="No enviar a nadie")
    axis.set_xlabel("Umbral de riesgo")
    axis.set_ylabel("Beneficio neto")
    axis.set_title("Utilidad de decisión · ENSANUT 2021", loc="left", fontweight="bold")
    axis.grid()
    axis.legend(frameon=False, ncols=3, fontsize=8)
    axis.set_axisbelow(True)
    fig.tight_layout()
    fig.savefig(output, dpi=220, bbox_inches="tight")
    plt.close(fig)
    return curve


def plot_subgroups(subgroups: pd.DataFrame, output: Path) -> None:
    _style()
    if subgroups.empty:
        return
    data = subgroups.copy().sort_values(["dimension", "roc_auc"])
    labels = {
        "sex_group": "Sexo",
        "age_group": "Edad",
        "area_group": "Área",
    }
    data["label"] = data.apply(
        lambda row: f"{labels.get(row['dimension'], row['dimension'])}: {row['group']}",
        axis=1,
    )
    colors = data["dimension"].map(
        {
            "sex_group": COLORS["navy"],
            "age_group": COLORS["teal"],
            "area_group": COLORS["amber"],
        }
    )
    y = np.arange(len(data))
    fig, axis = plt.subplots(figsize=(7.2, 4.8))
    axis.scatter(data["roc_auc"], y, s=52, c=colors)
    axis.set_yticks(y, data["label"])
    axis.set_xlabel("ROC-AUC ponderada")
    axis.set_title("Desempeño por subgrupos · ENSANUT 2021", loc="left", fontweight="bold")
    axis.grid(axis="x")
    axis.set_axisbelow(True)
    axis.set_xlim(max(0.45, data["roc_auc"].min() - 0.05), min(1.0, data["roc_auc"].max() + 0.05))
    fig.tight_layout()
    fig.savefig(output, dpi=220, bbox_inches="tight")
    plt.close(fig)


def build_technical_report(
    development: dict,
    evaluation: dict,
    output: Path,
) -> None:
    core = evaluation["experiments"]["core"]
    selected_family = core["recommended_family"]
    selected = next(model for model in core["models"] if model["family"] == selected_family)
    test = selected["test"]
    ci = selected["bootstrap_ci"]
    development_core = development["experiments"]["core"]
    selected_validation = next(
        model for model in development_core["finalists"] if model["family"] == selected_family
    )["validation"]
    complete_case = selected["complete_case_test"]
    comparisons = evaluation["paired_auc_comparisons"]
    score_comparison = comparisons["core_minus_published_score_auc_common_sample"]
    enhanced_comparison = comparisons["enhanced_minus_core_auc"]

    def metric(name: str, digits: int = 3) -> str:
        value = test[name]
        interval = ci.get(name)
        if interval:
            return f"{value:.{digits}f} (IC95% {interval['lower']:.{digits}f}-{interval['upper']:.{digits}f})"
        return f"{value:.{digits}f}"

    lines = [
        "# Informe técnico preliminar ENSANUT-PREDIA",
        "",
        f"Huella del estudio: `{development['study_fingerprint']}`",
        "",
        "## Diseño ejecutado",
        "",
        "Se entrenaron modelos únicamente con ENSANUT 2012 y 2016. ENSANUT 2018 se utilizó para seleccionar hiperparámetros y un umbral con sensibilidad objetivo de 80%. Después se bloquearon código, artefactos y umbrales antes de evaluar ENSANUT Continua 2021.",
        "",
        "El desenlace primario fue disglucemia no diagnosticada definida por glucosa plasmática en ayuno >=100 mg/dL. Se excluyeron diagnóstico previo de diabetes, embarazo actual, ayuno insuficiente cuando se disponía de la variable y ponderadores no válidos.",
        "",
        "## Cohortes",
        "",
    ]
    for year, flow in development["cohort_flow"].items():
        lines.append(
            f"- ENSANUT {year}: {flow['valid_fasting_glucose']:,} participantes elegibles; {flow['complete_core_predictors']:,} con predictores núcleo completos."
        )
    flow_2021 = evaluation["cohort_flow"]["2021"]
    lines.append(
        f"- ENSANUT 2021: {flow_2021['valid_fasting_glucose']:,} participantes elegibles; {flow_2021['complete_core_predictors']:,} con predictores núcleo completos."
    )
    lines.extend(
        [
            "",
            "## Selección previa a la prueba",
            "",
            f"El modelo núcleo recomendado con datos de 2018 fue `{selected_family}`: ROC-AUC {selected_validation['roc_auc']:.3f}, Brier {selected_validation['brier']:.3f} y umbral bloqueado {selected_validation['threshold']:.4f}.",
            "",
            "## Evaluación temporal 2021",
            "",
            f"- ROC-AUC: {metric('roc_auc')}.",
            f"- PR-AUC: {metric('pr_auc')}.",
            f"- Brier score: {metric('brier')}.",
            f"- Pendiente de calibración: {metric('calibration_slope')}.",
            f"- Sensibilidad: {metric('sensitivity')}.",
            f"- Especificidad: {metric('specificity')}.",
            f"- VPP: {metric('ppv')}.",
            f"- VPN: {metric('npv')}.",
            f"- Remisión a laboratorio: {metric('referral_fraction')}.",
            f"- Pruebas por caso detectado: {metric('tests_per_case_detected', 2)}.",
            "",
            "## Análisis de sensibilidad y comparaciones",
            "",
            f"En casos completos (n={complete_case['n']:,}), el ROC-AUC fue {complete_case['roc_auc']:.3f} y el Brier {complete_case['brier']:.3f}.",
            "",
            (
                "La diferencia emparejada de ROC-AUC entre el modelo núcleo y el "
                f"puntaje mexicano publicado fue {score_comparison['estimate']:.3f} "
                f"(IC95% {score_comparison['lower']:.3f}-{score_comparison['upper']:.3f}) "
                "en participantes con ambos puntajes disponibles."
            ),
            (
                "La diferencia emparejada de ROC-AUC entre el modelo ampliado y el "
                f"núcleo fue {enhanced_comparison['estimate']:.3f} "
                f"(IC95% {enhanced_comparison['lower']:.3f}-{enhanced_comparison['upper']:.3f})."
            ),
            "",
            "Los desenlaces secundarios se presentan como discriminación, no como calibración, porque las probabilidades fueron entrenadas para el desenlace primario.",
            "",
            "## Interpretación permitida",
            "",
            "Estos resultados estiman transporte temporal y utilidad técnica de un instrumento de tamizaje. No prueban diagnóstico individual, eficacia clínica ni reducción prospectiva de complicaciones. La factibilidad de 2021 fue inspeccionada antes del bloqueo; los modelos nuevos no se seleccionaron ni ajustaron con esa ola.",
            "",
            "## Archivos de evidencia",
            "",
            "- `development.json`: comparación y selección en 2018.",
            "- `model_lock.json`: hashes de código, artefactos y umbrales.",
            "- `evaluation_2021.json`: evaluación temporal y bootstrap.",
            "- `subgroups_2021.csv`: desempeño estratificado.",
            "- `decision_curve_2021.csv`: beneficio neto por umbral.",
            "- `figures/`: figuras listas para revisión del manuscrito.",
            "",
        ]
    )
    output.write_text("\n".join(lines), encoding="utf-8")


def dump_json(data: object, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)

    def default(value: object) -> object:
        if isinstance(value, (np.integer,)):
            return int(value)
        if isinstance(value, (np.floating,)):
            return float(value)
        if isinstance(value, np.ndarray):
            return value.tolist()
        if isinstance(value, Path):
            return str(value)
        raise TypeError(f"No serializable: {type(value).__name__}")

    output.write_text(
        json.dumps(data, indent=2, ensure_ascii=False, default=default) + "\n",
        encoding="utf-8",
    )
