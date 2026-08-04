#!/usr/bin/env bash
# Ejecuta el PCDSS (FASE 3) de extremo a extremo. Requiere la cohorte de FASE 2 en
# ../temporal_clinical_framework/ (ejecutar antes su run_pipeline.sh).
set -e
cd "$(dirname "$0")"
PY=../.venv/bin/python

for s in run_enrich run_explain run_rules run_priority run_trajectories \
         run_earlywarning run_ranking run_assistant run_validation; do
  echo "########## $s ##########"
  $PY $s.py
done

echo "########## notebooks + reporte ##########"
$PY build_notebooks.py
$PY build_report.py
../.venv/bin/jupyter nbconvert --to notebook --execute --inplace \
  --ExecutePreprocessor.timeout=600 notebooks/*.ipynb
echo "COMPLETADO"
