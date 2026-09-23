# ENSANUT-PREDIA: validación temporal explicable

Este módulo ejecuta un estudio reproducible de tamizaje de disglucemia no
diagnosticada en adultos mexicanos. Desarrolla modelos con ENSANUT 2012 y 2016,
selecciona configuración y umbral con ENSANUT 2018-19 y realiza una evaluación
temporal bloqueada en ENSANUT Continua 2021.

Los microdatos no se redistribuyen. Deben descargarse desde las páginas oficiales
del Instituto Nacional de Salud Pública indicadas en
`config/data_manifest.json`. El manifiesto fija nombres y SHA-256 de los ZIP
utilizados.

## Instalación

```bash
python3 -m venv .venv
.venv/bin/pip install -r ml-research/ensanut_temporal/requirements.txt
```

## Preparación de datos

Coloca los 12 ZIP oficiales, sin renombrarlos, en una carpeta local y ejecuta:

```bash
.venv/bin/python ml-research/ensanut_temporal/prepare_data.py \
  --archives-dir /ruta/a/zip-oficiales
```

El comando verifica los archivos contra el manifiesto, extrae únicamente los CSV
requeridos y registra hashes de cada archivo extraído. `data/raw` y
`data/processed` están excluidos de Git.

## Pruebas

```bash
PYTHONPATH=ml-research/ensanut_temporal/src \
  .venv/bin/python -m unittest discover \
  -s ml-research/ensanut_temporal/tests -v
```

Las pruebas unitarias siempre se ejecutan. Las comprobaciones de integración se
omiten automáticamente cuando los microdatos locales no están disponibles.

## Ejecución en dos fases

Primero desarrolla y bloquea modelos sin cargar la ola 2021:

```bash
PYTHONPATH=ml-research/ensanut_temporal/src \
  .venv/bin/python ml-research/ensanut_temporal/run_pipeline.py develop
```

Después de revisar `results/development.json` y `results/model_lock.json`, ejecuta
una sola evaluación temporal:

```bash
PYTHONPATH=ml-research/ensanut_temporal/src \
  .venv/bin/python ml-research/ensanut_temporal/run_pipeline.py evaluate \
  --bootstrap-repetitions 1000
```

El evaluador rechaza cambios en código analítico, versiones congeladas de datos o
artefactos de modelo. También evita sobrescribir por accidente la evaluación
final.

## Salidas

- `development.json`: selección de modelos y transporte del comparador en 2018.
- `model_lock.json`: huella del estudio, procedencia, artefactos y umbrales.
- `evaluation_2021.json`: métricas finales e intervalos por bootstrap de UPM.
- `technical_report.md`: resumen generado con interpretación permitida.
- `figures/`: cohorte, discriminación, calibración, utilidad y subgrupos.
- `*.csv`: valores subyacentes para auditoría y reproducción de figuras.

## Uso responsable

El estudio evalúa transporte temporal de un instrumento de tamizaje. No valida un
diagnóstico individual, no sustituye pruebas de laboratorio y no demuestra
beneficio clínico prospectivo. La integración en PREDIA debe presentarse como
apoyo a la decisión y conservar supervisión clínica.
