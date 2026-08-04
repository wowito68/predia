"""Genera los 7 notebooks entregables de la FASE 3 leyendo los artefactos de
metrics/, figures/, rules/, dashboards/. Capa de presentación, ejecutable con nbconvert."""
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
    nb["metadata"] = {"kernelspec": {"display_name": "Python 3", "language": "python",
                                     "name": "python3"}, "language_info": {"name": "python"}}
    with open(NB_DIR / name, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    print("escrito", name)


SETUP = """# --- Setup ---
import sys, json
from pathlib import Path
import pandas as pd
from IPython.display import Image, display

CD = Path.cwd().parent if Path.cwd().name == "notebooks" else Path.cwd()
sys.path.insert(0, str(CD / "src"))
from predia_cdss import config
DS, MET, FIG, RUL, DASH = CD/"datasets", CD/"metrics", CD/"figures", CD/"rules", CD/"dashboards"
def show(p, w=None): display(Image(filename=str(p), width=w))
def load(j): return json.load(open(j))
pd.set_option("display.max_columns", 40); pd.set_option("display.width", 160)
print("Entorno listo:", CD)
"""

INTRO = ("# FASE 3 — Personalized Clinical Decision Support System (PCDSS)\n\n"
         "De *predicción/monitoreo* a **recomendación clínica asistida**: responde "
         "*¿qué debería hacerse con este paciente?*. **No** diagnostica ni reemplaza al "
         "médico; cada salida es **explicable y auditable**. Integra el riesgo (FASE 1) y "
         "la evolución (FASE 2) sobre la cohorte enriquecida con consultas, medicación, "
         "adherencia y comorbilidades.\n")


def nb01():
    return [
        md(INTRO + "\n## 01 — Clinical Rule Engine (Fase 3A)\n\n"
           "Motor de reglas declarativo `IF condición THEN alerta/acción`, con severidad, "
           "acción recomendada y **evidencia** (los valores que la dispararon → rule trace "
           "auditable)."),
        code(SETUP),
        md("## Catálogo de reglas"),
        code("rc = load(RUL/'rules_catalog.json'); pd.DataFrame(rc)"),
        md("## Frecuencia de disparo en la cohorte"),
        code("show(FIG/'rules'/'rule_frequency.png')"),
        md("## Rule trace de un paciente (auditable)"),
        code("ff = load(MET/'rule_firings.json')\n"
             "pid = next(k for k,v in ff.items() if len(v)>=3)\n"
             "print('Paciente', pid)\n"
             "for r in ff[pid]:\n"
             "    print(f\"  [{r['severity']:8s}] {r['rule_id']} {r['name']} -> {r['action']}\")\n"
             "    print(f\"      evidencia: {r['evidence']}\")"),
        md("### Conclusión 3A\nLas reglas convierten umbrales clínicos en alertas "
           "trazables; cada disparo cita su evidencia, base de la auditabilidad."),
    ]


def nb02():
    return [
        md("# 02 — Risk Prioritization (Fase 3B)\n\n"
           "**Priority Score 0-100** = `100·Σ w_k·c_k` combinando riesgo actual (0.35), "
           "evolución/CES (0.25), eventos (0.15), comorbilidades (0.15) y adherencia (0.10). "
           "Bandas: Baja / Media / Alta / Crítica."),
        code(SETUP),
        code("pr = pd.read_csv(MET/'priority.csv')\n"
             "print(pr.priority_band.value_counts().reindex(['Crítica','Alta','Media','Baja']))\n"
             "pr.groupby('archetype').priority_score.mean().round(1).sort_values(ascending=False)"),
        code("show(FIG/'priority'/'priority_distribution.png')\n"
             "show(FIG/'priority'/'priority_components.png')"),
        md("### Conclusión 3B\nEl Priority Score ordena a los pacientes por necesidad de "
           "atención y es **monótono con el riesgo** (validado en NB 07). El driver "
           "dominante suele ser el riesgo actual y la evolución."),
    ]


def nb03():
    return [
        md("# 03 — Explainable Recommendations (Fase 3C)\n\n"
           "Cada recomendación responde **¿por qué?** combinando **SHAP** (modelo de "
           "deterioro), **rule trace** y **feature attribution**."),
        code(SETUP),
        md("## Factores globales de deterioro (SHAP)"),
        code("show(FIG/'explain'/'shap_global.png')\npd.read_csv(MET/'shap_global.csv')"),
        md("## Explicación de un paciente (¿por qué?)"),
        code("recs = load(DS/'recommendations.json')\n"
             "ex = max(recs, key=lambda r: r['priority']['score'])\n"
             "print('Paciente', ex['patient_id'], '· prioridad', ex['priority']['score'],\n"
             "      f\"({ex['priority']['band']})\")\n"
             "print('\\n¿Por qué?')\n"
             "for b in ex['why']: print('  •', b)\n"
             "print('\\nFactores de riesgo (SHAP+):')\n"
             "for f in ex['risk_factors']: print('  ', f['label'], '=', f['value'], f\"(SHAP {f['shap']})\")"),
        md("### Conclusión 3C\nLa explicación es doble: **estadística** (SHAP, qué features "
           "empujan el riesgo) y **lógica** (qué reglas dispararon) — sin cajas negras."),
    ]


def nb04():
    return [
        md("# 04 — Patient Trajectories (Fase 3D)\n\n"
           "Mapea riesgo(t) a las bandas de FASE 1 y analiza las **rutas clínicas** y la "
           "**matriz de transición** (Markov). El riesgo se suaviza (media móvil) para que "
           "las transiciones reflejen tendencia, no ruido."),
        code(SETUP),
        code("tj = load(MET/'trajectories.json')\n"
             "print('Tipos de trayectoria:', tj['trajectory_types'])\n"
             "print('Transiciones a peor precedidas por evento agudo:',\n"
             "      f\"{tj['events_before_upgrades']['pct_con_evento_previo']:.0%}\")\n"
             "pd.DataFrame(tj['transition_matrix'], index=tj['bands'], columns=tj['bands'])"),
        code("show(FIG/'trajectories'/'transition_matrix.png')"),
        md("## Rutas de ejemplo"),
        code("for r in tj['example_routes']: print(' ', r)"),
        md("### Conclusión 3D\nLa matriz de transición cuantifica la probabilidad de "
           "moverse entre bandas; la mayoría de transiciones son graduales (tendencia), no "
           "por eventos agudos aislados."),
    ]


def nb05():
    return [
        md("# 05 — Early Warning System (Fase 3E)\n\n"
           "**Tiempo hasta deterioro** = primer CES<40 o evento severo. **Kaplan-Meier** "
           "(probabilidad de mantenerse sin deterioro) y **Cox PH** (hazard ratios de las "
           "covariables basales). Para censurados, riesgo por tendencia."),
        code(SETUP),
        code("ew = load(MET/'earlywarning.json')\n"
             "print(f\"Tasa de evento: {ew['event_rate']:.0%} | seguimiento mediano: {ew['median_followup']} d\")\n"
             "pd.read_csv(MET/'cox_hazard_ratios.csv')"),
        code("show(FIG/'earlywarning'/'kaplan_meier.png')\nshow(FIG/'earlywarning'/'cox_forest.png')"),
        md("## Pacientes con mayor riesgo de deterioro a corto plazo"),
        code("pd.read_csv(MET/'trend_deterioration_risk.csv').head(10)"),
        md("### Conclusión 3E\nEl Cox confirma que **IMC, glucosa y comorbilidades basales** "
           "elevan el hazard de deterioro (HR>1) y la **adherencia lo protege** (HR<1). El "
           "sistema alerta antes de que aparezca el problema severo."),
    ]


def nb06():
    return [
        md("# 06 — Recommendation Ranking (Fase 3F) + Asistente Clínico (3G)\n\n"
           "Top-5 acciones por paciente, ordenadas por **impacto esperado** "
           "(impacto base × relevancia según estado). Cada acción lleva su razón."),
        code(SETUP),
        code("recs = load(DS/'recommendations.json')\n"
             "from collections import Counter\n"
             "c = Counter(a['label'] for r in recs for a in r['recommendations'])\n"
             "pd.DataFrame(c.most_common(), columns=['acción','frecuencia'])"),
        md("## Ejemplo: Top-5 del paciente más prioritario"),
        code("ex = max(recs, key=lambda r: r['priority']['score'])\n"
             "for a in ex['recommendations']:\n"
             "    print(f\"  {a['rank']}. {a['label']}  — {a['reason']}\")"),
        md("## Módulo 'Asistente Clínico' (Fase 3G)\n"
           "Mockup del panel dentro del expediente (`/pacientes/[id]/evolucion`). "
           "Ver `ASISTENTE_CLINICO_SPEC.md` para la integración."),
        code("for p in sorted(DASH.glob('asistente_*.png'))[:2]: show(p)"),
        md("### Conclusión 3F/3G\nCada paciente recibe acciones concretas y priorizadas, "
           "presentadas en un panel explicable listo para el expediente."),
    ]


def nb07():
    return [
        md("# 07 — Validación (Fase 3H)\n\n"
           "¿Las recomendaciones son consistentes, interpretables, reducen carga cognitiva, "
           "aportan valor clínico y son auditables?"),
        code(SETUP),
        code("v = load(MET/'validation.json')\n"
             "import json as _j; print(_j.dumps(v, indent=2, ensure_ascii=False))"),
        md("## Lectura de los resultados"),
        code("c=v['consistencia']; vc=v['valor_clinico']; cl=v['carga_cognitiva']\n"
             "print(f\"1. Consistencia: ρ(riesgo,prioridad)={c['spearman_riesgo_priority']} (monótono)\")\n"
             "print(f\"2. Interpretabilidad: {v['interpretabilidad']['pct_recs_con_razon']:.0%} recs con razón\")\n"
             "print(f\"3. Carga cognitiva: −{cl['reduccion_pct']}% vs catálogo completo\")\n"
             "print(f\"4. Valor clínico: prioridad {vc['priority_medio_con_deterioro']} (deterioro) \"\n"
             "      f\"vs {vc['priority_medio_sin_deterioro']} (sin)\")\n"
             "print(f\"5. Auditabilidad: {v['auditabilidad']['pct_auditable']:.0%} trazable\")"),
        md("## Dashboards Asistente Clínico (todos los arquetipos)"),
        code("for p in sorted(DASH.glob('asistente_*.png')): show(p)"),
        md("### Conclusión 3H\n"
           "- **Consistente:** prioridad monótona con el riesgo (ρ≈0.95) e inversa al CES.\n"
           "- **Interpretable y auditable:** 100% de recomendaciones con razón y traza.\n"
           "- **Reduce carga cognitiva:** ~5 acciones priorizadas vs catálogo completo.\n"
           "- **Valor clínico:** la prioridad separa a quienes se deterioran de quienes no.\n\n"
           "El PCDSS responde *¿qué debería hacerse con este paciente?* de forma "
           "justificada y trazable, listo para integrarse en PREDIA "
           "(`Clinical_Decision_Support_Report.md`)."),
    ]


def main():
    write("01_Rule_Engine.ipynb", nb01())
    write("02_Priority_Scoring.ipynb", nb02())
    write("03_Explainable_Recommendations.ipynb", nb03())
    write("04_Patient_Trajectories.ipynb", nb04())
    write("05_Early_Warning_System.ipynb", nb05())
    write("06_Recommendation_Ranking.ipynb", nb06())
    write("07_Validation.ipynb", nb07())


if __name__ == "__main__":
    main()
