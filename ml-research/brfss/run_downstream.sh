#!/usr/bin/env bash
# Espera a que termine el entrenamiento (aparece selection.json) y encadena las
# fases 1C-1F + generación/ejecución de notebooks + reporte.
set -e
cd "$(dirname "$0")"
PY=../.venv/bin/python

echo "[downstream] esperando fin del entrenamiento..."
while [ ! -f results/models/selection.json ]; do sleep 5; done
# margen para que el log/escritura final terminen
sleep 3
echo "[downstream] entrenamiento detectado. Ejecutando fases 1C-1F..."

$PY run_calibration.py
$PY run_risk_stratification.py
$PY run_explainability.py
$PY run_clinical_validation.py

echo "[downstream] generando notebooks y reporte..."
$PY build_notebooks.py
$PY build_report.py

echo "[downstream] ejecutando notebooks con nbconvert..."
../.venv/bin/jupyter nbconvert --to notebook --execute --inplace \
  --ExecutePreprocessor.timeout=600 notebooks/*.ipynb

echo "[downstream] COMPLETADO"
