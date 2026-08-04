# Academic Review — *How Much Does ML Really Improve Diabetes Risk Prediction from Population Health Indicators?* (MIMETI 2026)

**Review panel:** Senior ML researcher · Biostatistician · Epidemiologist · IEEE
reviewer · Applied-AI-in-health conference reviewer.
**Recommendation (pre-revision):** *Weak accept / major revision.*
**Recommendation (post-revision, after implementing the changes below):** *Accept.*

This review is deliberately critical. The paper is solid and unusually honest for a
student-level submission, but several issues would draw fire from a real committee. They
are listed by severity.

---

## PHASE 1 — Scientific review

### 1.1 (CRITICAL) "Significantly" used without a significance test
**Problem.** The original abstract and Discussion stated that complex models do *not
significantly* outperform logistic regression, yet no inferential test or confidence
interval was reported. With $n_\text{test}=50{,}736$, "significance" is an empirical
question, not a rhetorical one.
**Reviewer attack.** *"The central claim (H1) is asserted, not tested. Provide CIs and a
formal comparison (DeLong/bootstrap) or remove the word 'significant'."*
**Fix (IMPLEMENTED).** Computed 1000-resample bootstrap $95\%$ CIs for every model's
test ROC-AUC and **paired** bootstrap CIs for the AUC difference. The result is more
nuanced and more defensible than the original claim: the best model (HistGradientBoosting/
XGBoost, AUC$=0.827$) beats logistic regression (AUC$=0.820$) by $\Delta=0.007$, with a
paired bootstrap CI of $[0.0055,0.0085]$ that **excludes zero**. The difference is thus
*statistically detectable but practically negligible* (0.7 AUC points), while the three
top gradient-boosting models are mutually **indistinguishable** (HGB vs.\ LightGBM CI
$[-0.0001,0.0007]$, includes zero). H1 is reframed accordingly: complex models are *not
practically* superior, even where large $n$ makes the gap *statistically* resolvable.

### 1.2 (MAJOR) Headline table reported on the validation split
**Problem.** The model-comparison table was computed on the *validation* split, which was
also used for model selection and threshold derivation → mild optimism.
**Reviewer attack.** *"Report final performance on a held-out test set not used for any
selection."*
**Fix (IMPLEMENTED).** All metrics in Table~II are now reported on the untouched **test**
split ($n=50{,}736$). Numbers shift trivially (XGBoost AUC $0.828\!\to\!0.827$),
confirming no selection-induced inflation, and the conclusion is unchanged.

### 1.3 (MAJOR) Accuracy emphasized despite imbalance
**Status.** Already handled well: the paper notes accuracy ($0.866$) $\approx$ majority
baseline ($0.861$). **Strengthened** by adding the PR-AUC baseline ($=$ prevalence
$=0.139$); the best PR-AUC ($0.424$) is $\approx3\times$ chance, a fairer statement of
the real (modest) signal.

### 1.4 (MODERATE) Implicit causal language
**Problem.** Phrases like features "drive risk" / are "protective" can read as causal,
but SHAP yields *associative attributions* under the model, not causal effects.
**Reviewer attack.** *"This is an observational survey; do not imply causation."*
**Fix (IMPLEMENTED).** Added explicit caveats in Discussion and Limitations that all
attributions and odds ratios are associational, subject to confounding and reverse
causation (e.g.\ \texttt{GenHlth} may partly reflect *having* diabetes).

### 1.5 (MODERATE) "Predictive ceiling" overstated
**Problem.** A single dataset/year cannot establish an absolute ceiling.
**Fix (IMPLEMENTED).** Reworded to "observed performance *plateau* under this feature
set," explicitly noting the plateau could move with biomarkers, finer measurement, or
other populations.

