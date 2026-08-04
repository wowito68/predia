# Revised Conclusions

We benchmarked nine machine-learning estimators for diabetes risk prediction on a large,
leakage-free population survey (BRFSS 2015), with bootstrap confidence intervals on a
held-out test set. Five central conclusions follow.

1. **The available information limits performance more than the algorithm does.** Nine
   estimators with radically different capacity saturate at ROC-AUC ≈ 0.83; the plateau
   reflects the information content of coarse, self-reported indicators, not a deficiency
   of any particular model.

2. **Complex models offer only marginal improvement.** The best gradient-boosting model
   exceeds ℓ2-regularized logistic regression by ΔAUC = 0.007 (bootstrap CI
   [0.006, 0.009])—statistically resolvable at this sample size but practically
   negligible—and the leading non-linear models are mutually indistinguishable. Reported
   accuracy (0.866) is misleading, barely exceeding the 0.861 majority baseline.

3. **Interpretability is clinically valuable.** SHAP and permutation importance agree and
   recover established cardiometabolic and socioeconomic risk structure, giving clinicians
   an auditable account of risk; where a transparent model matches a complex one, the
   transparent model should be preferred.

4. **Controlling information leakage is essential—and dominant.** Because BRFSS contains
   no diagnostic biomarkers, our evaluation is honest by construction; admitting HbA1c or
   fasting glucose would inflate AUC by ≈0.15, roughly twenty times the gap between the
   best and the simplest model. Feature-admissibility governance, not estimator choice, is
   the decisive modelling decision.

5. **These models support screening, not diagnosis.** The actionable output is a
   *calibrated probability* and its mapping to risk bands that separate observed prevalence
   16-fold on held-out data—useful for triage and public-health prioritization, but unfit
   as a diagnostic label and requiring local re-calibration and continuous monitoring
   before any deployment.

In sum, for diabetes prediction from population health indicators, rigour, calibration,
interpretability and reproducibility deliver more value than the pursuit of marginal
accuracy.
