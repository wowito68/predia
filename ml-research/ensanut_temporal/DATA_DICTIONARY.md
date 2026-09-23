# Diccionario de armonización

Este documento registra la equivalencia semántica utilizada por el pipeline. Una coincidencia de nombre no se considera suficiente: cada campo fue contrastado con el catálogo oficial de su ola.

## Variables canónicas

- `person_id`: identificador seudónimo, único dentro de la ola.
- `wave`: año de la encuesta.
- `age`: edad en años.
- `female`: 1 para mujer, 0 para hombre.
- `parent_diabetes`: diabetes reportada en padre o madre; desconocido si no puede descartarse con las respuestas observadas.
- `family_diabetes`: diabetes en padre, madre o hermano cuando la ola pregunta por hermanos.
- `diagnosed_hypertension`: diagnóstico médico previo de hipertensión, sin contar hipertensión exclusivamente gestacional.
- `bmi`: kg/m2, calculado de peso y talla cuando es necesario.
- `waist_cm`: circunferencia de cintura en centímetros.
- `systolic_bp` y `diastolic_bp`: media de mediciones válidas disponibles.
- `fasting_hours`: horas desde el último alimento; ENSANUT 2012 publica la medición como muestra en ayuno sin exponer esta variable en el CSV analítico.
- `glucose_mg_dl`: glucosa venosa en mg/dL.
- `hba1c_pct`: HbA1c porcentual cuando existe una submuestra poblacional comparable.
- `survey_weight`: ponderador bioquímico específico de la ola.
- `stratum` y `psu`: estrato y unidad primaria de muestreo.
- `rural`: 1 rural, 0 urbano o metropolitano.

## Mapeo por ola

### ENSANUT 2012

- Identificador: `folio` + `intp`.
- Edad/sexo: `edad`, `sexo`.
- Diabetes previa: `a301`.
- Hipertensión: `a401`.
- Familia: `a701a`, `a701b`.
- Embarazo actual: `a811a`.
- IMC/cintura: `imc`, `ccintura`.
- Glucosa/peso de laboratorio: `glucosa`, `PONDEV3`.
- Diseño: `est_var`, `code_upm`, `est_urb`.

### ENSANUT MC 2016

- Identificador: `folio` + `INT`/`int`.
- Edad/sexo: `edad`, `sexo`.
- Diabetes previa: `a301`.
- Hipertensión: `a401`.
- Familia: `a701a`, `a701b`.
- Embarazo: `emb`.
- IMC/cintura: `imc`, `prom_cintura`.
- Presión: `sistol3`, `sistol4`, `diastol3`, `diastol4`.
- Ayuno/laboratorio: `sanvenh`, `valor.GLU_SUERO`, `valor.HB1AC`.
- Peso y diseño: `ponde_f_vv`, `est_var`, `code_upm`, `rural`.

### ENSANUT 2018-19

- Identificador: `UPM`, `VIV_SEL`, `HOGAR`, `NUMREN`.
- Edad/sexo: `EDAD`, `SEXO`.
- Diabetes previa: `P3_1`.
- Hipertensión: `P4_1`.
- Familia: `P7_1_1`, `P7_1_2`, `P7_1_3`.
- Embarazo: `P6` en antropometría.
- Peso/talla/cintura para 20-59 años: `PESO1_*`, `TALLA4_*`, `CIRCUNFERENCIA8_*`.
- Peso/talla/cintura para >=60 años: `PESO12_*`, `TALLA15_*`, `CINTURA21_*`.
- Presión: `P27_1_*`, `P27_2_*`.
- Ayuno/laboratorio: `P5_1`, `VALOR_GLU_SUERO`, `VALOR_HB1AC`.
- Peso y diseño: `ponderador_glucosa`, `EST_DIS`, `UPM_DIS`, `DOMINIO`.

### ENSANUT Continua 2021

- Identificador: `FOLIO_INT`.
- Edad/sexo: `edad`, `sexo`.
- Diabetes previa: `a0301`.
- Hipertensión: `a0401`.
- Familia: `a0701p`, `a0701m`, `a0701h`.
- Embarazo: `a0808` y `an06`.
- Peso/talla/cintura para 20-59 años: `an01_*`, `an04_*`, `an08_*`.
- Peso/talla/cintura para >=60 años: `an12_*`, `an15_*`, `an21_*`.
- Presión: `an27_01*`, `an27_02*`, `an27_03*`.
- Ayuno/laboratorio: `san04`, `valor_GLU_SUERO`, `valor_HB1AC`.
- Peso y diseño: `ponde_g`, `est_sel`, `upm`, `estrato`.

## Límites de control de calidad

- Edad: 20-110 años.
- Peso: 25-300 kg.
- Talla: 100-220 cm.
- IMC: 10-80 kg/m2.
- Cintura: 40-220 cm.
- Sistólica: 60-260 mmHg.
- Diastólica: 30-160 mmHg.
- Glucosa: 30-700 mg/dL.
- HbA1c: 3-20%.

Los valores fuera de estos límites se convierten en faltantes y quedan registrados en el reporte de calidad.

