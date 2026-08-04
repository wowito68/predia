#!/usr/bin/env bash
# Ejecuta el framework temporal completo (FASE 2) de extremo a extremo.
set -e
cd "$(dirname "$0")"
PY=../.venv/bin/python

for s in run_cohort run_features run_trends run_ces run_events \
         run_clustering run_forecasting run_dashboards run_validation; do
  echo "========== $s =========="
  $PY $s.py
done

echo "========== notebooks + reporte =========="
$PY build_notebooks.py
$PY build_report.py
../.venv/bin/jupyter nbconvert --to notebook --execute --inplace \
  --ExecutePreprocessor.timeout=600 notebooks/*.ipynb
echo "COMPLETADO"
