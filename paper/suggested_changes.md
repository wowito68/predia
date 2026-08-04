# Suggested Changes — paper_ml_diabetes_mimeti2026.tex

Cambios concretos derivados de la revisión (`academic_review.md`). Marcados
[IMPLEMENTADO] tras aplicarlos al `.tex`.

## A. Rigor estadístico (crítico)
1. **[IMPLEMENTADO] Intervalos de confianza del AUC + test de DeLong.** Antes el paper
   afirmaba "no significativamente mejor" sin prueba. Se añadió: CI bootstrap (1000
   resamples) del ROC-AUC en TEST por modelo, y test de DeLong para XGBoost vs.\ LR y
   vs.\ los demás líderes. Nuevo `results/models/significance.json` (no se reentrenó).
2. **[IMPLEMENTADO] Tabla de modelos reportada en TEST (held-out), no en validación.**
   Validación se usó para selección/umbral; reportar ahí es ligeramente optimista. Se
   recomputaron todas las métricas en el conjunto test.
3. **[IMPLEMENTADO] Línea base de PR-AUC.** Con prevalencia 0.139, el PR-AUC aleatorio
   es 0.139; un PR-AUC de ~0.43 es ~3× la base. Se explicita.
4. **[IMPLEMENTADO] Párrafo de "Statistical comparison" en Metodología** (bootstrap,
   DeLong, comparación emparejada) → cierra la amenaza a la validez de conclusión.

## B. Afirmaciones y wording
5. **[IMPLEMENTADO]** "predictive ceiling" → "observed performance plateau under this
   feature set"; se evita lenguaje absoluto.
6. **[IMPLEMENTADO]** "significantly" se respalda ahora con DeLong (p reportado) o se
   sustituye por "appreciably/meaningfully" donde no hay prueba formal.
7. **[IMPLEMENTADO]** Causalidad: SHAP se describe explícitamente como atribución
   asociativa, no causal (Discusión + Limitaciones).

## C. Leakage / calibración / reproducibilidad (profundizar)
8. **[IMPLEMENTADO] Argumento cuantificado de leakage:** incluir HbA1c/glucosa llevaría
   el AUC de ~0.83 a ~0.98 (Δ≈0.15), un orden de magnitud mayor que el Δ≈0.007 entre
   algoritmos → "controlar el leakage importa ~20× más que cambiar de modelo".
9. **[IMPLEMENTADO]** Reproducibilidad: transformadores ajustados dentro de folds, manejo
   de duplicados, semilla fija, artefactos públicos; cita a TRIPOD+AI (2024).

## D. Limitaciones (sección reforzada)
10. **[IMPLEMENTADO]** Sección de Limitaciones ampliada y explícita: diseño observacional/
    transversal; autorreporte; sesgo de selección/cobertura; variables faltantes (sin
    biomarcadores/genética/medicación); ruido de etiqueta (no diagnosticados);
    generalización geográfica (EE.UU.) y temporal (2015); correlación ≠ causalidad;
    duplicados que cruzan el split (inflación leve, igual para todos los modelos).

## E. Implicaciones clínicas (subsección nueva)
11. **[IMPLEMENTADO] "Practical Implications for Population Screening":** por qué
    AUC≈0.83 es útil (triaje/priorización), por qué NO es diagnóstico, uso en salud
    pública, y riesgos de mal uso clínico.

## F. Referencias
12. **[IMPLEMENTADO]** Añadidas 2021–2024: Ghassemi et al.\ 2021 (crítica a XAI post-hoc,
    Lancet Digital Health), ElSayed et al.\ 2023 (ADA Standards), Collins et al.\ 2024
    (TRIPOD+AI), Tasin et al.\ 2023 (diabetes ML+XAI). Equilibran la discusión de
    interpretabilidad y aportan actualidad.

## G. Abstract y Conclusiones
13. **[IMPLEMENTADO]** Abstract reescrito (≤250 palabras) — ver `revised_abstract.md`.
14. **[IMPLEMENTADO]** Conclusiones reescritas con los 5 mensajes — ver
    `revised_conclusions.md`.
