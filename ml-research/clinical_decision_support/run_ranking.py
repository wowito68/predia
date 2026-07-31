"""FASE 3F — Genera la salida PCDSS completa por paciente (Top-5 acciones + todo)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_cdss import config, recommend, explain  # noqa: E402


def main():
    snap = pd.read_csv(config.DATASETS_DIR / "snapshots.csv")
    sv = np.load(config.DATASETS_DIR / "shap_values.npy")
    X = snap[explain.MODEL_FEATURES].fillna(0.0).to_numpy()

    recs = []
    action_counts = {}
    for i, (_, s) in enumerate(snap.iterrows()):
        r = recommend.recommend_patient(s.to_dict(), sv_row=sv[i], x_row=X[i])
        recs.append(r)
        for a in r["recommendations"]:
            action_counts[a["label"]] = action_counts.get(a["label"], 0) + 1

    with open(config.DATASETS_DIR / "recommendations.json", "w", encoding="utf-8") as f:
        json.dump(recs, f, ensure_ascii=False)

    # Tabla resumen del top-1 por paciente
    top1 = pd.DataFrame([{
        "patient_id": r["patient_id"], "priority": r["priority"]["score"],
        "band": r["priority"]["band"],
        "accion_top": r["recommendations"][0]["label"] if r["recommendations"] else "—",
        "n_alertas": len(r["alerts"]),
    } for r in recs])
    top1.to_csv(config.METRICS_DIR / "recommendations_top1.csv", index=False)

    print("=== Recommendation Ranking (Top-5 por paciente) ===")
    print(f"Pacientes: {len(recs)} | media acciones/paciente: "
          f"{np.mean([len(r['recommendations']) for r in recs]):.1f}")
    print("\nFrecuencia de acciones recomendadas:")
    for lbl, c in sorted(action_counts.items(), key=lambda kv: -kv[1]):
        print(f"  {lbl:42s} {c}")
    print("\nEjemplo (paciente con prioridad más alta):")
    ex = max(recs, key=lambda r: r["priority"]["score"])
    print(f"  Paciente {ex['patient_id']} · prioridad {ex['priority']['score']} ({ex['priority']['band']})")
    for a in ex["recommendations"]:
        print(f"    {a['rank']}. {a['label']}  — {a['reason']}")


if __name__ == "__main__":
    main()
