"""Genera los 6 notebooks entregables de la Fase 1 leyendo los artefactos ya
computados en results/. Se ejecutan después con:
    jupyter nbconvert --to notebook --execute --inplace notebooks/*.ipynb

Patrón: cada notebook es la capa de presentación (narrativa clínica + carga de
tablas/figuras), de modo que su ejecución es rápida y reproducible.
"""
from __future__ import annotations

from pathlib import Path

import nbformat as nbf
from nbformat.v4 import new_code_cell, new_markdown_cell, new_notebook

NB_DIR = Path(__file__).resolve().parent / "notebooks"
NB_DIR.mkdir(parents=True, exist_ok=True)


def md(t):
    return new_markdown_cell(t)


def code(t):
    return new_code_cell(t)


def write(name, cells):
    nb = new_notebook()
    nb["cells"] = cells
    nb["metadata"] = {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python"},
    }
    with open(NB_DIR / name, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    print("escrito", name)


SETUP = """# --- Setup: rutas y utilidades de presentación ---
import sys, json
from pathlib import Path
import pandas as pd
from IPython.display import Image, display, Markdown

BR = Path.cwd().parent if Path.cwd().name == "notebooks" else Path.cwd()
sys.path.insert(0, str(BR / "src"))
sys.path.insert(0, str(BR.parent / "src"))
from predia_brfss import config, codebook

RES = BR / "results"
def show(p, w=None):
    display(Image(filename=str(p), width=w))
def table(csv, **kw):
    return pd.read_csv(csv, **kw)
def load(j):
    return json.load(open(j))
pd.set_option("display.max_columns", 40)
print("Entorno listo:", BR)
"""


def nb01():
    return [
        md("# 01 — Análisis Exploratorio y Epidemiológico (BRFSS 2015)\n\n"
           "**Fase 1A.** Dataset *CDC Diabetes Health Indicators* (BRFSS 2015), "
           "253,680 encuestados, 21 indicadores de salud, prevalencia poblacional "
           "**real ~13.9%**. El objetivo de esta fase es entender la estructura de los "
           "datos y la epidemiología de la diabetes antes de modelar."),
        code(SETUP),
        md("## Distribución de clases\n"
           "Desbalance real (13.9% positivos) — clave: NO re-balancear el dataset "
           "primario, porque la prevalencia real es necesaria para que las "
           "probabilidades y los OR/RR posteriores sean clínicamente interpretables. "
           "El dataset *012* muestra el gradiente natural No-DM → Prediabetes → DM."),
        code("a = load(RES/'eda'/'audit_binary.json')\n"
             "print('Filas:', a['shape']['rows'], '| Duplicados:', a['n_duplicated_rows'],\n"
             "      f\"({a['pct_duplicated_rows']}%)\", '| Nulos:', a['total_nulls'])\n"
             "print('Balance (%):', a['target']['balance_pct'])\n"
             "show(RES/'eda'/'class_distribution.png')"),
        md("**Duplicados (~9.5%):** esperable en BRFSS — son encuestados distintos con "
           "idénticas respuestas categóricas, no errores; se conservan (eliminarlos "
           "sesgaría la prevalencia)."),
        md("## Correlaciones con el objetivo\nSeñal preliminar (rojo = riesgo, azul = protector)."),
        code("show(RES/'eda'/'correlation_with_target.png')\n"
             "show(RES/'eda'/'correlation_heatmap.png')"),
        md("## Gradientes de prevalencia por variables ordinales\n"
           "La prevalencia crece monótonamente con la edad, peor salud percibida, "
           "mayor IMC y menor ingreso/educación — coherente con la epidemiología de la DM2."),
        code("show(RES/'eda'/'prevalence_gradients.png')"),
        md("## Análisis epidemiológico (Odds Ratio / Riesgo Relativo)\n"
           "Asociación de cada factor binario con la diabetes, agrupada por dominio "
           "(cardiometabólico, conductual, funcional, socioeconómico)."),
        code("table(RES/'eda'/'epidemiology_associations.csv')"),
        code("show(RES/'eda'/'epidemiology_forest.png')"),
        md("## Importancia preliminar y outliers"),
        code("display(table(RES/'eda'/'preliminary_importance.csv'))\n"
             "show(RES/'eda'/'preliminary_importance.png')"),
        code("table(RES/'eda'/'outliers_summary.csv', index_col=0)"),
        md("### Conclusiones Fase 1A\n"
           "- Factores **cardiovasculares/metabólicos** (hipertensión, colesterol, IMC, "
           "cardiopatía) y **funcionales** (salud general percibida, dificultad para "
           "caminar) son los más asociados.\n"
           "- Existe un **gradiente socioeconómico** (ingreso/educación) y de **edad**.\n"
           "- Variables **conductuales** (actividad física, dieta) muestran efecto "
           "protector.\n"
           "- El desbalance y la prevalencia real motivan el enfoque de **probabilidad "
           "calibrada + estratificación**, no un simple clasificador 0/1."),
    ]


def nb02():
    return [
        md("# 02 — Entrenamiento y Comparación de Modelos\n\n"
           "**Fase 1B.** Nueve algoritmos entrenados con `RandomizedSearchCV` "
           "(StratifiedKFold, scoring ROC-AUC) sobre el split 60/20/20. Métricas con "
           "énfasis clínico; el objetivo NO es maximizar *accuracy* (engañosa con "
           "desbalance) sino la **discriminación** (ROC-AUC, PR-AUC) y la base para "
           "probabilidades fiables."),
        code(SETUP),
        md("## Tabla comparativa (conjunto de validación)\n"
           "Ordenada por ROC-AUC. `pr_auc` y `brier` son especialmente informativos "
           "con prevalencia baja. Métricas de umbral (f1/precision/recall) calculadas "
           "a t=0.5 (la umbralización clínica se aborda en el NB 04)."),
        code("comp = table(RES/'models'/'comparison.csv'); comp"),
        code("show(RES/'models'/'roc_all.png')\nshow(RES/'models'/'roc_auc_bar.png')"),
        md("## Modelo seleccionado"),
        code("sel = load(RES/'models'/'selection.json')\n"
             "best = sel['best_model']\n"
             "print('Mejor modelo:', best, '| ROC-AUC(val)=', round(sel['best_roc_auc_val'],4))\n"
             "print(sel['note'])\n"
             "for p in ['roc','pr','calib','cm']:\n"
             "    show(RES/'models'/f'{p}_{best}.png')"),
        md("### Conclusiones Fase 1B\n"
           "- Los modelos de *gradient boosting* y la regresión logística alcanzan "
           "ROC-AUC ~0.82–0.83, el techo razonable para indicadores auto-reportados "
           "del BRFSS (sin laboratorios).\n"
           "- La regresión logística es competitiva y totalmente interpretable → "
           "excelente referencia clínica.\n"
           "- Antes de fijar umbrales de riesgo, las probabilidades deben **calibrarse** "
           "(NB 03)."),
    ]


def nb03():
    return [
        md("# 03 — Calibración de Probabilidades\n\n"
           "**Fase 1C.** Una probabilidad de 0.30 debe significar *30% de riesgo real*. "
           "Comparamos el modelo **original** vs **Platt (sigmoide)** vs **Isotónica**, "
           "ajustando la calibración en *val* y midiendo fiabilidad (Brier, ECE) en "
           "*val* y *test*."),
        code(SETUP),
        md("## Fiabilidad antes/después de calibrar"),
        code("rel = table(RES/'calibration'/'reliability.csv'); rel"),
        code("show(RES/'calibration'/'calibration_comparison.png')"),
        code("s = load(RES/'calibration'/'summary.json')\n"
             "print('Modelo:', s['best_model'], '| Calibración elegida:', s['chosen_calibration'])"),
        md("### Conclusiones Fase 1C\n"
           "- La calibración reduce el **Brier** y el **ECE** sin alterar el orden "
           "(ROC-AUC), produciendo probabilidades **clínicamente confiables**.\n"
           "- La **isotónica** suele ganar con muchos datos; Platt es más estable con "
           "pocos.\n"
           "- Estas probabilidades calibradas son el insumo directo de la "
           "estratificación de riesgo (NB 04)."),
    ]


def nb04():
    return [
        md("# 04 — Estratificación de Riesgo (4 niveles)\n\n"
           "**Fase 1D.** Transformamos la probabilidad calibrada en niveles clínicos "
           "**Bajo / Moderado / Alto / Muy Alto**. NO se asumen umbrales arbitrarios: "
           "se comparan 4 métodos y se elige el que mejor **separa** los grupos."),
        code(SETUP),
        md("## Los 4 métodos\n"
           "1. **Percentiles poblacionales** (P50/P80/P95) — tamaños por cola.\n"
           "2. **Cuartiles** (Q1/Q2/Q3) — grupos de tamaño igual.\n"
           "3. **Sensibilidad clínica** (ROC): exclusión sens≥0.90 · Youden · inclusión espec≥0.90.\n"
           "4. **Cost-sensitive** — umbral de Bayes para ratios de costo FN:FP (10/4/1.5)."),
        code("strat = load(RES/'risk'/'stratification.json')\n"
             "table(RES/'risk'/'method_comparison.csv')"),
        code("show(RES/'risk'/'method_separation.png')"),
        md("## Método elegido y bandas resultantes"),
        code("print('Método elegido:', strat['chosen_method'])\n"
             "print('Umbrales:', strat['chosen_thresholds'])\n"
             "print('Regla:', strat['selection_rule'])\n"
             "bands = pd.DataFrame(strat['methods'][strat['chosen_method']]['bands'])\n"
             "bands"),
        code("show(RES/'risk'/'risk_distribution.png')\nshow(RES/'risk'/'band_prevalence_val.png')"),
        md("### Conclusiones Fase 1D\n"
           "- El método elegido maximiza η² (varianza del desenlace explicada por la "
           "banda) manteniendo **monotonía** y bandas no triviales.\n"
           "- Cada banda lleva asociada una **acción clínica** (seguimiento → educación "
           "→ evaluación prioritaria → referencia inmediata).\n"
           "- La validez de estas bandas se confirma en *test* (NB 06)."),
    ]


def nb05():
    return [
        md("# 05 — Explicabilidad\n\n"
           "**Fase 1E.** ¿Qué impulsa el riesgo? ¿Qué es protector? Combinamos **SHAP** "
           "(atribución por paciente), **permutation importance** (model-agnóstica) y "
           "**partial dependence** (forma del efecto + interacciones)."),
        code(SETUP),
        md("## SHAP — importancia global y dirección"),
        code("ex = load(RES/'explainability'/'explainability.json')\n"
             "print('Modelo de riesgo:', ex['risk_model'], '| SHAP vía:', ex['shap_model'])\n"
             "table(RES/'explainability'/'shap_global_importance.csv')"),
        code("show(RES/'explainability'/'shap_bar.png')\n"
             "show(RES/'explainability'/'shap_beeswarm.png')"),
        md("## Permutation importance"),
        code("show(RES/'explainability'/'permutation_importance.png')"),
        md("## Partial dependence e interacciones"),
        code("show(RES/'explainability'/'partial_dependence.png')\n"
             "show(RES/'explainability'/'interaction_pdp.png')"),
        md("## Factores de riesgo vs protectores"),
        code("print('— Factores de RIESGO —')\n"
             "for g in ex['risk_factors']: print(' ', g['label'])\n"
             "print('\\n— Factores PROTECTORES —')\n"
             "for g in ex['protective_factors']: print(' ', g['label'])"),
        md("### Conclusiones Fase 1E\n"
           "- Coinciden SHAP y permutation: **salud general percibida, hipertensión, "
           "IMC, edad, colesterol y dificultad para caminar** dominan el riesgo.\n"
           "- **Actividad física, consumo de fruta/verdura e ingresos altos** actúan "
           "como protectores.\n"
           "- Las PDP muestran efectos monótonos (riesgo ↑ con IMC y edad) e "
           "interacciones plausibles, dando **transparencia clínica** al motor."),
    ]


def nb06():
    return [
        md("# 06 — Validación Clínica de las Bandas\n\n"
           "**Fase 1F.** En el conjunto **TEST** (held-out) verificamos si las bandas "
           "tienen significado clínico real: prevalencia, **odds ratio** y **riesgo "
           "relativo** por banda, y sensibilidad/especificidad/PPV/NPV de cada umbral."),
        code(SETUP),
        md("## Bandas en TEST: prevalencia y asociación (vs banda Bajo)"),
        code("cv = load(RES/'clinical'/'clinical_validation.json')\n"
             "display(table(RES/'clinical'/'band_association_test.csv'))\n"
             "show(RES/'clinical'/'band_prevalence_test.png')"),
        code("show(RES/'clinical'/'forest_or.png')\nshow(RES/'clinical'/'forest_rr.png')"),
        md("## Puntos de operación clínica (cribado ≥ umbral)"),
        code("table(RES/'clinical'/'operating_points_test.csv')"),
        md("## Veredicto"),
        code("v = cv['verdict']\n"
             "print('Monotonía de prevalencia:', v['monotonic_prevalence'])\n"
             "print('OR creciente:', v['or_increasing'])\n"
             "print(f\"Prevalencia Bajo={v['prevalence_low_band']:.3f} -> \"\n"
             "      f\"Muy Alto={v['prevalence_high_band']:.3f} (x{v['fold_increase_extreme']})\")\n"
             "print('CLÍNICAMENTE SIGNIFICATIVO:', v['clinically_meaningful'])"),
        md("### Conclusiones Fase 1F\n"
           "- Las bandas muestran **prevalencia creciente y monótona** y **OR/RR "
           "crecientes** con IC95% que no incluyen 1 en las bandas altas → separación "
           "clínica real.\n"
           "- El umbral de inclusión ofrece alta especificidad (pocas falsas alarmas) y "
           "el de exclusión alta sensibilidad (capta a la mayoría de los casos).\n"
           "- El framework está listo para integrarse en PREDIA como **motor de soporte "
           "a la decisión** (ver `risk_stratification_report.md`)."),
    ]


def main():
    write("01_EDA_BRFSS.ipynb", nb01())
    write("02_Model_Training.ipynb", nb02())
    write("03_Calibration.ipynb", nb03())
    write("04_Risk_Stratification.ipynb", nb04())
    write("05_Explainability.ipynb", nb05())
    write("06_Clinical_Validation.ipynb", nb06())


if __name__ == "__main__":
    main()
