"""Genera los 8 notebooks entregables de la FASE 2 leyendo los artefactos de
metrics/, figures/ y datasets/. Capa de presentación (narrativa + tablas/figuras),
ejecutable rápido con nbconvert."""
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

TCF = Path.cwd().parent if Path.cwd().name == "notebooks" else Path.cwd()
sys.path.insert(0, str(TCF / "src"))
from predia_temporal import config
DS, MET, FIG, DASH = TCF/"datasets", TCF/"metrics", TCF/"figures", TCF/"dashboards"
def show(p, w=None): display(Image(filename=str(p), width=w))
def load(j): return json.load(open(j))
pd.set_option("display.max_columns", 50); pd.set_option("display.width", 160)
print("Entorno listo:", TCF)
"""


def nb01():
    return [
        md("# 01 — Modelado Temporal (Fase 2A)\n\n"
           "Transformamos el historial clínico en una **representación matemática de la "
           "evolución**. Para cada paciente se construyen las series Peso(t), IMC(t), "
           "Glucosa(t), PA sistólica(t), PA diastólica(t) y Riesgo(t).\n\n"
           "> Los datos provienen de una **cohorte longitudinal sintética realista** "
           "(~400 pacientes × 12 meses, muestreo irregular, 5 arquetipos clínicos), "
           "alineada al esquema PREDIA (`Automonitoreo`, `MedicionAntropometrica`, "
           "`Prediccion`). El mismo pipeline opera sobre datos reales sin cambios."),
        code(SETUP),
        md("## Estructura temporal por paciente\nFormato largo `[patient_id, fecha, variable, valor]`."),
        code("df = pd.read_csv(DS/'cohort_long.csv'); meta = pd.read_csv(DS/'cohort_meta.csv')\n"
             "print('Filas:', len(df), '| pacientes:', df.patient_id.nunique())\n"
             "print('Variables:', sorted(df.variable.unique()))\n"
             "print('\\nArquetipos:'); print(meta.archetype.value_counts())\n"
             "df.head(8)"),
        md("## Series por arquetipo\nCada arquetipo define una dinámica clínica distinta "
           "(tendencia + oscilación + ruido) con muestreo irregular."),
        code("for a in config.ARCHETYPES:\n"
             "    show(FIG/'cohort'/f\"timeline_{a.replace(' ','_')}.png\")"),
        md("### Conclusión 2A\nLa información histórica queda representada como series de "
           "tiempo irregulares por variable y paciente — base de todo el análisis temporal."),
    ]


def nb02():
    return [
        md("# 02 — Feature Engineering Temporal (Fase 2B)\n\n"
           "Para cada variable y paciente: valor actual, media, máx, mín, varianza, std, "
           "**pendiente**, **aceleración**, % de cambio, cambio acumulado y tiempo desde "
           "la última medición. Y los mismos estadísticos en **ventanas rolling de "
           "7 / 30 / 90 / 180 días**."),
        code(SETUP),
        code("feat = pd.read_csv(DS/'features.csv')\n"
             "print('Matriz de features:', feat.shape)\n"
             "gl = [c for c in feat.columns if c.startswith('glucosa_')]\n"
             "print('\\nFeatures de glucosa (%d):' % len(gl)); print(gl)"),
        md("## Ventanas rolling: la pendiente reciente vs la histórica\n"
           "Comparar `slope_m` (toda la serie) con `w30_slope_m` (últimos 30 d) revela "
           "**aceleraciones o reversiones** recientes de la tendencia."),
        code("cols = ['glucosa_slope_m','glucosa_w30_slope_m','imc_slope_m','imc_w30_slope_m','riesgo_current']\n"
             "feat.groupby('archetype')[cols].mean().round(3)  # features.csv ya incluye 'archetype'"),
        md("### Conclusión 2B\nCada paciente queda descrito por un vector de ~180 features "
           "temporales que capturan nivel, dispersión, dirección y dinámica reciente."),
    ]


def nb03():
    return [
        md("# 03 — Análisis de Tendencias (Fase 2C)\n\n"
           "Por cada serie: regresión lineal (pendiente /mes, R², error residual) y "
           "clasificación automática en **Mejorando / Estable / Empeorando / Oscilante**. "
           "El signo se interpreta clínicamente (p. ej. glucosa con pendiente negativa → "
           "*Mejorando*)."),
        code(SETUP),
        code("tr = pd.read_csv(MET/'trends.csv'); meta = pd.read_csv(DS/'cohort_meta.csv')\n"
             "pd.crosstab(tr.variable, tr.trend)"),
        code("show(FIG/'trends'/'trend_distribution.png')"),
        md("## La clasificación recupera la dinámica real\n"
           "Cruzando la tendencia de glucosa con el arquetipo verdadero: *Deterioro* → "
           "Empeorando, *Mejora rápida* → Mejorando, *Oscilante* → Oscilante."),
        code("g = tr[tr.variable=='glucosa'].merge(meta[['patient_id','archetype']],on='patient_id')\n"
             "pd.crosstab(g.archetype, g.trend)"),
        md("### Conclusión 2C\nLa regresión + reglas sobre R²/CV/cambios de signo separan "
           "limpiamente tendencia direccional de fluctuación errática (Oscilante)."),
    ]


def nb04():
    return [
        md("# 04 — Índice de Evolución Clínica · CES (Fase 2D)\n\n"
           "**Clinical Evolution Score (0-100)** que combina dos componentes:\n\n"
           "$$\\text{CES}=100\\,(0.5\\,G_{\\text{estado}} + 0.5\\,E_{\\text{evolución}})$$\n\n"
           "- $E=(1+W)/2$, con $W=\\text{clip}(\\bar s-\\mu(1-S),-1,1)$ — la **tendencia** "
           "direccional ponderada penalizada por volatilidad (hereda la matemática de "
           "`docs/clinical-evolution-score.md`).\n"
           "- $G$ — el **control clínico actual** (glucosa, IMC, PA, actividad física, "
           "riesgo ML) frente a objetivos.\n\n"
           "| CES | Interpretación |\n|---|---|\n| 80-100 | Excelente evolución |\n"
           "| 60-79 | Estable |\n| 40-59 | Riesgo moderado |\n| 20-39 | Riesgo alto |\n"
           "| 0-19 | Deterioro severo |"),
        code(SETUP),
        code("ces = pd.read_csv(MET/'ces.csv'); meta = pd.read_csv(DS/'cohort_meta.csv')\n"
             "print('Distribución de bandas:'); print(ces.band.value_counts())\n"
             "ces.merge(meta[['patient_id','archetype']],on='patient_id')\\\n"
             "   .groupby('archetype')['ces'].agg(['mean','std','count']).round(1).reindex(config.ARCHETYPES)"),
        code("show(FIG/'ces'/'ces_by_archetype.png')"),
        md("## CES en el tiempo\nUsando una ventana móvil de 120 días, el CES evoluciona "
           "y permite ver *cuándo* mejora o se deteriora un paciente."),
        code("for a in ['Mejora_rápida','Deterioro_lento','Oscilante']:\n"
             "    p = FIG/'ces'/f'ces_timeline_{a}.png'\n"
             "    if p.exists(): show(p)"),
        md("### Conclusión 2D\nEl CES ordena correctamente los arquetipos (mejora→alto, "
           "deterioro→bajo) y es **explicable** por sus componentes E (tendencia) y G (estado)."),
    ]


def nb05():
    return [
        md("# 05 — Detección de Eventos (Fase 2E)\n\n"
           "Alertas tempranas mediante **Z-score robusto, EWMA, CUSUM** (univariados), "
           "**Isolation Forest y LOF** (multivariados) y **reglas clínicas** (incremento "
           "súbito de glucosa, aumento rápido de peso, descontrol hipertensivo, caída abrupta)."),
        code(SETUP),
        code("ev = load(MET/'events_detected.json')\n"
             "print('Alertas totales por método:')\n"
             "for m,c in sorted(ev['method_counts'].items(), key=lambda kv:-kv[1]): print(f'  {m:24s} {c}')"),
        code("show(FIG/'events'/'event_example.png')"),
        md("### Conclusión 2E\nLa combinación de detectores estadísticos, de outliers "
           "multivariados y reglas clínicas cubre tanto cambios de nivel (CUSUM/EWMA) como "
           "puntos anómalos (Z-score/IForest/LOF). El *lead-time* se cuantifica en el NB 08."),
    ]


def nb06():
    return [
        md("# 06 — Clustering Temporal (Fase 2F)\n\n"
           "Agrupamos pacientes por su **vector de trayectoria** (pendientes, niveles, "
           "volatilidad y CES). Comparamos **KMeans, GMM, Agglomerative y DBSCAN** "
           "(silhouette, Davies-Bouldin) y caracterizamos los perfiles resultantes."),
        code(SETUP),
        code("clu = load(MET/'clustering.json')\n"
             "print('Mejor método:', clu['best_method'])\n"
             "pd.DataFrame(clu['comparison']).round(3)"),
        code("show(FIG/'clustering'/'clusters_pca.png')"),
        md("## Perfiles encontrados\nCada cluster se caracteriza por su CES medio, "
           "pendientes y el arquetipo dominante (pureza)."),
        code("pd.read_csv(MET/'cluster_profiles.csv')"),
        md("### Conclusión 2F\nEl clustering **recupera perfiles clínicos interpretables** "
           "(mejoran rápido / estables / empeoran / alto riesgo persistente), validado "
           "contra los arquetipos por ARI (NB 08)."),
    ]


def nb07():
    return [
        md("# 07 — Predicción de Tendencia Futura (Fase 2G)\n\n"
           "Predicción **one-step-ahead** de Glucosa, IMC, Riesgo y CES a partir de "
           "features de lags/ventana. Comparamos LinearRegression, RandomForest, XGBoost y "
           "LightGBM contra un **baseline de persistencia** ($y_{t+1}=y_t$) y un baseline "
           "clásico **Holt-Winters** (statsmodels). Métricas: RMSE, MAE, MAPE, R²."),
        code(SETUP),
        code("res = load(MET/'forecasting.json')\n"
             "for tgt, r in res.items():\n"
             "    print('#', tgt)\n"
             "    display(pd.DataFrame(r).T[['rmse','mae','mape','r2']].round(3).sort_values('rmse'))"),
        code("show(FIG/'forecasting'/'forecast_rmse.png')"),
        md("### Conclusión 2G\nLos modelos de árbol (XGBoost/LightGBM) y la regresión "
           "superan al baseline de persistencia en RMSE, anticipando el próximo valor con "
           "error clínicamente bajo. *(Prophet/LSTM quedan como extensión documentada.)*"),
    ]


def nb08():
    return [
        md("# 08 — Validación Clínica (Fase 2I)\n\n"
           "¿Las tendencias son interpretables? ¿Ayudan a decidir? ¿Permiten intervención "
           "temprana? ¿Qué indicadores son más útiles?"),
        code(SETUP),
        md("## 1) El CES recupera el orden clínico de los arquetipos"),
        code("v = load(MET/'validation.json')\n"
             "pd.DataFrame(v['ces_recupera_orden_clinico'])"),
        md("## 2) El clustering recupera la estructura real (ARI)"),
        code("print('Mejor clustering:', v['clustering_best'], '| ARI vs arquetipo =', v['ari_vs_arquetipo'])"),
        md("## 3) Las alertas permiten intervención temprana (lead-time)"),
        code("lt = v['alertas_lead_time']\n"
             "print(f\"Detección de eventos: {lt['detection_rate']:.0%}  |  \"\n"
             "      f\"lead-time mediano: {lt['median_lead_time_days']} días  \"\n"
             "      f\"(n={lt['n_events']} eventos reales)\")"),
        md("## 4) Indicadores más útiles para anticipar deterioro"),
        code("show(FIG/'validation'/'indicator_importance.png')\n"
             "pd.read_csv(MET/'indicator_usefulness.csv').head(12)"),
        md("## Dashboards clínicos integrales (Fase 2H)"),
        code("for p in sorted(DASH.glob('dashboard_*.png')): show(p)"),
        md("### Conclusión 2I\n"
           "- **Interpretables:** cada tendencia/banda se explica por su pendiente, R² y "
           "componentes del CES.\n"
           "- **Recuperan estructura real:** clustering con ARI alto y CES ordenado por arquetipo.\n"
           "- **Intervención temprana:** las alertas preceden a los eventos (lead-time > 0).\n"
           "- **Indicadores clave:** glucosa, riesgo e IMC (pendientes y nivel) dominan la "
           "anticipación del deterioro.\n\n"
           "El framework responde *¿cómo evolucionó?, ¿mejora o empeora?, ¿qué tan rápido?, "
           "¿qué tan probable es que empeore?* — listo para integrarse en PREDIA "
           "(ver `Temporal_Clinical_Evolution_Framework_Report.md`)."),
    ]


def main():
    write("01_Temporal_Modeling.ipynb", nb01())
    write("02_Temporal_Features.ipynb", nb02())
    write("03_Trend_Analysis.ipynb", nb03())
    write("04_Clinical_Evolution_Index.ipynb", nb04())
    write("05_Event_Detection.ipynb", nb05())
    write("06_Temporal_Clustering.ipynb", nb06())
    write("07_Forecasting.ipynb", nb07())
    write("08_Clinical_Validation.ipynb", nb08())


if __name__ == "__main__":
    main()
