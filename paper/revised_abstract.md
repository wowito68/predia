# Revised Abstract (249 words)

Machine learning (ML) is widely promoted for population-level diabetes risk
prediction, often with claims of large gains over classical models. We test these
claims rigorously on the CDC *Diabetes Health Indicators* dataset (BRFSS 2015;
*n* = 253,680; prevalence 13.9%), a leakage-free, pre-laboratory screening scenario
containing only self-reported survey indicators. Under one uniform protocol—stratified
60/20/20 splitting, randomized hyper-parameter search, transformers fit inside training
folds, and threshold-free ranking by ROC-AUC—we benchmark nine estimators and quantify
uncertainty with 1000-resample bootstrap confidence intervals on the held-out test set.
The strongest model (histogram gradient boosting / XGBoost) reaches ROC-AUC = 0.827
[0.822, 0.832]; ℓ2-regularized logistic regression reaches 0.820 [0.815, 0.824]. The
paired difference is only ΔAUC = 0.007 (bootstrap CI [0.006, 0.009]): statistically
resolvable given the large sample, yet practically negligible, while the leading
gradient-boosting models are mutually indistinguishable. Nine very different inductive
biases saturate near AUC ≈ 0.83, evidencing a performance plateau set by the information
content of the inputs rather than by algorithm choice. We further show that accuracy
(0.866 ≈ the 0.861 majority baseline) is misleading; that isotonic calibration yields
trustworthy probabilities (expected calibration error 0.003); and that a
calibration-derived cost-sensitive four-level stratification separates observed
prevalence 16-fold (2.9%→48.0%; odds ratio 30.7 [28.0, 33.6]) on held-out data.
Critically, admitting diagnostic biomarkers would swing AUC by ≈0.15—about twenty times
the inter-model gap—so controlling information leakage matters far more than changing the
model. Honest evaluation, calibration, interpretability and reproducibility thus deliver
more clinical value than marginal accuracy, and such models support screening, not
diagnosis.
