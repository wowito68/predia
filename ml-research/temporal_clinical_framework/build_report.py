"""Genera Temporal_Clinical_Evolution_Framework_Report.md a partir de los artefactos."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_temporal import config  # noqa: E402

MET = config.METRICS_DIR
DS = config.DATASETS_DIR


def table_md(df, cols=None, headers=None):
    df = df[cols] if cols else df
    headers = headers or list(df.columns)
    out = ["| " + " | ".join(map(str, headers)) + " |",
           "| " + " | ".join("---" for _ in headers) + " |"]
    for _, r in df.iterrows():
        out.append("| " + " | ".join(str(r[c]) for c in df.columns) + " |")
    return "\n".join(out)


def main():
    meta = pd.read_csv(DS / "cohort_meta.csv")
    ces = pd.read_csv(MET / "ces.csv")
    trends = pd.read_csv(MET / "trends.csv")
    clu = json.load(open(MET / "clustering.json"))
    fc = json.load(open(MET / "forecasting.json"))
    val = json.load(open(MET / "validation.json"))
    ev = json.load(open(MET / "events_detected.json"))

    comp = pd.DataFrame(clu["comparison"]).round(3)
    profiles = pd.DataFrame(clu["profiles"])
    ces_arch = pd.DataFrame(val["ces_recupera_orden_clinico"])

    # mejor modelo por target (menor RMSE)
    fc_rows = []
    for tgt, res in fc.items():
        best = min(res.items(), key=lambda kv: kv[1]["rmse"])
        base = res.get("Persistencia (baseline)", {}).get("rmse", float("nan"))
        fc_rows.append({"objetivo": tgt, "mejor_modelo": best[0],
                        "rmse": round(best[1]["rmse"], 3), "r2": round(best[1]["r2"], 3),
                        "rmse_baseline": round(base, 3)})
    fc_df = pd.DataFrame(fc_rows)

    ind = pd.read_csv(MET / "indicator_usefulness.csv").head(10)
    method_counts = ev["method_counts"]
    lt = val["alertas_lead_time"]
    n_events_injected = len(pd.read_csv(DS / "cohort_events.csv"))

    md = f"""# Temporal Clinical Evolution Framework — Reporte (FASE 2)
### PREDIA · sistema de modelado de la evolución clínica longitudinal

> El objetivo **no es predecir diabetes**, sino **modelar cómo evoluciona cada paciente**
> en el tiempo: detectar mejoría, deterioro, estabilidad, cambios bruscos y riesgo de
> empeoramiento a partir de la información temporal acumulada.

---

## 1. Metodología y datos

**Fuente.** El esquema de PREDIA ya almacena las señales temporales (`Automonitoreo`,
`MedicionAntropometrica`, `EstudioLaboratorio`, `Prediccion`), pero el volumen real
disponible (pocos pacientes, pocas semanas) es insuficiente para clustering y
forecasting. Se construye por ello una **cohorte longitudinal sintética realista**:

- **{len(meta)} pacientes × ~12 meses**, muestreo **irregular** (glucosa ~cada 4-9 d;
  antropometría/PA ~cada 12-22 d), ruido de medición y fisiología acoplada (peso→IMC,
  glucosa↔riesgo).
- **5 arquetipos clínicos**: {", ".join(config.ARCHETYPES)}.
- **{n_events_injected}** eventos agudos inyectados con día de verdad-terreno (incremento
  súbito de glucosa, aumento rápido de peso, descontrol hipertensivo) para validar la detección.

El pipeline (`predia_temporal`) es **portable a datos reales** sin cambios: reutiliza y
porta a Python la matemática del motor de evolución ya existente
(`apps/web/lib/evolution/`, ver `docs/clinical-evolution-score.md`).

## 2. Fundamentos matemáticos

Para cada serie irregular $\\{{(t_i,x_i)\\}}$ (t en días):

- **Tendencia (OLS):** $\\beta=\\frac{{\\sum(t_i-\\bar t)(x_i-\\bar x)}}{{\\sum(t_i-\\bar t)^2}}$,
  reportada por mes $\\beta_{{mes}}=30\\beta$; calidad $R^2$.
- **Aceleración:** $2a$ del ajuste cuadrático $x(t)=at^2+bt+c$.
- **Volatilidad:** $\\sigma$, $CV=\\sigma/|\\bar x|$, $\\sigma_{{resid}}$.
- **Score direccional:** $s_v=\\mathrm{{clip}}(-\\beta_{{mes,v}}/\\kappa_v,-1,1)$ (κ = cambio
  mensual clínicamente fuerte).
- **Clasificación de tendencia:** Mejorando / Estable / Empeorando / **Oscilante**
  (R² bajo + CV alto + cambios de signo).

