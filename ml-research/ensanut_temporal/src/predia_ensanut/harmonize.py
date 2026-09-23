"""Wave-specific ENSANUT loaders mapped to a frozen canonical schema."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np
import pandas as pd

from . import config
from .score import mexican_screening_score


@dataclass(frozen=True)
class HarmonizedWave:
    wave: int
    cohort: pd.DataFrame
    flow: dict[str, int]
    quality: dict[str, dict[str, int | float]]


def _read_csv(path: Path, usecols: list[str], string_cols: tuple[str, ...]) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(
            f"Falta {path}. Ejecuta prepare_data.py con los ZIP oficiales."
        )
    return pd.read_csv(
        path,
        usecols=usecols,
        dtype={column: "string" for column in string_cols},
        low_memory=False,
    )


def _id_part(series: pd.Series) -> pd.Series:
    return series.astype("string").str.strip().str.replace(r"\.0$", "", regex=True)


def _normalize_numeric_keys(
    frame: pd.DataFrame, columns: tuple[str, ...]
) -> pd.DataFrame:
    frame = frame.copy()
    for column in columns:
        values = _id_part(frame[column])
        numeric = values.str.fullmatch(r"\d+").fillna(False)
        stripped = values.str.lstrip("0").replace("", "0")
        frame[column] = values.where(~numeric, stripped)
    return frame


def _person_id(wave: int, frame: pd.DataFrame, columns: tuple[str, ...]) -> pd.Series:
    parts = [_id_part(frame[column]).fillna("NA") for column in columns]
    result = parts[0]
    for part in parts[1:]:
        result = result.str.cat(part, sep="-")
    return f"{wave}:" + result


def _numeric(series: pd.Series) -> pd.Series:
    values = pd.to_numeric(series, errors="coerce").astype(float)
    for sentinel in config.KNOWN_NUMERIC_SENTINELS:
        values = values.mask(np.isclose(values, sentinel, atol=1e-6))
    return values


def _bounded(series: pd.Series, canonical_name: str) -> pd.Series:
    values = _numeric(series)
    lower, upper = config.QUALITY_LIMITS[canonical_name]
    return values.where(values.between(lower, upper, inclusive="both"))


def _mean_bounded(
    frame: pd.DataFrame, columns: tuple[str, ...], canonical_name: str
) -> pd.Series:
    values = pd.concat(
        [_bounded(frame[column], canonical_name) for column in columns], axis=1
    )
    return values.mean(axis=1, skipna=True)


def _binary(series: pd.Series, yes: set[int], no: set[int]) -> pd.Series:
    values = _numeric(series)
    result = pd.Series(np.nan, index=series.index, dtype=float)
    result.loc[values.isin(yes)] = 1.0
    result.loc[values.isin(no)] = 0.0
    return result


def _history(frame: pd.DataFrame, columns: tuple[str, ...]) -> pd.Series:
    values = pd.concat(
        [_binary(frame[column], yes={1}, no={2}) for column in columns], axis=1
    )
    any_yes = values.eq(1).any(axis=1)
    all_no = values.eq(0).all(axis=1)
    result = pd.Series(np.nan, index=frame.index, dtype=float)
    result.loc[any_yes] = 1.0
    result.loc[~any_yes & all_no] = 0.0
    return result


def _sex(series: pd.Series) -> pd.Series:
    return _binary(series, yes={2}, no={1}).rename("female")


def _combine_age_specific(
    frame: pd.DataFrame,
    age: pd.Series,
    younger_columns: tuple[str, ...],
    older_columns: tuple[str, ...],
    canonical_name: str,
) -> pd.Series:
    younger = _mean_bounded(frame, younger_columns, canonical_name)
    older = _mean_bounded(frame, older_columns, canonical_name)
    return younger.where(age < 60, older)


def _diagnosis_or_measurement(
    diagnosis: pd.Series,
    medication: pd.Series | None,
    systolic: pd.Series | None,
    diastolic: pd.Series | None,
) -> pd.Series:
    components = [diagnosis]
    if medication is not None:
        components.append(medication)
    if systolic is not None and diastolic is not None:
        measured = pd.Series(np.nan, index=diagnosis.index, dtype=float)
        has_measurement = systolic.notna() & diastolic.notna()
        measured.loc[has_measurement] = (
            (systolic.loc[has_measurement] >= 130)
            | (diastolic.loc[has_measurement] >= 80)
        ).astype(float)
        components.append(measured)

    values = pd.concat(components, axis=1)
    result = pd.Series(np.nan, index=diagnosis.index, dtype=float)
    result.loc[values.eq(1).any(axis=1)] = 1.0

    # Medication is a conditional question in ENSANUT: when the respondent
    # reports no diagnosis, an empty medication field is a structural skip.
    # A negative screen can therefore be established from a known negative
    # diagnosis plus normal measured BP (or diagnosis alone when BP is absent).
    evaluable_negative = diagnosis.eq(0)
    if systolic is not None and diastolic is not None:
        evaluable_negative &= systolic.notna() & diastolic.notna()
    result.loc[result.isna() & evaluable_negative] = 0.0
    return result


def _add_derived_fields(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    frame["obesity"] = np.where(
        frame["bmi"].notna(), (frame["bmi"] >= 30).astype(float), np.nan
    )
    waist_cutoff = np.where(frame["female"].eq(1), 88.0, 102.0)
    frame["abdominal_obesity_aha"] = np.where(
        frame["waist_cm"].notna() & frame["female"].notna(),
        (frame["waist_cm"] >= waist_cutoff).astype(float),
        np.nan,
    )
    frame["dysglycemia_fpg"] = (frame["glucose_mg_dl"] >= 100).astype(int)
    frame["undiagnosed_diabetes_fpg"] = (
        frame["glucose_mg_dl"] >= 126
    ).astype(int)

    both_markers = frame["glucose_mg_dl"].notna() & frame["hba1c_pct"].notna()
    frame["dysglycemia_composite"] = np.where(
        both_markers,
        (
            (frame["glucose_mg_dl"] >= 100)
            | (frame["hba1c_pct"] >= 5.7)
        ).astype(float),
        np.nan,
    )
    frame["undiagnosed_diabetes_composite"] = np.where(
        both_markers,
        (
            (frame["glucose_mg_dl"] >= 126)
            | (frame["hba1c_pct"] >= 6.5)
        ).astype(float),
        np.nan,
    )
    frame["mexican_score"] = mexican_screening_score(frame)
    return frame


def _finalize(
    wave: int,
    frame: pd.DataFrame,
    initial_flow: dict[str, int],
) -> HarmonizedWave:
    flow = dict(initial_flow)
    filters: tuple[tuple[str, pd.Series], ...] = (
        ("age_20_to_110", frame["age"].between(20, 110)),
        ("known_diabetes_status", frame["prior_diabetes"].notna()),
        ("without_prior_diabetes", frame["prior_diabetes"].eq(0)),
        ("not_currently_pregnant", ~frame["pregnant"].eq(1)),
        ("fasting_sample", frame["fasting_eligible"].eq(1)),
        ("positive_survey_weight", frame["survey_weight"].gt(0)),
        ("valid_fasting_glucose", frame["glucose_mg_dl"].notna()),
    )

    selected = pd.Series(True, index=frame.index)
    for label, mask in filters:
        selected &= mask.fillna(False)
        flow[label] = int(selected.sum())

    cohort = frame.loc[selected].copy().reset_index(drop=True)
    cohort = _add_derived_fields(cohort)
    flow["complete_core_predictors"] = int(
        cohort.loc[:, config.CORE_FEATURES].notna().all(axis=1).sum()
    )
    flow["complete_enhanced_predictors"] = int(
        cohort.loc[:, config.ENHANCED_FEATURES].notna().all(axis=1).sum()
    )

    quality: dict[str, dict[str, int | float]] = {}
    for column in (
        "age",
        "bmi",
        "waist_cm",
        "systolic_bp",
        "diastolic_bp",
        "glucose_mg_dl",
        "hba1c_pct",
        "parent_diabetes",
    ):
        series = cohort[column]
        quality[column] = {
            "available": int(series.notna().sum()),
            "missing": int(series.isna().sum()),
            "missing_pct": round(float(series.isna().mean() * 100), 3),
        }

    if cohort["person_id"].duplicated().any():
        duplicates = int(cohort["person_id"].duplicated().sum())
        raise ValueError(f"ENSANUT {wave}: {duplicates} identificadores duplicados")

    return HarmonizedWave(wave=wave, cohort=cohort, flow=flow, quality=quality)


def _load_2012(data_dir: Path) -> HarmonizedWave:
    root = data_dir / "2012"
    adult = _read_csv(
        root / "Adultos.csv",
        [
            "folio", "intp", "sexo", "edad", "a301", "a401", "a405",
            "a701a", "a701b", "a811a", "est_urb", "est_var", "code_upm",
        ],
        ("folio", "intp", "code_upm"),
    )
    anthropometry = _read_csv(
        root / "adultos_antropometria_2012.csv",
        ["folio", "intp", "imc", "ccintura"],
        ("folio", "intp"),
    )
    labs = _read_csv(
        root / "med_gluc_2012.csv",
        [
            "folio", "intp", "glucosa", "PONDEV3", "est_var", "code_upm",
            "est_urb",
        ],
        ("folio", "intp", "code_upm"),
    )
    keys = ["folio", "intp"]
    frame = labs.merge(adult, on=keys, how="inner", validate="one_to_one", suffixes=("_lab", "_adult"))
    frame = frame.merge(anthropometry, on=keys, how="left", validate="one_to_one")

    age = _bounded(frame["edad"], "age")
    diagnosis = _binary(frame["a401"], yes={1}, no={2})
    result = pd.DataFrame(
        {
            "person_id": _person_id(2012, frame, ("folio", "intp")),
            "wave": 2012,
            "age": age,
            "female": _sex(frame["sexo"]),
            "parent_diabetes": _history(frame, ("a701a", "a701b")),
            "family_diabetes": _history(frame, ("a701a", "a701b")),
            "diagnosed_hypertension": diagnosis,
            "hypertension_screen": _diagnosis_or_measurement(
                diagnosis,
                _binary(frame["a405"], yes={1}, no={2}),
                None,
                None,
            ),
            "bmi": _bounded(frame["imc"], "bmi"),
            "waist_cm": _bounded(frame["ccintura"], "waist_cm"),
            "systolic_bp": np.nan,
            "diastolic_bp": np.nan,
            "prior_diabetes": _binary(frame["a301"], yes={1}, no={2}),
            "pregnant": _binary(frame["a811a"], yes={1}, no={2}).fillna(0),
            "fasting_hours": np.nan,
            "fasting_eligible": 1.0,
            "glucose_mg_dl": _bounded(frame["glucosa"], "glucose_mg_dl"),
            "hba1c_pct": np.nan,
            "survey_weight": _numeric(frame["PONDEV3"]),
            "stratum": "2012:" + _id_part(frame["est_var_lab"]),
            "psu": "2012:" + _id_part(frame["code_upm_lab"]),
            "rural": _binary(frame["est_urb_lab"], yes={1}, no={2, 3}),
            "region": pd.Series(pd.NA, index=frame.index, dtype="string"),
            "hypertension_definition": "diagnosis_or_medication",
        }
    )
    return _finalize(
        2012,
        result,
        {
            "questionnaire_rows": len(adult),
            "anthropometry_rows": len(anthropometry),
            "biomarker_rows": len(labs),
            "linked_rows": len(frame),
        },
    )


def _load_2016(data_dir: Path) -> HarmonizedWave:
    root = data_dir / "2016"
    adult = _read_csv(
        root / "adultos_cronicas.csv",
        [
            "folio", "INT", "sexo", "edad", "a301", "a401", "a405",
            "a701a", "a701b", "region_h", "rural",
        ],
        ("folio", "INT"),
    ).rename(columns={"INT": "int"})
    anthropometry = _read_csv(
        root / "antro_adul.csv",
        [
            "folio", "int", "emb", "pesoprom", "tallaprom", "prom_cintura",
            "sistol3", "sistol4", "diastol3", "diastol4",
        ],
        ("folio", "int"),
    )
    labs = _read_csv(
        root / "ensanut_det_bio_2016.csv",
        [
            "folio", "int", "sanvenh", "valor.GLU_SUERO", "valor.HB1AC",
            "ponde_f_vv", "est_var", "code_upm", "rural", "region_h",
        ],
        ("folio", "int", "code_upm"),
    )
    keys = ["folio", "int"]
    frame = labs.merge(adult, on=keys, how="inner", validate="one_to_one", suffixes=("_lab", "_adult"))
    frame = frame.merge(anthropometry, on=keys, how="left", validate="one_to_one")

    weight = _bounded(frame["pesoprom"], "weight_kg")
    height = _bounded(frame["tallaprom"], "height_cm")
    bmi = (weight / (height / 100) ** 2).where(height.notna() & weight.notna())
    bmi = bmi.where(bmi.between(*config.QUALITY_LIMITS["bmi"]))
    systolic = _mean_bounded(frame, ("sistol3", "sistol4"), "systolic_bp")
    diastolic = _mean_bounded(frame, ("diastol3", "diastol4"), "diastolic_bp")
    diagnosis = _binary(frame["a401"], yes={1}, no={2})
    fasting_hours = _numeric(frame["sanvenh"])

    result = pd.DataFrame(
        {
            "person_id": _person_id(2016, frame, ("folio", "int")),
            "wave": 2016,
            "age": _bounded(frame["edad"], "age"),
            "female": _sex(frame["sexo"]),
            "parent_diabetes": _history(frame, ("a701a", "a701b")),
            "family_diabetes": _history(frame, ("a701a", "a701b")),
            "diagnosed_hypertension": diagnosis,
            "hypertension_screen": _diagnosis_or_measurement(
                diagnosis,
                _binary(frame["a405"], yes={1}, no={2}),
                systolic,
                diastolic,
            ),
            "bmi": bmi,
            "waist_cm": _bounded(frame["prom_cintura"], "waist_cm"),
            "systolic_bp": systolic,
            "diastolic_bp": diastolic,
            "prior_diabetes": _binary(frame["a301"], yes={1}, no={2, 3}),
            "pregnant": _binary(frame["emb"], yes={1, 3}, no={2, 4}).fillna(0),
            "fasting_hours": fasting_hours,
            "fasting_eligible": fasting_hours.ge(8).astype(float),
            "glucose_mg_dl": _bounded(frame["valor.GLU_SUERO"], "glucose_mg_dl"),
            "hba1c_pct": _bounded(frame["valor.HB1AC"], "hba1c_pct"),
            "survey_weight": _numeric(frame["ponde_f_vv"]),
            "stratum": "2016:" + _id_part(frame["est_var"]),
            "psu": "2016:" + _id_part(frame["code_upm"]),
            "rural": _binary(frame["rural_lab"], yes={1}, no={2}),
            "region": _id_part(frame["region_h_lab"]),
            "hypertension_definition": "diagnosis_medication_or_bp",
        }
    )
    return _finalize(
        2016,
        result,
        {
            "questionnaire_rows": len(adult),
            "anthropometry_rows": len(anthropometry),
            "biomarker_rows": len(labs),
            "linked_rows": len(frame),
        },
    )


def _load_2018(data_dir: Path) -> HarmonizedWave:
    root = data_dir / "2018"
    keys = ["UPM", "VIV_SEL", "HOGAR", "NUMREN"]
    adult = _read_csv(
        root / "CS_ADULTOS.csv",
        keys
        + [
            "EDAD", "SEXO", "P3_1", "P4_1", "P4_4", "P7_1_1",
            "P7_1_2", "P7_1_3", "REGION", "DOMINIO",
        ],
        tuple(keys),
    )
    anthropometry = _read_csv(
        root / "CN_ANTROPOMETRIA.csv",
        keys
        + [
            "P6", "PESO1_1", "PESO1_2", "TALLA4_1", "TALLA4_2",
            "CIRCUNFERENCIA8_1", "CIRCUNFERENCIA8_2", "PESO12_1",
            "PESO12_2", "TALLA15_1", "TALLA15_2", "CINTURA21_1",
            "CINTURA21_2", "P27_1_1", "P27_1_2", "P27_2_1", "P27_2_2",
        ],
        tuple(keys),
    )
    labs = _read_csv(
        root / "DetBioCronicosAdultos.csv",
        keys
        + [
            "P5_1", "VALOR_GLU_SUERO", "VALOR_HB1AC",
            "ponderador_glucosa", "EST_DIS", "UPM_DIS", "REGION", "DOMINIO",
        ],
        tuple(keys + ["EST_DIS", "UPM_DIS"]),
    )
    normalized_keys = tuple(keys)
    adult = _normalize_numeric_keys(adult, normalized_keys)
    anthropometry = _normalize_numeric_keys(anthropometry, normalized_keys)
    labs = _normalize_numeric_keys(labs, normalized_keys)
    frame = labs.merge(adult, on=keys, how="inner", validate="one_to_one", suffixes=("_lab", "_adult"))
    frame = frame.merge(anthropometry, on=keys, how="left", validate="one_to_one")

    age = _bounded(frame["EDAD"], "age")
    weight = _combine_age_specific(
        frame,
        age,
        ("PESO1_1", "PESO1_2"),
        ("PESO12_1", "PESO12_2"),
        "weight_kg",
    )
    height = _combine_age_specific(
        frame,
        age,
        ("TALLA4_1", "TALLA4_2"),
        ("TALLA15_1", "TALLA15_2"),
        "height_cm",
    )
    waist = _combine_age_specific(
        frame,
        age,
        ("CIRCUNFERENCIA8_1", "CIRCUNFERENCIA8_2"),
        ("CINTURA21_1", "CINTURA21_2"),
        "waist_cm",
    )
    bmi = (weight / (height / 100) ** 2).where(height.notna() & weight.notna())
    bmi = bmi.where(bmi.between(*config.QUALITY_LIMITS["bmi"]))
    systolic = _mean_bounded(frame, ("P27_1_1", "P27_2_1"), "systolic_bp")
    diastolic = _mean_bounded(frame, ("P27_1_2", "P27_2_2"), "diastolic_bp")
    diagnosis = _binary(frame["P4_1"], yes={1}, no={2})
    fasting_hours = _numeric(frame["P5_1"])

    result = pd.DataFrame(
        {
            "person_id": _person_id(2018, frame, tuple(keys)),
            "wave": 2018,
            "age": age,
            "female": _sex(frame["SEXO"]),
            "parent_diabetes": _history(frame, ("P7_1_1", "P7_1_2")),
            "family_diabetes": _history(frame, ("P7_1_1", "P7_1_2", "P7_1_3")),
            "diagnosed_hypertension": diagnosis,
            "hypertension_screen": _diagnosis_or_measurement(
                diagnosis,
                _binary(frame["P4_4"], yes={1}, no={2}),
                systolic,
                diastolic,
            ),
            "bmi": bmi,
            "waist_cm": waist,
            "systolic_bp": systolic,
            "diastolic_bp": diastolic,
            "prior_diabetes": _binary(frame["P3_1"], yes={1}, no={2, 3}),
            "pregnant": _binary(frame["P6"], yes={1, 3}, no={2, 4}).fillna(0),
            "fasting_hours": fasting_hours,
            "fasting_eligible": fasting_hours.ge(8).astype(float),
            "glucose_mg_dl": _bounded(frame["VALOR_GLU_SUERO"], "glucose_mg_dl"),
            "hba1c_pct": _bounded(frame["VALOR_HB1AC"], "hba1c_pct"),
            "survey_weight": _numeric(frame["ponderador_glucosa"]),
            "stratum": "2018:" + _id_part(frame["EST_DIS"]),
            "psu": "2018:" + _id_part(frame["UPM_DIS"]),
            "rural": _binary(frame["DOMINIO_lab"], yes={2}, no={1}),
            "region": _id_part(frame["REGION_lab"]),
            "hypertension_definition": "diagnosis_medication_or_bp",
        }
    )
    return _finalize(
        2018,
        result,
        {
            "questionnaire_rows": len(adult),
            "anthropometry_rows": len(anthropometry),
            "biomarker_rows": int(_numeric(labs["VALOR_GLU_SUERO"]).notna().sum()),
            "linked_rows": len(frame),
        },
    )


def _load_2021(data_dir: Path) -> HarmonizedWave:
    root = data_dir / "2021"
    keys = ["FOLIO_INT"]
    adult = _read_csv(
        root / "ensadul2021_entrega_w_15_12_2021.csv",
        keys
        + [
            "edad", "sexo", "a0301", "a0401", "a0404", "a0701p",
            "a0701m", "a0701h", "a0808", "region", "estrato", "upm",
        ],
        ("FOLIO_INT", "upm"),
    )
    anthropometry = _read_csv(
        root / "ensaantro21_entrega_w_17_12_2021.csv",
        keys
        + [
            "an06", "an01_1", "an01_2", "an04_1", "an04_2", "an08_1",
            "an08_2", "an12_1", "an12_2", "an15_1", "an15_2", "an21_1",
            "an21_2", "an27_01s", "an27_01d", "an27_02s", "an27_02d",
            "an27_03s", "an27_03d",
        ],
        ("FOLIO_INT",),
    )
    labs = _read_csv(
        root / "ensasangre21_entrega_w_integrada.csv",
        keys
        + [
            "san04", "valor_GLU_SUERO", "valor_HB1AC", "ponde_g",
            "est_sel", "upm", "estrato", "region",
        ],
        ("FOLIO_INT", "upm"),
    )
    frame = labs.merge(adult, on=keys, how="inner", validate="one_to_one", suffixes=("_lab", "_adult"))
    frame = frame.merge(anthropometry, on=keys, how="left", validate="one_to_one")

    age = _bounded(frame["edad"], "age")
    weight = _combine_age_specific(
        frame,
        age,
        ("an01_1", "an01_2"),
        ("an12_1", "an12_2"),
        "weight_kg",
    )
    height = _combine_age_specific(
        frame,
        age,
        ("an04_1", "an04_2"),
        ("an15_1", "an15_2"),
        "height_cm",
    )
    waist = _combine_age_specific(
        frame,
        age,
        ("an08_1", "an08_2"),
        ("an21_1", "an21_2"),
        "waist_cm",
    )
    bmi = (weight / (height / 100) ** 2).where(height.notna() & weight.notna())
    bmi = bmi.where(bmi.between(*config.QUALITY_LIMITS["bmi"]))
    systolic = _mean_bounded(
        frame, ("an27_02s", "an27_03s"), "systolic_bp"
    )
    diastolic = _mean_bounded(
        frame, ("an27_02d", "an27_03d"), "diastolic_bp"
    )
    diagnosis = _binary(frame["a0401"], yes={1}, no={2, 3})
    fasting_hours = _numeric(frame["san04"])
    pregnancy_adult = _binary(frame["a0808"], yes={1}, no={2})
    pregnancy_antro = _binary(frame["an06"], yes={1, 3}, no={2, 4})
    pregnant = pd.concat((pregnancy_adult, pregnancy_antro), axis=1).eq(1).any(axis=1)

    result = pd.DataFrame(
        {
            "person_id": _person_id(2021, frame, ("FOLIO_INT",)),
            "wave": 2021,
            "age": age,
            "female": _sex(frame["sexo"]),
            "parent_diabetes": _history(frame, ("a0701p", "a0701m")),
            "family_diabetes": _history(frame, ("a0701p", "a0701m", "a0701h")),
            "diagnosed_hypertension": diagnosis,
            "hypertension_screen": _diagnosis_or_measurement(
                diagnosis,
                _binary(frame["a0404"], yes={1}, no={2}),
                systolic,
                diastolic,
            ),
            "bmi": bmi,
            "waist_cm": waist,
            "systolic_bp": systolic,
            "diastolic_bp": diastolic,
            "prior_diabetes": _binary(frame["a0301"], yes={1}, no={2, 3}),
            "pregnant": pregnant.astype(float),
            "fasting_hours": fasting_hours,
            "fasting_eligible": fasting_hours.ge(8).astype(float),
            "glucose_mg_dl": _bounded(frame["valor_GLU_SUERO"], "glucose_mg_dl"),
            "hba1c_pct": _bounded(frame["valor_HB1AC"], "hba1c_pct"),
            "survey_weight": _numeric(frame["ponde_g"]),
            "stratum": "2021:" + _id_part(frame["est_sel"]),
            "psu": "2021:" + _id_part(frame["upm_lab"]),
            "rural": _binary(frame["estrato_lab"], yes={1}, no={2, 3}),
            "region": _id_part(frame["region_lab"]),
            "hypertension_definition": "diagnosis_medication_or_bp",
        }
    )
    return _finalize(
        2021,
        result,
        {
            "questionnaire_rows": len(adult),
            "anthropometry_rows": len(anthropometry),
            "biomarker_rows": int(_numeric(labs["valor_GLU_SUERO"]).notna().sum()),
            "linked_rows": len(frame),
        },
    )


LOADERS: dict[int, Callable[[Path], HarmonizedWave]] = {
    2012: _load_2012,
    2016: _load_2016,
    2018: _load_2018,
    2021: _load_2021,
}


def load_wave(wave: int, data_dir: Path | None = None) -> HarmonizedWave:
    if wave not in LOADERS:
        raise ValueError(f"Ola no soportada: {wave}")
    return LOADERS[wave](Path(data_dir or config.RAW_DATA_DIR))


def load_all_waves(data_dir: Path | None = None) -> dict[int, HarmonizedWave]:
    root = Path(data_dir or config.RAW_DATA_DIR)
    return {wave: load_wave(wave, root) for wave in config.WAVES}
