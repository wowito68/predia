"""FASE 3G — Módulo 'Asistente Clínico': dashboards por paciente + spec de integración."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_cdss import config, plots  # noqa: E402


INTEGRATION_SPEC = """# Módulo "Asistente Clínico" — Especificación de integración en PREDIA

Panel dentro del expediente del paciente (`/pacientes/[id]/evolucion`), junto al
componente existente `ClinicalEvolution`. **Sin cajas negras**: cada elemento es
explicable y auditable.

## Secciones (de arriba a abajo)
1. **Cabecera**: riesgo de diabetes (FASE 1), CES/evolución (FASE 2), comorbilidades y
   badge de **Prioridad** (Baja/Media/Alta/Crítica) con su score 0-100.
2. **Tendencias**: mini-timelines de glucosa y riesgo (reutiliza series de `lib/evolution`).
3. **Alertas**: lista de reglas disparadas con severidad (motor de reglas, FASE 3A).
4. **¿Por qué?**: explicación auditable (atribución SHAP + rule trace, FASE 3C).
5. **Top-5 recomendaciones**: acciones ordenadas por impacto (FASE 3F), cada una con su razón.

## Fuente de datos (API sugerida)
`GET /api/pacientes/[id]/asistente` → `{ risk, ces, priority, alerts[], why[],
recommendations[] }` — el mismo objeto que produce `predia_cdss.recommend.recommend_patient`.

## Principios
- Cada recomendación **debe** mostrar su justificación (no se renderiza sin `reason`).
- El score de prioridad muestra su **desglose por componente** (riesgo/evolución/eventos/
  adherencia/comorbilidades) al expandir.
- Todo queda **registrado** (auditoría) para trazabilidad clínica.
"""


def main():
    snap = pd.read_csv(config.DATASETS_DIR / "snapshots.csv")
    long = pd.read_csv(config.TEMPORAL_DIR / "datasets" / "cohort_long.csv")
    recs = json.load(open(config.DATASETS_DIR / "recommendations.json"))
    rec_by_pid = {r["patient_id"]: r for r in recs}

    # Un dashboard por arquetipo (paciente representativo)
    made = []
    for arch in snap.archetype.unique():
        pid = int(snap[snap.archetype == arch].patient_id.iloc[0])
        s = snap[snap.patient_id == pid].iloc[0].to_dict()
        rec = rec_by_pid.get(pid)
        if rec is None:
            continue
        out = config.DASHBOARDS_DIR / f"asistente_{arch.replace(' ', '_')}_p{pid}.png"
        plots.plot_assistant_dashboard(long, s, rec, out)
        made.append(out.name)

    (config.CDSS_DIR / "ASISTENTE_CLINICO_SPEC.md").write_text(INTEGRATION_SPEC, encoding="utf-8")

    print("=== Asistente Clínico (Fase 3G) ===")
    print("Dashboards generados:")
    for m in made:
        print("  ", m)
    print("Spec de integración: ASISTENTE_CLINICO_SPEC.md")


if __name__ == "__main__":
    main()
