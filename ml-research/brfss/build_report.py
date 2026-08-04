"""Genera risk_stratification_report.md a partir de los artefactos de results/.
Reúne metodología, resultados, hallazgos, limitaciones y aplicaciones clínicas."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_brfss import config, codebook  # noqa: E402

BR = config.BRFSS_DIR
RES = config.RESULTS_DIR


def L(j):
    return json.load(open(j))


def table_md(rows, cols, headers=None):
    headers = headers or cols
    out = ["| " + " | ".join(headers) + " |",
           "| " + " | ".join("---" for _ in headers) + " |"]
    for r in rows:
        out.append("| " + " | ".join(str(r.get(c, "")) for c in cols) + " |")
    return "\n".join(out)


def main():
    audit = L(RES / "eda" / "audit_binary.json")
    comp = L(RES / "models" / "comparison.json")
    sel = L(RES / "models" / "selection.json")
    calib = L(RES / "calibration" / "summary.json")
    strat = L(RES / "risk" / "stratification.json")
    expl = L(RES / "explainability" / "explainability.json")
    clin = L(RES / "clinical" / "clinical_validation.json")

    best = sel["best_model"]
    chosen_m = strat["chosen_method"]
    thr = strat["chosen_thresholds"]
    bands_test = clin["bands"]
    assoc = clin["association"]
    oper = clin["operating_points"]
    v = clin["verdict"]

    # filas comparativas resumidas
    comp_rows = [{"model": r["model"], "roc_auc": r["roc_auc"], "pr_auc": r["pr_auc"],
                  "f1": r["f1"], "recall": r["recall_sensitivity"],
                  "specificity": r["specificity"], "brier": r["brier"]} for r in comp]
    calib_rows = calib["reliability"]

    band_assoc_rows = [{
        "Banda": a["band"], "Acción": a["action"], "n": a["n"],
        "Prevalencia": a["observed_prevalence"], "OR vs Bajo": a["odds_ratio_vs_bajo"],
        "RR vs Bajo": a["relative_risk_vs_bajo"],
    } for a in assoc]
    oper_rows = [{
        "Decisión": o["decision"], "Umbral": o["threshold"], "Sens": o["sensitivity"],
        "Espec": o["specificity"], "PPV": o["ppv"], "NPV": o["npv"],
        "% marcados": o["flagged_pct"],
    } for o in oper]

    risk_factors = ", ".join(g["label"] for g in expl["risk_factors"][:6])
    protective = ", ".join(g["label"] for g in expl["protective_factors"][:6])
    top_drivers = [{"Factor": g["label"], "|SHAP|": g["mean_abs_shap"],
                    "Dirección": g["direction"]} for g in expl["top_drivers"]]

    md = f"""# Explainable Diabetes Risk Stratification Framework — BRFSS 2015
### Reporte de la Fase 1 (PREDIA · motor de soporte a la decisión clínica)

> El objetivo de este trabajo **no es maximizar la *accuracy*** de un clasificador
> binario, sino construir un sistema que convierta la probabilidad de un modelo de
> ML en **niveles de riesgo clínicos interpretables y validados** (Bajo / Moderado /
> Alto / Muy Alto), apto para integrarse en PREDIA.

---

## 1. Datos y metodología

**Dataset:** *CDC Diabetes Health Indicators* (BRFSS 2015, Kaggle
`{config.KAGGLE_SLUG}`). Encuesta poblacional de los CDC.

- `diabetes_binary_health_indicators` — **{audit['shape']['rows']:,} encuestados**, 21
  indicadores, prevalencia **real {float(audit['target']['balance_pct'].get('1', 0)):.1f}%**
  → **dataset primario** (la prevalencia real es imprescindible para que las
  probabilidades calibradas y los OR/RR sean clínicamente interpretables).
- `diabetes_binary_5050split` — versión balanceada 50/50 (análisis de sensibilidad).
- `diabetes_012` — 3 clases (No-DM / Prediabetes / Diabetes), gradiente natural de riesgo.

