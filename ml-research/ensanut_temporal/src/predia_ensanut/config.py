"""Frozen configuration for the ENSANUT temporal validation study."""

from __future__ import annotations

from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[2]
RAW_DATA_DIR = PROJECT_DIR / "data" / "raw"
PROCESSED_DATA_DIR = PROJECT_DIR / "data" / "processed"
RESULTS_DIR = PROJECT_DIR / "results"
MANIFEST_PATH = PROJECT_DIR / "config" / "data_manifest.json"

RANDOM_SEED = 20260911
WAVES = (2012, 2016, 2018, 2021)
TRAIN_WAVES = (2012, 2016)
VALIDATION_WAVE = 2018
TEST_WAVE = 2021

PRIMARY_OUTCOME = "dysglycemia_fpg"
SECONDARY_OUTCOMES = (
    "undiagnosed_diabetes_fpg",
    "dysglycemia_composite",
    "undiagnosed_diabetes_composite",
)

CORE_FEATURES = (
    "age",
    "female",
    "parent_diabetes",
    "diagnosed_hypertension",
    "bmi",
    "waist_cm",
)

ENHANCED_FEATURES = CORE_FEATURES + (
    "systolic_bp",
    "diastolic_bp",
)

CONTINUOUS_CORE_FEATURES = ("age", "bmi", "waist_cm")
CONTINUOUS_ENHANCED_FEATURES = CONTINUOUS_CORE_FEATURES + (
    "systolic_bp",
    "diastolic_bp",
)

QUALITY_LIMITS = {
    "age": (20.0, 110.0),
    "weight_kg": (25.0, 300.0),
    "height_cm": (100.0, 220.0),
    "bmi": (10.0, 80.0),
    "waist_cm": (40.0, 220.0),
    "systolic_bp": (60.0, 260.0),
    "diastolic_bp": (30.0, 160.0),
    "glucose_mg_dl": (30.0, 700.0),
    "hba1c_pct": (3.0, 20.0),
}

# The distinctive missing sentinel used in recent anthropometry files. Generic
# values such as 999 are already rejected by the physiological limits above.
KNOWN_NUMERIC_SENTINELS = (222.2, 222.22, 222.222)
