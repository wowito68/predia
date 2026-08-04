"""Genera Clinical_Decision_Support_Report.md a partir de los artefactos."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_cdss import config  # noqa: E402

MET, RUL, DS = config.METRICS_DIR, config.RULES_DIR, config.DATASETS_DIR


def L(p):
    return json.load(open(p))


def table_md(df, headers=None):
    headers = headers or list(df.columns)
    out = ["| " + " | ".join(map(str, headers)) + " |",
           "| " + " | ".join("---" for _ in headers) + " |"]
    for _, r in df.iterrows():
        out.append("| " + " | ".join(str(r[c]) for c in df.columns) + " |")
    return "\n".join(out)


def main():
    snap = pd.read_csv(DS / "snapshots.csv")
    rules_cat = pd.DataFrame(L(RUL / "rules_catalog.json"))
    pr = pd.read_csv(MET / "priority.csv")
    shap_g = pd.read_csv(MET / "shap_global.csv").head(6)
    tj = L(MET / "trajectories.json")
    cox = pd.read_csv(MET / "cox_hazard_ratios.csv")
    ew = L(MET / "earlywarning.json")
    val = L(MET / "validation.json")
    recs = L(DS / "recommendations.json")

    firings = L(MET / "rule_firings.json")
    pct_alert = round(100 * sum(1 for v in firings.values() if v) / len(firings))

    from collections import Counter
    actc = Counter(a["label"] for r in recs for a in r["recommendations"])
    act_df = pd.DataFrame(actc.most_common(8), columns=["acción", "frecuencia"])
    prio_counts = pr.priority_band.value_counts().reindex(["Crítica", "Alta", "Media", "Baja"]).fillna(0).astype(int)
    cox_fmt = cox.copy()
    cox_fmt["HR (IC95%)"] = cox_fmt.apply(lambda r: f"{r['hazard_ratio']} {r['ci95']}", axis=1)

    md = f"""# Clinical Decision Support Report — PCDSS (FASE 3)
### PREDIA · sistema personalizado de apoyo a la decisión clínica

> De *predicción* y *monitoreo* a **recomendación clínica asistida**: responde
> *¿qué debería hacerse con este paciente?*. **No diagnostica ni reemplaza al médico**;
> genera **alertas, prioridades y recomendaciones justificadas y auditables**.

---

## 1. Metodología

El PCDSS integra las dos fases previas sobre una cohorte de **{len(snap)} pacientes**
(reusa la cohorte longitudinal de FASE 2 enriquecida con **consultas, medicación,
adherencia y comorbilidades**):

- **Entradas:** riesgo de diabetes (FASE 1), evolución/CES y eventos (FASE 2), signos
  vitales, historial de consultas, medicación + adherencia, comorbilidades, factores de riesgo.
- **Salidas:** alertas (motor de reglas), Priority Score, recomendaciones rankeadas y
  explicaciones (SHAP + rule trace).

Paquete reproducible `predia_cdss` (`run_*.py` + `run_pipeline.sh`). Cada salida del
sistema la produce `recommend.recommend_patient` y es **trazable**.

## 2. Clinical Rule Engine (3A)

Motor declarativo de **{len(rules_cat)} reglas** `IF condición THEN alerta/acción`, cada
una con severidad, acción recomendada y **evidencia** citada (rule trace). Ejemplos:
*hiperglucemia+obesidad*, *PA elevada en 3 consultas → seguimiento prioritario*, *riesgo
muy alto sin consulta reciente → contacto preventivo*. El {pct_alert}% de los
pacientes dispara ≥1 alerta.

## 3. Risk Prioritization (3B)

**Priority Score 0-100** = `100·Σ w_k·c_k` (riesgo 0.35, evolución/CES 0.25, eventos 0.15,
comorbilidades 0.15, adherencia 0.10) → bandas Baja/Media/Alta/Crítica.

| Banda | Pacientes |
|---|---|
| Crítica | {prio_counts['Crítica']} |
| Alta | {prio_counts['Alta']} |
| Media | {prio_counts['Media']} |
| Baja | {prio_counts['Baja']} |

## 4. Explainable Recommendations (3C)

Cada recomendación responde **¿por qué?** con SHAP (modelo de deterioro) + rule trace.
Factores globales principales del deterioro:

{table_md(shap_g[['label', 'mean_abs_shap']], ['Factor', 'Media |SHAP|'])}

## 5. Patient Trajectories (3D)

