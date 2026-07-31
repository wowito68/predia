"""FASE 3H — Validación del CDSS (consistencia, interpretabilidad, carga, valor, auditoría)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_cdss import config, validation  # noqa: E402


def main():
    snap = pd.read_csv(config.DATASETS_DIR / "snapshots.csv")
    priority_rows = json.load(open(config.METRICS_DIR / "priority_full.json"))
    recs = json.load(open(config.DATASETS_DIR / "recommendations.json"))
    surv = pd.read_csv(config.DATASETS_DIR / "survival_table.csv")

    out = {
        "consistencia": validation.consistency_monotonicity(snap, priority_rows),
        "interpretabilidad": validation.interpretability(recs),
        "carga_cognitiva": validation.cognitive_load(recs),
        "valor_clinico": validation.clinical_value(snap, priority_rows, surv),
        "auditabilidad": validation.auditability(recs),
    }
    with open(config.METRICS_DIR / "validation.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print("=== Validación del CDSS (Fase 3H) ===")
    c = out["consistencia"]
    print(f"\n1. Consistencia: ρ(riesgo,prioridad)={c['spearman_riesgo_priority']} "
          f"(monótono={c['monotonic_risk']}); ρ(CES,prioridad)={c['spearman_ces_priority']}")
    i = out["interpretabilidad"]
    print(f"2. Interpretabilidad: {i['pct_recs_con_razon']:.0%} de recs con razón, "
          f"{i['pct_con_explicacion']:.0%} con '¿por qué?'")
    cl = out["carga_cognitiva"]
    print(f"3. Carga cognitiva: {cl['media_acciones_mostradas']} acciones mostradas vs "
          f"{cl['acciones_catalogo']} catálogo (−{cl['reduccion_pct']}%)")
    v = out["valor_clinico"]
    print(f"4. Valor clínico: prioridad media con deterioro {v['priority_medio_con_deterioro']} "
          f"vs sin {v['priority_medio_sin_deterioro']} (separa={v['separa_grupos']})")
    a = out["auditabilidad"]
    print(f"5. Auditabilidad: {a['pct_auditable']:.0%} de salidas totalmente trazables")


if __name__ == "__main__":
    main()