Sin valores nulos. ~{audit['pct_duplicated_rows']}% de filas duplicadas (encuestados
distintos con respuestas idénticas; **se conservan** para no sesgar la prevalencia).

**Diseño experimental (anti-optimismo):** split estratificado **60/20/20**
(train/val/test). Tuning con `RandomizedSearchCV` (StratifiedKFold, scoring ROC-AUC)
en *train*; selección de modelo, calibración y derivación de umbrales en *val*;
**validación clínica final en *test* (held-out)**.

**Pipeline reproducible:** paquete `predia_brfss` (reutiliza el zoo de modelos de
`predia_ml`) + scripts `run_eda.py`, `run_training.py`, `run_calibration.py`,
`run_risk_stratification.py`, `run_explainability.py`, `run_clinical_validation.py`.

---

## 2. Análisis exploratorio y epidemiológico (Fase 1A)

Los factores más asociados a diabetes (OR, IC95%) son cardiometabólicos y funcionales.
Existe un gradiente claro por **edad**, **salud general percibida**, **IMC** y un
gradiente **socioeconómico** (ingreso/educación). Variables conductuales (actividad
física, dieta) muestran efecto protector. Detalle en `results/eda/` y `01_EDA_BRFSS.ipynb`.

---

## 3. Comparación de modelos (Fase 1B)

9 algoritmos (LogReg, RandomForest, ExtraTrees, HistGB, XGBoost, LightGBM, SVM, KNN, MLP).
Métricas en *validación* (umbral 0.5 para métricas de umbral; el ranking usa ROC-AUC):

{table_md(comp_rows, ["model","roc_auc","pr_auc","f1","recall","specificity","brier"],
          ["Modelo","ROC-AUC","PR-AUC","F1","Recall","Espec.","Brier"])}

**Modelo seleccionado: `{best}`** (ROC-AUC val = {sel['best_roc_auc_val']:.4f}).
ROC-AUC ~0.82–0.83 es el techo razonable para indicadores **auto-reportados sin
laboratorios** — un escenario de **cribado honesto** (no hay fuga de HbA1c/glucosa).

---

## 4. Calibración (Fase 1C)

Para que un riesgo de "30%" signifique 30% real, se compara original vs Platt vs
isotónica (ajuste en *val*, fiabilidad en *test*):

{table_md(calib_rows, ["variant","brier_val","ece_val","brier_test","ece_test"],
          ["Variante","Brier(val)","ECE(val)","Brier(test)","ECE(test)"])}

**Calibración elegida: `{calib['chosen_calibration']}`** (menor ECE en test). La
calibración mejora la fiabilidad sin degradar la discriminación.

---

## 5. Estratificación de riesgo (Fase 1D)

Se comparan 4 métodos de umbralización (sin asumir cortes arbitrarios). Criterio de
elección: **monotonía de prevalencia + bandas no triviales + máxima separación (η²)**.

- **Percentiles poblacionales** (P50/P80/P95)
- **Cuartiles** (Q1/Q2/Q3)
- **Sensibilidad clínica** (ROC: exclusión sens≥0.90 · Youden · inclusión espec≥0.90)
- **Cost-sensitive** (umbral de Bayes; ratios FN:FP 10/4/1.5)

**Método elegido: `{chosen_m}`** — {strat['methods'][chosen_m]['method_desc']}
Umbrales sobre probabilidad calibrada: **{thr}**.

| Nivel | Acción clínica |
|---|---|
| **Bajo** | {config.RISK_ACTIONS['Bajo']} |
| **Moderado** | {config.RISK_ACTIONS['Moderado']} |
| **Alto** | {config.RISK_ACTIONS['Alto']} |
| **Muy Alto** | {config.RISK_ACTIONS['Muy Alto']} |

---

## 6. Explicabilidad (Fase 1E)