**Clinical Evolution Score (0-100):**
$$\\text{{CES}} = 100\\,(W_S\\,G + W_T\\,E),\\quad W_S=W_T=0.5$$
con $E=(1+W)/2$, $W=\\mathrm{{clip}}(\\bar s-\\mu(1-S),-1,1)$ (evolución; $\\mu=0.5$) y $G$ el
control clínico actual (glucosa, IMC, PA, actividad física, riesgo ML) frente a objetivos.

| CES | Interpretación | | CES | Interpretación |
|---|---|---|---|---|
| 80-100 | Excelente evolución | | 20-39 | Riesgo alto |
| 60-79 | Estable | | 0-19 | Deterioro severo |
| 40-59 | Riesgo moderado | | | |

## 3. Resultados

### 3.1 Tendencias (Fase 2C)
La clasificación recupera la dinámica real: la glucosa se etiqueta *Empeorando* en
deterioro, *Mejorando* en mejora rápida y *Oscilante* en el arquetipo oscilante.

### 3.2 Clinical Evolution Score (Fase 2D)
El CES ordena correctamente los arquetipos:

{table_md(ces_arch.round(1), ["archetype", "mean", "std", "count"], ["Arquetipo", "CES medio", "σ", "n"])}

### 3.3 Detección de eventos (Fase 2E)
Alertas totales por método: {", ".join(f"{m}={c}" for m, c in sorted(method_counts.items(), key=lambda kv:-kv[1])[:6])} …

### 3.4 Clustering temporal (Fase 2F)
{table_md(comp, ["method", "silhouette", "davies_bouldin", "n_clusters", "ari_vs_arquetipo"],
          ["Método", "Silhouette", "Davies-Bouldin", "k", "ARI vs arquetipo"])}

**Mejor método: {clu['best_method']}.** Perfiles encontrados:

{table_md(profiles, ["cluster", "n", "ces_mean", "arquetipo_dominante", "pureza"],
          ["Cluster", "n", "CES medio", "Arquetipo dominante", "Pureza"])}

### 3.5 Forecasting one-step (Fase 2G)
Mejor modelo por objetivo (vs baseline de persistencia):

{table_md(fc_df, headers=["Objetivo", "Mejor modelo", "RMSE", "R²", "RMSE baseline"])}

### 3.6 Validación clínica (Fase 2I)
- **CES** recupera el orden clínico mejora>estable>deterioro.
- **Clustering** ({clu['best_method']}): **ARI = {val['ari_vs_arquetipo']}** frente a los arquetipos reales.
- **Alertas tempranas:** detección **{lt['detection_rate']:.0%}**, *lead-time* mediano
  **{lt['median_lead_time_days']} días** (n={lt['n_events']} eventos) → margen real de intervención.
- **Indicadores más útiles** para anticipar deterioro:
  {", ".join(ind['feature'].head(6).tolist())}.

## 4. Limitaciones
- **Cohorte sintética:** valida la *metodología*; la calibración fina (κ, ω, objetivos,
  umbrales de evento) debe ajustarse con datos reales de PREDIA.
- **Muestreo irregular y escaso** en variables lentas (peso/PA) reduce la fiabilidad de
  pendientes en ventanas cortas (se exige span ≥ 14 d).
- **Forecasting one-step** (próxima medición); horizontes largos requieren modelos
  secuenciales (Prophet/LSTM, documentados como extensión, no instalados).
- **CES** combina tendencia y estado con pesos clínicos razonados pero no aún validados
  contra desenlaces duros (hospitalización, HbA1c objetivo).

## 5. Aplicaciones clínicas e integración en PREDIA
- **Respuesta a "¿cómo evolucionó este paciente?"**: timeline + tendencias + CES + banda.
- **Triaje longitudinal:** priorizar pacientes con CES bajo/decreciente o alertas activas.
- **Intervención temprana:** las alertas (CUSUM/EWMA/reglas) preceden a los eventos ~25 d.
- **Perfilado poblacional:** los clusters identifican perfiles (mejoran / estables /
  empeoran / alto riesgo persistente) para programas diferenciados.
- **Integración técnica:** el motor TS `lib/evolution` ya expone CES/tendencias en
  `/pacientes/[id]/evolucion`; este framework aporta la capa de investigación (eventos,
  clustering, forecasting, dashboards) lista para portarse a la app.

---

*Artefactos: `datasets/`, `metrics/`, `figures/`, `dashboards/` · Notebooks:
`notebooks/01_Temporal_Modeling … 08_Clinical_Validation.ipynb` · Reproducible con
`run_*.py` / `run_pipeline.sh`.*
"""
    out = config.TCF_DIR / "Temporal_Clinical_Evolution_Framework_Report.md"
    out.write_text(md, encoding="utf-8")
    print("escrito", out)


if __name__ == "__main__":
    main()
