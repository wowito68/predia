#!/usr/bin/env python3
"""Post-lock domain variance sensitivity; never fits or updates a risk model."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.stats import t
from sklearn.metrics import roc_auc_score

PROJECT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT / "src"))
import run_pipeline
from predia_ensanut import config
from predia_ensanut.harmonize import _id_part, _numeric, _read_csv, load_all_waves
from predia_ensanut.models import predict_probability
from postlock_subgroup_analysis import _group_columns


def ratio_linearization(numerator, denominator, weight):
    a, b, w = map(lambda x: np.asarray(x, dtype=float), (numerator, denominator, weight))
    if a.ndim != 1 or not (a.shape == b.shape == w.shape) or not len(a):
        raise ValueError("Nonempty matching vectors required")
    if not all(np.isfinite(x).all() for x in (a, b, w)) or (w < 0).any() or (b < 0).any():
        raise ValueError("Invalid ratio data")
    total = np.dot(w, b)
    if total <= 0:
        raise ValueError("Positive weighted denominator required")
    estimate = np.dot(w, a) / total
    return float(estimate), w * (a - estimate * b) / total


def auc_linearization(y, score, weight):
    y, score, w = map(np.asarray, (y, score, weight))
    if y.ndim != 1 or not (y.shape == score.shape == w.shape):
        raise ValueError("Matching vectors required")
    if not np.isin(y, [0, 1]).all() or not np.isfinite(score).all() or not np.isfinite(w).all() or (w < 0).any():
        raise ValueError("Invalid AUC data")
    positive, negative = y == 1, y == 0
    wp, wn = w[positive].sum(), w[negative].sum()
    if min(wp, wn) <= 0:
        raise ValueError("Both classes need positive weight")
    # Weighted case-control placements include half-credit for tied scores.
    pair = (score[positive, None] > score[negative]).astype(float)
    pair += .5 * (score[positive, None] == score[negative])
    cases = pair @ w[negative] / wn
    controls = w[positive] @ pair / wp
    estimate = float(np.dot(w[positive], cases) / wp)
    influence = np.zeros(len(y))
    influence[positive] = w[positive] * (cases - estimate) / wp
    influence[negative] = w[negative] * (controls - estimate) / wn
    return estimate, influence


def design_variance(influence, design, singleton="average"):
    u = np.asarray(influence, float)
    if u.shape != (len(design),) or not np.isfinite(u).all():
        raise ValueError("Invalid influence vector")
    if design[["stratum", "psu"]].isna().any().any():
        raise ValueError("Missing design identifiers")
    if singleton not in ("omit", "center", "average"):
        raise ValueError("Unknown singleton treatment")
    totals = design[["stratum", "psu"]].assign(u=u).groupby(["stratum", "psu"], sort=False).u.sum()
    multi, singles = [], []
    for _, values in totals.groupby(level=0, sort=False):
        values = values.to_numpy()
        if len(values) > 1:
            multi.append(len(values)/(len(values)-1) * np.square(values-values.mean()).sum())
        else:
            singles.append(values[0])
    if not multi:
        raise ValueError("No replicated strata for variance estimation")
    extra = 0.0
    if singleton == "center":
        extra = np.square(np.asarray(singles)-totals.mean()).sum()
    elif singleton == "average":
        extra = len(singles) * np.mean(multi)
    return float(np.sum(multi) + extra)


def domain_df(design, domain):
    units = design.loc[np.asarray(domain, bool), ["stratum", "psu"]].drop_duplicates()
    df = len(units) - units.stratum.nunique()
    if df <= 0:
        raise ValueError("Domain has no design degrees of freedom")
    return int(df)


def interval(estimate, influence, design, domain):
    df = domain_df(design, domain)
    result = {"estimate": float(estimate), "df": df}
    for method in ("omit", "center", "average"):
        se = np.sqrt(design_variance(influence, design, method))
        margin = t.ppf(.975, df) * se
        result[method] = {"se": float(se), "lower": float(estimate-margin), "upper": float(estimate+margin)}
    return result


def jackknife_variance(design, weight, statistic):
    w = np.asarray(weight, float)
    estimate = np.asarray(statistic(w), float)
    variance = np.zeros_like(estimate)
    reps = 0
    for _, group in design.groupby("stratum", sort=False):
        units = list(group.groupby("psu", sort=False).groups.values())
        m = len(units)
        if m < 2:
            continue
        for unit in units:
            rw = w.copy()
            rw[group.index] *= m/(m-1)
            rw[unit] = 0
            value = np.asarray(statistic(rw), float)
            if not np.isfinite(value).all():
                raise ValueError("Undefined jackknife replicate")
            variance += (m-1)/m * np.square(value-estimate)
            reps += 1
    return estimate, variance, reps


def load_design(cohort):
    path = config.RAW_DATA_DIR / "2021/ensasangre21_entrega_w_integrada.csv"
    raw = _read_csv(path, ["FOLIO_INT", "ponde_g", "est_sel", "upm"], ("FOLIO_INT", "upm"))
    raw = raw.loc[_numeric(raw.ponde_g).gt(0)].reset_index(drop=True)
    design = pd.DataFrame({"person_id": "2021:"+_id_part(raw.FOLIO_INT), "survey_weight": _numeric(raw.ponde_g),
                           "stratum": "2021:"+_id_part(raw.est_sel), "psu": "2021:"+_id_part(raw.upm)})
    if design.person_id.duplicated().any() or not cohort.person_id.isin(design.person_id).all():
        raise ValueError("Invalid domain linkage")
    original = cohort.set_index("person_id")
    linked = design.set_index("person_id").loc[original.index]
    for column in ("survey_weight", "stratum", "psu"):
        np.testing.assert_array_equal(linked[column].to_numpy(), original[column].to_numpy())
    return design


def analyze(design, cohort, probability, threshold):
    work = _group_columns(cohort).assign(probability=probability)
    frame = design.merge(work.drop(columns=["survey_weight", "stratum", "psu"]), on="person_id", how="left", validate="one_to_one")
    domain = frame.probability.notna().to_numpy()
    w = frame.survey_weight.to_numpy(float)
    y = frame.dysglycemia_fpg.fillna(0).to_numpy(float)
    p = frame.probability.fillna(0).to_numpy(float)
    r = (p >= threshold).astype(float)
    results = {}

    def add_ratio(name, a, b):
        estimate, influence = ratio_linearization(a, b, w)
        results[name] = interval(estimate, influence, design, np.asarray(b) > 0)

    for name, a, b in (
        ("prevalence", y*domain, domain), ("sensitivity", y*r*domain, y*domain),
        ("specificity", (1-y)*(1-r)*domain, (1-y)*domain), ("referral_fraction", r*domain, domain),
        ("ppv", y*r*domain, r*domain), ("npv", (1-y)*(1-r)*domain, (1-r)*domain),
        ("brier", (y-p)**2*domain, domain), ("detected_per_1000", 1000*y*r*domain, domain),
        ("missed_per_1000", 1000*y*(1-r)*domain, domain),
    ):
        add_ratio(name, a, b)

    def add_auc(name, mask, score):
        estimate, values = auc_linearization(y[mask], score[mask], w[mask])
        full = np.zeros(len(frame)); full[mask] = values
        results[name] = interval(estimate, full, design, mask)
        return estimate, full

    add_auc("roc_auc", domain, p)
    common = domain & frame.mexican_score.notna().to_numpy()
    score = frame.mexican_score.fillna(0).to_numpy(float)
    a, ua = add_auc("common_model_auc", common, p)
    b, ub = add_auc("common_score_auc", common, score)
    results["common_auc_difference"] = interval(a-b, ua-ub, design, common)

    for label in ("20-34", "35-54", "55+"):
        age = frame.age_group.eq(label).fillna(False).to_numpy(bool) & domain
        misses = y*(1-r)*age
        add_ratio(f"age/{label}/missed_within_1000", 1000*misses, age)
        add_ratio(f"age/{label}/missed_total_1000", 1000*misses, domain)
        add_ratio(f"age/{label}/share_all_missed", misses, y*(1-r)*domain)
        add_ratio(f"age/{label}/sensitivity", y*r*age, y*age)

    dca = []
    for cutoff in sorted(set(np.round(np.arange(.05, .501, .01), 2)) | {threshold}):
        selected = p >= cutoff
        contribution = (y-(1-y)*cutoff/(1-cutoff))*domain
        values = {}
        for method, numerator in (("model", contribution*selected), ("all", contribution),
                                   ("difference_all", contribution*(selected.astype(float)-1))):
            estimate, u = ratio_linearization(numerator, domain, w)
            values[method] = interval(estimate, u, design, domain)
        dca.append({"threshold": float(cutoff), **values})

    def auc_statistics(rw):
        return [roc_auc_score(y[domain], p[domain], sample_weight=rw[domain]),
                roc_auc_score(y[common], p[common], sample_weight=rw[common])-
                roc_auc_score(y[common], score[common], sample_weight=rw[common])]
    point, variance, repetitions = jackknife_variance(design, w, auc_statistics)
    jackknife = {"method": "JKn; singleton contributions fixed; t intervals", "replicates": repetitions, "metrics": {}}
    for i, key in enumerate(("roc_auc", "common_auc_difference")):
        df = results[key]["df"]
        margin = t.ppf(.975, df)*np.sqrt(variance[i])
        jackknife["metrics"][key] = {"estimate": float(point[i]), "se": float(np.sqrt(variance[i])),
                                     "lower": float(point[i]-margin), "upper": float(point[i]+margin), "df": df}
    return results, dca, jackknife


def plot_figures(results, curves, output):
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10})
    colors = {"model": "#236D69", "all": "#9B5660"}
    fig, axes = plt.subplots(3, 1, figsize=(8.4, 9.2), layout="constrained")
    calibration = pd.read_csv(config.RESULTS_DIR / "calibration_2021.csv")
    axes[0].plot(calibration.predicted, calibration.observed, "o-", color=colors["model"], label="Modelo bloqueado")
    axes[0].plot([0, .65], [0, .65], "--", color="#747B80", label="Calibración ideal")
    axes[0].set(xlabel="Probabilidad media predicha", ylabel="Frecuencia observada", title="A. Calibración temporal", xlim=(0,.65), ylim=(0,.65))
    axes[0].legend(frameon=False, loc="upper left")
    x = [row["threshold"] for row in curves]
    for method, label in (("model", "Modelo bloqueado"), ("all", "Remitir a todos")):
        axes[1].plot(x, [row[method]["estimate"] for row in curves], color=colors[method], label=label)
        axes[1].fill_between(x, [row[method]["average"]["lower"] for row in curves], [row[method]["average"]["upper"] for row in curves], color=colors[method], alpha=.13)
    axes[1].axhline(0, color="#747B80", ls="--", label="Remitir a nadie")
    axes[1].set(xlabel="Umbral", ylabel="Beneficio neto", title="B. Beneficio neto e IC95% puntuales")
    axes[1].legend(frameon=False, fontsize=9, ncol=3)
    for method, label, color in (("model", "Modelo menos nadie", colors["model"]), ("difference_all", "Modelo menos todos", colors["all"])):
        axes[2].plot(x, [row[method]["estimate"] for row in curves], label=label, color=color)
        axes[2].fill_between(x, [row[method]["average"]["lower"] for row in curves], [row[method]["average"]["upper"] for row in curves], color=color, alpha=.13)
    axes[2].axhline(0, color="#747B80", ls="--")
    axes[2].set(xlabel="Umbral", ylabel="Diferencia de beneficio neto", title="C. Contrastes emparejados e IC95% puntuales", xlim=(.05,.30))
    axes[2].legend(frameon=False, fontsize=9)
    for ax in axes:
        ax.spines[["top", "right"]].set_visible(False); ax.grid(alpha=.15); ax.set_axisbelow(True)
    fig.savefig(output/"calibration_decision_sensitivity.png", dpi=240, facecolor="white")
    plt.close(fig)

    groups = ["20-34", "35-54", "55+"]
    fig, axes = plt.subplots(1, 2, figsize=(9, 4.5), layout="constrained")
    for ax, measure, title in zip(axes, ("missed_within_1000", "missed_total_1000"),
                                  ("Por 1,000 del mismo grupo", "Por 1,000 de la cohorte total")):
        rows = [results[f"age/{g}/{measure}"] for g in groups]
        for j, row in enumerate(rows):
            ax.plot([row["average"]["lower"], row["average"]["upper"]], [j,j], color="#236D69", lw=2)
            ax.plot(row["estimate"],j,"o",color="#236D69")
            ax.annotate(f"{row['estimate']:.1f}", (row["estimate"],j), xytext=(0,10), textcoords="offset points", ha="center", fontsize=10)
        ax.set_yticks(range(3), [f"{g} años" for g in groups]); ax.invert_yaxis()
        ax.set_title(title, fontsize=11, loc="left", pad=16); ax.set_xlabel("Alteraciones omitidas")
        ax.set_ylim(2.6,-.6); ax.spines[["top","right"]].set_visible(False); ax.grid(axis="x",alpha=.2)
    fig.savefig(output/"age_omissions_domain_ci.png", dpi=240, facecolor="white")
    plt.close(fig)


def main():
    output = config.RESULTS_DIR / "design_sensitivity"
    if output.exists():
        raise RuntimeError("Design sensitivity already exists; do not overwrite")
    lock = json.loads((config.RESULTS_DIR/"model_lock.json").read_text())
    run_pipeline.verify_lock(lock, config.RAW_DATA_DIR, allow_code_drift=False)
    primary = config.RESULTS_DIR/"evaluation_2021.json"
    primary_hash = run_pipeline.file_sha256(primary)
    evaluation = json.loads(primary.read_text())
    if evaluation["lock_sha256"] != run_pipeline.file_sha256(config.RESULTS_DIR/"model_lock.json"):
        raise ValueError("Primary evaluation does not match the lock")
    development = json.loads((config.RESULTS_DIR/"development.json").read_text())
    waves = load_all_waves()
    flow_rows, missing_rows = [], []
    steps = ("linked_rows", "age_20_to_110", "known_diabetes_status", "without_prior_diabetes", "not_currently_pregnant", "fasting_sample", "positive_survey_weight", "valid_fasting_glucose")
    for year, wave in waves.items():
        expected = (evaluation if year==2021 else development)["cohort_flow"][str(year)]
        if wave.flow != expected:
            raise ValueError(f"Cohort flow changed: {year}")
        before = None
        for step in steps:
            remaining = wave.flow[step]
            flow_rows.append({"wave":year,"step":step,"remaining":remaining,"excluded_step":None if before is None else before-remaining})
            before = remaining
        for feature in (*config.ENHANCED_FEATURES, "hba1c_pct"):
            absent = wave.cohort[feature].isna()
            missing_rows.append({"wave":year,"predictor":feature,"n":len(absent),"missing":int(absent.sum()),
                                 "missing_pct":float(absent.mean()*100),"missing_weighted_pct":float(np.average(absent,weights=wave.cohort.survey_weight)*100)})
    experiment = lock["experiments"]["core"]
    selected = next(m for m in experiment["models"] if m["family"]==experiment["recommended_family"])
    cohort = waves[2021].cohort
    model = joblib.load(PROJECT/selected["artifact"])
    probability = predict_probability(model,cohort,tuple(experiment["features"]))
    design = load_design(cohort)
    results, curves, jackknife = analyze(design,cohort,probability,selected["threshold"])
    original = next(m for m in evaluation["experiments"]["core"]["models"] if m["family"]==selected["family"])["test"]
    for key in ("roc_auc","sensitivity","specificity","referral_fraction","ppv","npv","brier"):
        np.testing.assert_allclose(results[key]["estimate"], original[key], rtol=0, atol=1e-12)
    counts = design.groupby("stratum").psu.nunique()
    payload = {"status":"post-lock exploratory sensitivity; no model refitting", "created_at_utc":datetime.now(timezone.utc).isoformat(),
               "script_sha256":run_pipeline.file_sha256(Path(__file__)), "addendum_sha256":run_pipeline.file_sha256(PROJECT/"DESIGN_SENSITIVITY_ADDENDUM.md"),
               "primary_evaluation_sha256":primary_hash,"study_fingerprint":lock["study_fingerprint"],"threshold":selected["threshold"],
               "design":{"records":len(design),"eligible":len(cohort),"strata":len(counts),"psus":int(counts.sum()),"singleton_strata":int((counts==1).sum())},
               "metrics":results,"decision_curve":curves,"jackknife":jackknife,"cohort_flows":flow_rows,"missingness":missing_rows,
               "limits":["Conditional on fixed model", "Public design not full original multistage design", "Singleton variance adjustments are sensitivity assumptions", "Pointwise, not simultaneous, intervals"]}
    if run_pipeline.file_sha256(primary)!=primary_hash:
        raise ValueError("Primary file changed")
    output.mkdir()
    (output/"analysis.json").write_text(json.dumps(payload,indent=2,ensure_ascii=False,allow_nan=False))
    pd.DataFrame(flow_rows).to_csv(output/"cohort_flow.csv",index=False)
    pd.DataFrame(missing_rows).to_csv(output/"missingness.csv",index=False)
    flat = [{"metric":key,"estimate":row["estimate"],"df":row["df"],"method":method,**row[method]} for key,row in results.items() for method in ("omit","center","average")]
    pd.DataFrame(flat).to_csv(output/"variance_sensitivity.csv",index=False)
    plot_figures(results, curves, output)
    print(json.dumps({"output":str(output),"design":payload["design"],"auc":results["roc_auc"],"auc_difference":results["common_auc_difference"],"jackknife":jackknife},indent=2))


if __name__ == "__main__":
    main()