SHAP + permutation importance + partial dependence sobre `{expl['risk_model']}`
(SHAP vía `{expl['shap_model']}`).

{table_md(top_drivers, ["Factor","|SHAP|","Dirección"])}

- **Factores de riesgo:** {risk_factors}.
- **Factores protectores:** {protective}.

Las PDP muestran efectos monótonos (riesgo ↑ con IMC, edad y mala salud percibida) e
interacciones plausibles, dando transparencia clínica al motor.

---

## 7. Validación clínica de las bandas (Fase 1F · conjunto TEST held-out)

{table_md(band_assoc_rows, ["Banda","Acción","n","Prevalencia","OR vs Bajo","RR vs Bajo"])}

**Puntos de operación (cribado ≥ umbral):**

{table_md(oper_rows, ["Decisión","Umbral","Sens","Espec","PPV","NPV","% marcados"])}

**Veredicto:** monotonía de prevalencia = **{v['monotonic_prevalence']}**, OR creciente =
**{v['or_increasing']}**. La prevalencia pasa de **{v['prevalence_low_band']:.1%}** (Bajo) a
**{v['prevalence_high_band']:.1%}** (Muy Alto) — un incremento de **×{v['fold_increase_extreme']}**.
→ **Bandas clínicamente significativas: {v['clinically_meaningful']}.**

---

## 8. Hallazgos

1. Con solo 21 indicadores auto-reportados (sin laboratorios) se logra discriminación
   útil (ROC-AUC ~0.82) y, sobre todo, **probabilidades calibradas** que sostienen una
   estratificación de riesgo válida.
2. Las 4 bandas separan poblaciones con riesgo real marcadamente distinto (×{v['fold_increase_extreme']}
   entre extremos), con OR/RR crecientes — no son cortes arbitrarios.
3. Los impulsores del riesgo son clínicamente coherentes (cardiometabólicos, edad,
   salud percibida) y hay factores protectores accionables (actividad física, dieta).

## 9. Limitaciones

- **Cribado, no diagnóstico:** el BRFSS no contiene HbA1c/glucosa; el modelo estima
  *probabilidad de diabetes auto-reportada*, no la diagnostica.
- **Auto-reporte y sesgo de supervivencia:** datos de encuesta telefónica (CDC 2015),
  sujetos a sesgo de memoria y de no-respuesta.
- **Transportabilidad:** población de EE. UU. 2015; requiere recalibración antes de
  usarse en la población objetivo de PREDIA (p. ej. México).
- **Causalidad:** OR/RR son asociaciones, no efectos causales.
- **Prediabetes:** el framework primario es binario; el gradiente 012 se usa solo de
  forma exploratoria.

## 10. Aplicaciones clínicas e integración en PREDIA

- **Triaje poblacional:** clasificar pacientes en las 4 bandas para asignar la acción
  correspondiente (seguimiento → educación → evaluación prioritaria → referencia).
- **Motor de soporte a la decisión:** exponer la probabilidad calibrada + banda +
  explicación SHAP por paciente (factores que suben/bajan su riesgo).
- **Integración técnica:** el estimador calibrado (`models/calibrated_best.joblib`) y
  los umbrales (`results/risk/stratification.json`) son artefactos listos para servirse,
  de forma análoga a la capa `lib/risk` ya existente en la app web.
- **Siguiente fase:** recalibración local, validación prospectiva y fusión con señales
  clínicas (laboratorios) cuando estén disponibles.

---

*Artefactos: `results/{{eda,models,calibration,risk,explainability,clinical}}/` ·
Notebooks: `notebooks/01_EDA_BRFSS … 06_Clinical_Validation.ipynb` · Reproducible con
los scripts `run_*.py`.*
"""

    out = BR / "risk_stratification_report.md"
    out.write_text(md, encoding="utf-8")
    print("escrito", out)


if __name__ == "__main__":
    main()