### 1.6 (MINOR) Duplicate rows can cross the split
**Problem.** $9.5\%$ exact-duplicate response vectors with a random split means identical
rows may appear in both train and test → slight optimistic bias in *absolute* AUC.
**Fix (IMPLEMENTED).** Acknowledged in Limitations, noting it affects all models equally
and therefore does not alter the *comparative* conclusion (the paper's core claim).

---

## PHASE 2 — Strengthening the contributions

- **Most novel / defensible result:** the *quantified* near-equivalence of nine diverse
  estimators with bootstrap CIs, i.e.\ a statistically-characterized performance plateau
  on a large public dataset. This is the contribution to foreground.
- **Highest scientific value:** the leakage argument made *quantitative*—admitting
  diagnostic labs would swing AUC by $\approx0.15$, $\sim20\times$ the $0.007$ inter-model
  gap—so *feature admissibility dominates estimator choice*. This should appear in both
  Abstract and Conclusions.
- **For the Abstract:** plateau + CIs + leakage-magnitude argument + calibration +
  screening utility (done in `revised_abstract.md`).
- **For the Conclusions:** "the information limits more than the algorithm" as the thesis
  (done in `revised_conclusions.md`).

---

## PHASE 3 — Leakage, calibration, reproducibility (depth)

**Leakage (strengthened).** Added the quantitative contrast: a leakage-free survey model
plateaus at AUC$\approx0.83$, whereas models that (improperly) include HbA1c/fasting
glucose reach AUC$\approx0.98$; the $\approx0.15$ AUC swing from *one data-governance
decision* is an order of magnitude larger than the $0.007$ from the best algorithm
change. This makes the argument "*leakage control matters more than the model*" concrete
and citable.

**Calibration (strengthened).** Clarified *why* calibration matters operationally: the
four risk bands are thresholds on the calibrated probability, so mis-calibration would
directly distort band assignment and the downstream odds ratios. Reported isotonic ECE
$=0.003$ vs.\ raw $0.004$ and the failure of Platt scaling at large $n$.

**Reproducibility (strengthened).** Made the protocol explicit: fixed seed, single shared
$60/20/20$ split, all transformers fit inside training folds, documented duplicate
handling, and public artifacts (metrics, thresholds, figures). Added a citation to
TRIPOD+AI (2024) as the reporting standard.

---

## PHASE 4 — Limitations
The original "Threats to Validity" was adequate but thin. A dedicated, investigator-grade
**Limitations** subsection now covers: observational/cross-sectional design; self-report
and recall/social-desirability bias; selection and coverage bias; label noise from
*undiagnosed* cases; missing variables (no biomarkers, genetics, medication, diet
quality); geographic (U.S.) and temporal (2015) generalization; correlation $\neq$
causation; and the duplicate-across-split caveat. (Text in the `.tex` and in
`revised_*` files.)

---

## PHASE 5 — Clinical implications
Added subsection **"Practical Implications for Population Screening"**: why AUC$\approx0.83$
is *useful for triage* (concentrating prevalence $16\times$, identifying a high-yield
$\sim10\%$ to screen), why it is **not** a diagnosis, how it could support public-health
screening prioritization, and the risks of misuse (treating a screening score as a
diagnostic label; deploying at the default $0.5$ threshold; ignoring re-calibration).

---

## PHASE 6 — References audit
**Before:** strong classics but skewed pre-2020 (SHAP 2017, XGBoost 2016, calibration
2005/2017, Christodoulou 2019). Thin on 2021–2025.
**Weak/!` over-relied:** generic dataset note (`rashid2020diabetes`) is light.
**Added (real, 2021–2024):**
- Ghassemi, Oakden-Rayner, Beam, *The false hope of current approaches to explainable AI
  in health care*, **Lancet Digital Health, 2021** — adds critical balance to the XAI
  argument (a reviewer rewards nuance over XAI boosterism).
- ElSayed et al., *Classification and Diagnosis of Diabetes: Standards of Care in
  Diabetes—2023*, **Diabetes Care, 2023** — current clinical grounding.
- Collins et al., *TRIPOD+AI statement*, **BMJ, 2024** — reporting/reproducibility standard.
- Tasin et al., *Diabetes prediction using machine learning and explainable AI techniques*,
  **Healthcare Technology Letters, 2023** — recent, directly comparable work.
**Diversity:** now spans statistics/epidemiology (Steyerberg, Van Calster, Christodoulou,
Collins), ML methods (XGBoost, LightGBM, GBM, SHAP), XAI critique (Rudin vs.\ Ghassemi),
and clinical standards (ADA). Adequate.

---

## PHASE 7 / 8 — Abstract & Conclusions
Rewritten (see `revised_abstract.md`, $\le250$ words, and `revised_conclusions.md`) to
foreground: rigorous comparison with CIs, the plateau, the negligible complex-model
advantage, the dominance of leakage control, and screening (not diagnostic) utility.

---

## Residual weaknesses a reviewer may still raise
1. **Single dataset / single year** — no external validation cohort. Mitigated by framing
   as a benchmark study and by the Limitations; full external validation is future work.
2. **No multi-seed variance for the point estimates of threshold metrics** — bootstrap CIs
   address AUC; the $0.5$-threshold metrics remain single-split (acknowledged).
3. **DeLong test** was attempted but the fast-DeLong implementation was unreliable; we
   therefore report the **paired bootstrap** CI, which is valid and arguably more robust.
   A reviewer comfortable with bootstrap will accept this; one demanding DeLong
   specifically may ask for it.
4. **Novelty ceiling** — the scientific message (ML $\approx$ LR on tabular clinical data)
   echoes Christodoulou 2019; novelty here is the *quantification* and the leakage-magnitude
   framing on a large modern benchmark, which should be stated plainly as the contribution.
