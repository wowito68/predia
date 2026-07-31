# Temporal Clinical Evolution Framework — Reporte (FASE 2)
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

- **400 pacientes × ~12 meses**, muestreo **irregular** (glucosa ~cada 4-9 d;
  antropometría/PA ~cada 12-22 d), ruido de medición y fisiología acoplada (peso→IMC,
  glucosa↔riesgo).
- **5 arquetipos clínicos**: Mejora rápida, Estable, Deterioro lento, Alto riesgo persistente, Oscilante.
- **218** eventos agudos inyectados con día de verdad-terreno (incremento
  súbito de glucosa, aumento rápido de peso, descontrol hipertensivo) para validar la detección.

El pipeline (`predia_temporal`) es **portable a datos reales** sin cambios: reutiliza y
porta a Python la matemática del motor de evolución ya existente
(`apps/web/lib/evolution/`, ver `docs/clinical-evolution-score.md`).

## 2. Fundamentos matemáticos

Para cada serie irregular $\{(t_i,x_i)\}$ (t en días):

- **Tendencia (OLS):** $\beta=\frac{\sum(t_i-\bar t)(x_i-\bar x)}{\sum(t_i-\bar t)^2}$,
  reportada por mes $\beta_{mes}=30\beta$; calidad $R^2$.
- **Aceleración:** $2a$ del ajuste cuadrático $x(t)=at^2+bt+c$.
- **Volatilidad:** $\sigma$, $CV=\sigma/|\bar x|$, $\sigma_{resid}$.
- **Score direccional:** $s_v=\mathrm{clip}(-\beta_{mes,v}/\kappa_v,-1,1)$ (κ = cambio
  mensual clínicamente fuerte).
- **Clasificación de tendencia:** Mejorando / Estable / Empeorando / **Oscilante**
  (R² bajo + CV alto + cambios de signo).

**Clinical Evolution Score (0-100):**
$$\text{CES} = 100\,(W_S\,G + W_T\,E),\quad W_S=W_T=0.5$$
con $E=(1+W)/2$, $W=\mathrm{clip}(\bar s-\mu(1-S),-1,1)$ (evolución; $\mu=0.5$) y $G$ el
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

| Arquetipo | CES medio | σ | n |
| --- | --- | --- | --- |
| Mejora rápida | 76.2 | 8.0 | 74 |
| Estable | 60.4 | 9.4 | 116 |
| Deterioro lento | 15.0 | 5.9 | 91 |
| Alto riesgo persistente | 19.6 | 4.7 | 63 |
| Oscilante | 34.3 | 12.6 | 56 |

### 3.3 Detección de eventos (Fase 2E)
Alertas totales por método: clinical_rules=1343, ewma_glucosa=1161, isolation_forest=800, lof=800, cusum_glucosa=657, zscore_glucosa=340 …

### 3.4 Clustering temporal (Fase 2F)
| Método | Silhouette | Davies-Bouldin | k | ARI vs arquetipo |
| --- | --- | --- | --- | --- |
| KMeans | 0.432 | 0.983 | 4 | 0.757 |
| GMM | 0.42 | 1.097 | 4 | 0.793 |
| Agglomerative | 0.427 | 0.985 | 4 | 0.753 |
| DBSCAN | 0.496 | 0.861 | 7 | 0.924 |

**Mejor método: DBSCAN.** Perfiles encontrados:

| Cluster | n | CES medio | Arquetipo dominante | Pureza |
| --- | --- | --- | --- | --- |
| 3 | 66 | 78.4 | Mejora rápida | 1.0 |
| 1 | 103 | 63.2 | Estable | 1.0 |
| 2 | 43 | 37.0 | Oscilante | 1.0 |
| 6 | 6 | 34.2 | Estable | 1.0 |
| -1 | 40 | 29.8 | Oscilante | 0.33 |
| 0 | 62 | 19.6 | Alto riesgo persistente | 1.0 |
| 4 | 65 | 17.0 | Deterioro lento | 1.0 |
| 5 | 15 | 11.4 | Deterioro lento | 1.0 |

### 3.5 Forecasting one-step (Fase 2G)
Mejor modelo por objetivo (vs baseline de persistencia):

| Objetivo | Mejor modelo | RMSE | R² | RMSE baseline |
| --- | --- | --- | --- | --- |
| glucosa | RandomForest | 13.865 | 0.872 | 14.903 |
| imc | Holt-Winters (statsmodels) | 0.413 | 0.986 | 0.563 |
| riesgo | RandomForest | 0.107 | 0.901 | 0.119 |
| ces | LightGBM | 7.807 | 0.862 | 8.398 |

### 3.6 Validación clínica (Fase 2I)
- **CES** recupera el orden clínico mejora>estable>deterioro.
- **Clustering** (DBSCAN): **ARI = 0.924** frente a los arquetipos reales.
- **Alertas tempranas:** detección **100%**, *lead-time* mediano
  **25.0 días** (n=218 eventos) → margen real de intervención.
- **Indicadores más útiles** para anticipar deterioro:
  imc_slope_m, glucosa_w90_mean, riesgo_w90_mean, glucosa_w180_mean, glucosa_w30_mean, peso_slope_m.

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