Riesgo(t) mapeado a las bandas de FASE 1 (suavizado). Tipos de trayectoria:
{", ".join(f"{k}={v}" for k, v in tj['trajectory_types'].items())}.
Solo el {tj['events_before_upgrades']['pct_con_evento_previo']:.0%} de las transiciones a
peor está precedido por un evento agudo → la mayoría son deterioros **graduales**
(de tendencia), lo que refuerza el valor del monitoreo temporal continuo.

## 6. Early Warning System (3E)

*Tiempo hasta deterioro* (CES<40 o evento severo): tasa de evento {ew['event_rate']:.0%},
seguimiento mediano {ew['median_followup']} d. **Cox PH** (covariables basales estandarizadas):

{table_md(cox_fmt[['covariate', 'HR (IC95%)', 'p_value']], ['Covariable', 'HR (IC95%)', 'p'])}

→ IMC, glucosa y comorbilidades basales **elevan** el hazard de deterioro; la **adherencia
protege** (HR<1). Kaplan-Meier y forest en `figures/earlywarning/`.

## 7. Recommendation Ranking (3F)

Top-5 acciones por paciente por **impacto esperado** (media {sum(len(r['recommendations']) for r in recs)/len(recs):.1f}/paciente).
Acciones más frecuentes:

{table_md(act_df, ['Acción', 'Frecuencia'])}

## 8. Asistente Clínico — integración en PREDIA (3G)

Panel dentro del expediente (`/pacientes/[id]/evolucion`, junto a `ClinicalEvolution`):
cabecera (riesgo + CES + prioridad), tendencias, alertas, **¿por qué?** y Top-5
recomendaciones. API sugerida `GET /api/pacientes/[id]/asistente` → el objeto de
`recommend_patient`. **Sin cajas negras**: nada se renderiza sin su justificación.
Mockups en `dashboards/`, spec en `ASISTENTE_CLINICO_SPEC.md`.

## 9. Validación (3H)

| Dimensión | Resultado |
|---|---|
| **Consistencia** | ρ(riesgo, prioridad) = {val['consistencia']['spearman_riesgo_priority']} (monótono); ρ(CES, prioridad) = {val['consistencia']['spearman_ces_priority']} |
| **Interpretabilidad** | {val['interpretabilidad']['pct_recs_con_razon']:.0%} de recomendaciones con razón |
| **Carga cognitiva** | {val['carga_cognitiva']['media_acciones_mostradas']} acciones vs {val['carga_cognitiva']['acciones_catalogo']} del catálogo (−{val['carga_cognitiva']['reduccion_pct']}%) |
| **Valor clínico** | prioridad media {val['valor_clinico']['priority_medio_con_deterioro']} (deterioro) vs {val['valor_clinico']['priority_medio_sin_deterioro']} (sin) |
| **Auditabilidad** | {val['auditabilidad']['pct_auditable']:.0%} de salidas totalmente trazables |

## 10. Limitaciones

- **Cohorte sintética enriquecida:** valida la *lógica y la integración*; los umbrales de
  reglas, pesos de prioridad y catálogo de acciones deben calibrarse con datos y criterio
  clínico reales antes de su uso.
- **Soporte, no decisión:** el sistema **sugiere y prioriza**; la decisión es del médico.
- **Survival:** evento de deterioro definido por CES/evento severo (proxy); con datos
  reales conviene anclar a desenlaces duros (hospitalización, HbA1c objetivo).
- **Reglas vs aprendizaje:** el motor de reglas es transparente pero rígido; puede
  complementarse con modelos supervisados manteniendo la explicabilidad.

## 11. Aplicaciones clínicas

- **Triaje de agenda:** ordenar la lista de pacientes por Priority Score.
- **Alertas accionables:** cada alerta trae acción y evidencia, lista para el expediente.
- **Intervención temprana:** el early warning identifica a los pacientes que se deteriorarán.
- **Trazabilidad y auditoría:** toda recomendación es reproducible y justificable.

---

*Artefactos: `rules/`, `models/`, `metrics/`, `figures/`, `dashboards/` · Notebooks:
`notebooks/01_Rule_Engine … 07_Validation.ipynb` · Reproducible con `run_pipeline.sh`.*
"""
    out = config.CDSS_DIR / "Clinical_Decision_Support_Report.md"
    out.write_text(md, encoding="utf-8")
    print("escrito", out)


if __name__ == "__main__":
    main()
