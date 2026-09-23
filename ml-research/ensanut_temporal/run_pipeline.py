#!/usr/bin/env python3
"""Two-phase temporal validation pipeline for the ENSANUT-PREDIA study."""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import platform
import sys
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


PROJECT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_DIR / "src"))

from predia_ensanut import config  # noqa: E402
from predia_ensanut.harmonize import load_wave  # noqa: E402
from predia_ensanut.metrics import (  # noqa: E402
    cluster_bootstrap_auc_difference,
    cluster_bootstrap_ci,
    discrimination_metrics,
    evaluate_predictions,
    evaluate_ranking_score,
    normalize_training_weights,
    select_threshold_for_sensitivity,
    subgroup_metrics,
)
from predia_ensanut.models import (  # noqa: E402
    ModelCandidate,
    build_model,
    candidates,
    fit_model,
    predict_probability,
)
from predia_ensanut.reporting import (  # noqa: E402
    build_technical_report,
    dump_json,
    plot_calibration,
    plot_cohort_flow,
    plot_decision_utility,
    plot_subgroups,
    plot_temporal_evaluation,
    plot_validation_models,
)
from predia_ensanut.score import PUBLISHED_SCORE_CUTOFF  # noqa: E402


FINGERPRINT_FILES = (
    "PROTOCOL.md",
    "DATA_DICTIONARY.md",
    "config/data_manifest.json",
    "prepare_data.py",
    "requirements.txt",
    "run_pipeline.py",
)
FAMILY_COMPLEXITY = {
    "logistic": 0,
    "spline_logistic": 1,
    "monotonic_boosting": 2,
}


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def study_fingerprint() -> str:
    paths = [PROJECT_DIR / relative for relative in FINGERPRINT_FILES]
    paths.extend(sorted((PROJECT_DIR / "src").rglob("*.py")))
    digest = hashlib.sha256()
    for path in sorted(paths):
        digest.update(str(path.relative_to(PROJECT_DIR)).encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def runtime_versions() -> dict[str, str]:
    distributions = (
        "numpy",
        "pandas",
        "scipy",
        "scikit-learn",
        "matplotlib",
        "joblib",
    )
    return {
        "python": platform.python_version(),
        "platform": platform.platform(),
        **{
            distribution: importlib.metadata.version(distribution)
            for distribution in distributions
        },
    }


def manifest_archive_hashes() -> dict[str, dict[str, str]]:
    manifest = json.loads(
        (PROJECT_DIR / "config" / "data_manifest.json").read_text(encoding="utf-8")
    )
    return {
        wave: {
            archive["filename"]: archive["sha256"]
            for archive in specification["archives"]
        }
        for wave, specification in manifest["waves"].items()
    }


def verify_prepared_data(data_dir: Path, waves: tuple[int, ...]) -> dict[str, dict]:
    """Verify official archive hashes and the bytes extracted from each archive."""
    provenance_path = data_dir / "provenance.json"
    if not provenance_path.exists():
        raise FileNotFoundError(
            f"Falta {provenance_path}. Ejecuta primero prepare_data.py."
        )

    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    expected = manifest_archive_hashes()
    verified: dict[str, dict] = {}
    for wave in waves:
        wave_key = str(wave)
        if wave_key not in provenance.get("waves", {}):
            raise ValueError(f"provenance.json no contiene ENSANUT {wave_key}.")

        archive_records = []
        for archive in provenance["waves"][wave_key]["archives"]:
            filename = archive["filename"]
            observed_archive_hash = archive["sha256"]
            expected_archive_hash = expected.get(wave_key, {}).get(filename)
            if observed_archive_hash != expected_archive_hash:
                raise ValueError(
                    f"El archivo oficial {filename} no coincide con el manifiesto bloqueado."
                )

            extracted_hashes = archive.get("extracted_sha256")
            if not extracted_hashes:
                raise ValueError(
                    "La procedencia no incluye hashes de archivos extraídos. "
                    "Vuelve a ejecutar prepare_data.py con la versión actual."
                )

            observed_members = {}
            for member_name, expected_member_hash in extracted_hashes.items():
                member_path = data_dir / wave_key / Path(member_name).name
                if not member_path.exists():
                    raise FileNotFoundError(f"Falta el microdato preparado: {member_path}")
                observed_member_hash = file_sha256(member_path)
                if observed_member_hash != expected_member_hash:
                    raise ValueError(
                        f"El microdato cambió después de extraerse: {member_path}"
                    )
                observed_members[member_name] = observed_member_hash

            archive_records.append(
                {
                    "filename": filename,
                    "archive_sha256": observed_archive_hash,
                    "extracted_sha256": observed_members,
                }
            )
        verified[wave_key] = {"archives": archive_records}
    return verified


def score_metrics(frame: pd.DataFrame, outcome: str) -> dict[str, float]:
    subset = frame.dropna(subset=["mexican_score", outcome]).copy()
    return evaluate_ranking_score(
        subset[outcome].astype(int),
        subset["mexican_score"],
        subset["survey_weight"],
        PUBLISHED_SCORE_CUTOFF,
    )


def choose_family_finalist(records: list[dict]) -> dict:
    """Select one configuration per model family using 2018 only."""
    return min(
        records,
        key=lambda record: (
            record["validation"]["brier"],
            -record["validation"]["roc_auc"],
            json.dumps(record["candidate"]["parameters"], sort_keys=True),
        ),
    )


def choose_recommended_family(finalists: list[dict]) -> str:
    """Prefer calibration and simplicity among models near the best AUC."""
    best_auc = max(record["validation"]["roc_auc"] for record in finalists)
    competitive = [
        record
        for record in finalists
        if record["validation"]["roc_auc"] >= best_auc - 0.01
    ]
    selected = min(
        competitive,
        key=lambda record: (
            record["validation"]["brier"],
            FAMILY_COMPLEXITY[record["family"]],
        ),
    )
    return str(selected["family"])


def develop_experiment(
    name: str,
    train: pd.DataFrame,
    validation: pd.DataFrame,
    features: tuple[str, ...],
    continuous_features: tuple[str, ...],
    outcome: str,
    models_dir: Path,
) -> tuple[dict, dict]:
    training_weight = normalize_training_weights(train)
    candidate_records: list[dict] = []
    fitted_models: dict[str, object] = {}

    for index, candidate in enumerate(candidates()):
        model = build_model(
            candidate,
            features=features,
            continuous_features=continuous_features,
            seed=config.RANDOM_SEED + index,
        )
        fit_model(model, train, features, outcome, training_weight)
        probability = predict_probability(model, validation, features)
        threshold = select_threshold_for_sensitivity(
            validation[outcome],
            probability,
            validation["survey_weight"],
            target_sensitivity=0.80,
        )
        metrics = evaluate_predictions(
            validation[outcome],
            probability,
            validation["survey_weight"],
            threshold,
        )
        record = {
            "family": candidate.family,
            "candidate": asdict(candidate),
            "validation": metrics,
        }
        candidate_records.append(record)
        fitted_models[f"candidate-{index}"] = model

    finalists: list[dict] = []
    lock_models: list[dict] = []
    for family in FAMILY_COMPLEXITY:
        family_records = [
            record for record in candidate_records if record["family"] == family
        ]
        finalist = choose_family_finalist(family_records)
        candidate_index = candidate_records.index(finalist)
        model = fitted_models[f"candidate-{candidate_index}"]
        artifact = models_dir / f"{name}_{family}.joblib"
        joblib.dump(model, artifact, compress=3)

        finalist_record = {
            **finalist,
            "artifact": str(artifact.relative_to(PROJECT_DIR)),
            "artifact_sha256": file_sha256(artifact),
        }
        finalists.append(finalist_record)
        lock_models.append(
            {
                "family": family,
                "candidate": finalist["candidate"],
                "threshold": finalist["validation"]["threshold"],
                "artifact": finalist_record["artifact"],
                "artifact_sha256": finalist_record["artifact_sha256"],
            }
        )

    recommended_family = choose_recommended_family(finalists)
    development_record = {
        "name": name,
        "outcome": outcome,
        "features": list(features),
        "training_waves": sorted(train["wave"].unique().astype(int).tolist()),
        "validation_wave": int(validation["wave"].iloc[0]),
        "selection_rule": (
            "Menor Brier entre configuraciones de cada familia; modelo recomendado "
            "por menor Brier entre familias a <=0.01 del mejor ROC-AUC, con desempate "
            "por menor complejidad."
        ),
        "candidate_results": candidate_records,
        "finalists": finalists,
        "recommended_family": recommended_family,
    }
    lock_record = {
        "outcome": outcome,
        "features": list(features),
        "training_waves": development_record["training_waves"],
        "validation_wave": development_record["validation_wave"],
        "test_wave": config.TEST_WAVE,
        "recommended_family": recommended_family,
        "models": lock_models,
    }
    return development_record, lock_record


def run_development(data_dir: Path, results_dir: Path) -> None:
    results_dir.mkdir(parents=True, exist_ok=True)
    models_dir = results_dir / "models"
    figures_dir = results_dir / "figures"
    models_dir.mkdir(parents=True, exist_ok=True)
    figures_dir.mkdir(parents=True, exist_ok=True)

    verified_development_data = verify_prepared_data(data_dir, (2012, 2016, 2018))

    # Deliberately do not call load_wave(2021) in this phase.
    waves = {wave: load_wave(wave, data_dir) for wave in (2012, 2016, 2018)}
    train_core = pd.concat(
        [waves[2012].cohort, waves[2016].cohort], ignore_index=True
    )
    train_enhanced = waves[2016].cohort
    validation = waves[2018].cohort

    core, core_lock = develop_experiment(
        "core",
        train_core,
        validation,
        config.CORE_FEATURES,
        config.CONTINUOUS_CORE_FEATURES,
        config.PRIMARY_OUTCOME,
        models_dir,
    )
    enhanced, enhanced_lock = develop_experiment(
        "enhanced",
        train_enhanced,
        validation,
        config.ENHANCED_FEATURES,
        config.CONTINUOUS_ENHANCED_FEATURES,
        config.PRIMARY_OUTCOME,
        models_dir,
    )

    fingerprint = study_fingerprint()
    development = {
        "schema_version": 2,
        "created_at_utc": utc_now(),
        "phase": "development",
        "study_fingerprint": fingerprint,
        "runtime": runtime_versions(),
        "data_provenance": verified_development_data,
        "test_wave_loaded": False,
        "cohort_flow": {str(year): result.flow for year, result in waves.items()},
        "quality": {str(year): result.quality for year, result in waves.items()},
        "score_transport": {
            str(year): {
                "definition_variant": (
                    "adapted_parent_history_and_diagnosis_based_hypertension"
                    if year == 2012
                    else "adapted_parent_history"
                    if year == 2016
                    else "published_components"
                ),
                "primary_fpg": score_metrics(result.cohort, config.PRIMARY_OUTCOME),
                "composite": (
                    score_metrics(result.cohort, "dysglycemia_composite")
                    if result.cohort["dysglycemia_composite"].notna().any()
                    else None
                ),
            }
            for year, result in waves.items()
        },
        "experiments": {"core": core, "enhanced": enhanced},
    }
    lock = {
        "schema_version": 2,
        "locked_at_utc": utc_now(),
        "study_fingerprint": fingerprint,
        "random_seed": config.RANDOM_SEED,
        "runtime": runtime_versions(),
        "expected_archive_sha256": manifest_archive_hashes(),
        "development_data_provenance": verified_development_data,
        "test_wave": config.TEST_WAVE,
        "experiments": {"core": core_lock, "enhanced": enhanced_lock},
    }

    dump_json(development, results_dir / "development.json")
    dump_json(lock, results_dir / "model_lock.json")
    plot_cohort_flow(development["cohort_flow"], figures_dir / "cohort_flow_development.png")
    plot_validation_models(development, figures_dir / "validation_models_2018.png")

    print("Fase de desarrollo terminada sin cargar ENSANUT 2021.")
    print(f"Modelo recomendado núcleo: {core['recommended_family']}")
    print(f"Modelo recomendado ampliado: {enhanced['recommended_family']}")
    print(f"Huella bloqueada: {fingerprint}")
    print(f"Bloqueo: {results_dir / 'model_lock.json'}")


def verify_lock(lock: dict, data_dir: Path, allow_code_drift: bool) -> None:
    observed_fingerprint = study_fingerprint()
    expected_fingerprint = lock["study_fingerprint"]
    if observed_fingerprint != expected_fingerprint and not allow_code_drift:
        raise RuntimeError(
            "El código cambió después del bloqueo. Registra la desviación y vuelve a "
            "ejecutar develop, o usa --allow-code-drift solo para cambios no analíticos."
        )

    if manifest_archive_hashes() != lock.get("expected_archive_sha256"):
        raise RuntimeError(
            "El manifiesto de archivos oficiales cambió después del bloqueo."
        )

    current_development_data = verify_prepared_data(data_dir, (2012, 2016, 2018))
    if current_development_data != lock.get("development_data_provenance"):
        raise RuntimeError(
            "Los microdatos de desarrollo cambiaron después del bloqueo del modelo."
        )

    for experiment in lock["experiments"].values():
        for model in experiment["models"]:
            artifact = PROJECT_DIR / model["artifact"]
            observed_hash = file_sha256(artifact)
            if observed_hash != model["artifact_sha256"]:
                raise RuntimeError(f"Artefacto modificado después del bloqueo: {artifact}")


def evaluate_experiment(
    name: str,
    experiment_lock: dict,
    test: pd.DataFrame,
    bootstrap_repetitions: int,
) -> tuple[dict, dict[str, np.ndarray]]:
    models = []
    predictions: dict[str, np.ndarray] = {}
    features = tuple(experiment_lock["features"])
    for index, locked_model in enumerate(experiment_lock["models"]):
        artifact = PROJECT_DIR / locked_model["artifact"]
        model = joblib.load(artifact)
        probability = predict_probability(model, test, features)
        predictions[locked_model["family"]] = probability
        test_metrics = evaluate_predictions(
            test[experiment_lock["outcome"]],
            probability,
            test["survey_weight"],
            float(locked_model["threshold"]),
        )
        complete_mask = test.loc[:, features].notna().all(axis=1).to_numpy()
        complete_case_metrics = evaluate_predictions(
            test.loc[complete_mask, experiment_lock["outcome"]],
            probability[complete_mask],
            test.loc[complete_mask, "survey_weight"],
            float(locked_model["threshold"]),
        )
        secondary_discrimination = {}
        for secondary_outcome in config.SECONDARY_OUTCOMES:
            available = test[secondary_outcome].notna().to_numpy()
            secondary_y = test.loc[available, secondary_outcome].astype(int)
            if len(secondary_y) and secondary_y.nunique() == 2:
                secondary_discrimination[secondary_outcome] = discrimination_metrics(
                    secondary_y,
                    probability[available],
                    test.loc[available, "survey_weight"],
                )
        bootstrap_ci = cluster_bootstrap_ci(
            test,
            probability,
            experiment_lock["outcome"],
            float(locked_model["threshold"]),
            repetitions=bootstrap_repetitions,
            seed=config.RANDOM_SEED + index + (100 if name == "enhanced" else 0),
        )
        models.append(
            {
                **locked_model,
                "test": test_metrics,
                "complete_case_test": complete_case_metrics,
                "secondary_discrimination": secondary_discrimination,
                "bootstrap_ci": bootstrap_ci,
            }
        )
    return (
        {
            "name": name,
            "outcome": experiment_lock["outcome"],
            "features": experiment_lock["features"],
            "recommended_family": experiment_lock["recommended_family"],
            "models": models,
        },
        predictions,
    )


def run_evaluation(
    data_dir: Path,
    results_dir: Path,
    bootstrap_repetitions: int,
    allow_code_drift: bool,
    overwrite_evaluation: bool,
) -> None:
    evaluation_path = results_dir / "evaluation_2021.json"
    if evaluation_path.exists() and not overwrite_evaluation:
        raise RuntimeError(
            f"La evaluación bloqueada ya existe: {evaluation_path}. "
            "No se repite sin --overwrite-evaluation."
        )

    development_path = results_dir / "development.json"
    lock_path = results_dir / "model_lock.json"
    if not development_path.exists() or not lock_path.exists():
        raise FileNotFoundError("Ejecuta primero: run_pipeline.py develop")
    development = json.loads(development_path.read_text(encoding="utf-8"))
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    verify_lock(lock, data_dir=data_dir, allow_code_drift=allow_code_drift)

    verified_test_data = verify_prepared_data(data_dir, (config.TEST_WAVE,))
    test_wave = load_wave(config.TEST_WAVE, data_dir)
    test = test_wave.cohort
    core, core_predictions = evaluate_experiment(
        "core", lock["experiments"]["core"], test, bootstrap_repetitions
    )
    enhanced, enhanced_predictions = evaluate_experiment(
        "enhanced",
        lock["experiments"]["enhanced"],
        test,
        bootstrap_repetitions,
    )

    selected_core_probability = core_predictions[core["recommended_family"]]
    selected_enhanced_probability = enhanced_predictions[enhanced["recommended_family"]]
    score_available = test["mexican_score"].notna().to_numpy()
    comparisons = {
        "enhanced_minus_core_auc": cluster_bootstrap_auc_difference(
            test,
            selected_enhanced_probability,
            selected_core_probability,
            config.PRIMARY_OUTCOME,
            repetitions=bootstrap_repetitions,
            seed=config.RANDOM_SEED + 200,
        ),
        "core_minus_published_score_auc_common_sample": (
            cluster_bootstrap_auc_difference(
                test.loc[score_available].reset_index(drop=True),
                selected_core_probability[score_available],
                test.loc[score_available, "mexican_score"].to_numpy(),
                config.PRIMARY_OUTCOME,
                repetitions=bootstrap_repetitions,
                seed=config.RANDOM_SEED + 201,
            )
        ),
    }

    evaluation = {
        "schema_version": 2,
        "created_at_utc": utc_now(),
        "phase": "locked_temporal_evaluation",
        "study_fingerprint": lock["study_fingerprint"],
        "lock_sha256": file_sha256(lock_path),
        "runtime": runtime_versions(),
        "data_provenance": verified_test_data,
        "test_wave": config.TEST_WAVE,
        "bootstrap": {
            "method": "PSU resampling within strata",
            "repetitions_requested": bootstrap_repetitions,
            "seed": config.RANDOM_SEED,
        },
        "cohort_flow": {str(config.TEST_WAVE): test_wave.flow},
        "quality": {str(config.TEST_WAVE): test_wave.quality},
        "score_transport": {
            "definition_variant": "published_components",
            "primary_fpg": score_metrics(test, config.PRIMARY_OUTCOME),
            "composite": score_metrics(test, "dysglycemia_composite"),
        },
        "paired_auc_comparisons": comparisons,
        "experiments": {"core": core, "enhanced": enhanced},
    }
    dump_json(evaluation, evaluation_path)

    figures_dir = results_dir / "figures"
    figures_dir.mkdir(parents=True, exist_ok=True)
    combined_flow = {
        **development["cohort_flow"],
        **evaluation["cohort_flow"],
    }
    plot_cohort_flow(combined_flow, figures_dir / "cohort_flow_all_waves.png")
    plot_temporal_evaluation(evaluation, figures_dir / "temporal_auc_2021.png")

    selected_family = core["recommended_family"]
    selected_model = next(
        model for model in core["models"] if model["family"] == selected_family
    )
    selected_probability = core_predictions[selected_family]
    calibration = plot_calibration(
        test,
        selected_probability,
        config.PRIMARY_OUTCOME,
        figures_dir / "calibration_2021.png",
    )
    calibration.to_csv(results_dir / "calibration_2021.csv", index=False)
    decision = plot_decision_utility(
        test,
        selected_probability,
        config.PRIMARY_OUTCOME,
        figures_dir / "decision_curve_2021.png",
    )
    decision.to_csv(results_dir / "decision_curve_2021.csv", index=False)
    subgroups = subgroup_metrics(
        test,
        selected_probability,
        config.PRIMARY_OUTCOME,
        float(selected_model["threshold"]),
    )
    subgroups.to_csv(results_dir / "subgroups_2021.csv", index=False)
    plot_subgroups(subgroups, figures_dir / "subgroups_2021.png")
    build_technical_report(
        development, evaluation, results_dir / "technical_report.md"
    )

    print("Evaluación temporal ENSANUT 2021 completada.")
    print(f"Modelo núcleo bloqueado: {selected_family}")
    print(
        "ROC-AUC 2021: "
        f"{selected_model['test']['roc_auc']:.4f}; "
        f"Brier: {selected_model['test']['brier']:.4f}"
    )
    print(f"Evidencia: {evaluation_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validación temporal auditable de PREDIA con ENSANUT."
    )
    subparsers = parser.add_subparsers(dest="phase", required=True)

    develop = subparsers.add_parser(
        "develop", help="Entrena y bloquea modelos usando solo 2012-2018."
    )
    develop.add_argument("--data-dir", type=Path, default=config.RAW_DATA_DIR)
    develop.add_argument("--results-dir", type=Path, default=config.RESULTS_DIR)

    evaluate = subparsers.add_parser(
        "evaluate", help="Verifica el bloqueo y evalúa una sola vez en 2021."
    )
    evaluate.add_argument("--data-dir", type=Path, default=config.RAW_DATA_DIR)
    evaluate.add_argument("--results-dir", type=Path, default=config.RESULTS_DIR)
    evaluate.add_argument("--bootstrap-repetitions", type=int, default=200)
    evaluate.add_argument("--allow-code-drift", action="store_true")
    evaluate.add_argument("--overwrite-evaluation", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.phase == "develop":
            run_development(args.data_dir.resolve(), args.results_dir.resolve())
        else:
            run_evaluation(
                args.data_dir.resolve(),
                args.results_dir.resolve(),
                bootstrap_repetitions=args.bootstrap_repetitions,
                allow_code_drift=args.allow_code_drift,
                overwrite_evaluation=args.overwrite_evaluation,
            )
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
