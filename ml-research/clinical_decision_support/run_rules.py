"""FASE 3A — Ejecuta el motor de reglas sobre toda la cohorte."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_cdss import config, rules, plots  # noqa: E402


def main():
    snap = pd.read_csv(config.DATASETS_DIR / "snapshots.csv")

    # Exporta el catálogo de reglas (auditable)
    with open(config.RULES_DIR / "rules_catalog.json", "w", encoding="utf-8") as f:
        json.dump(rules.export_rules(), f, ensure_ascii=False, indent=2)

    firings, counts = {}, {r.id: 0 for r in rules.RULES}
    sev_counts = {"critical": 0, "warning": 0, "info": 0}
    n_with_alert = 0
    for _, s in snap.iterrows():
        fired = rules.evaluate(s.to_dict())
        if fired:
            n_with_alert += 1
        firings[int(s["patient_id"])] = fired
        for fr in fired:
            counts[fr["rule_id"]] += 1
            sev_counts[fr["severity"]] += 1

    with open(config.METRICS_DIR / "rule_firings.json", "w", encoding="utf-8") as f:
        json.dump({str(k): v for k, v in firings.items()}, f, ensure_ascii=False)

    name_counts = {f"{r.id} {r.name}": counts[r.id] for r in rules.RULES}
    plots.plot_rule_frequency(name_counts, config.fig_dir("rules") / "rule_frequency.png")

    print(f"=== Motor de reglas: {len(rules.RULES)} reglas, {len(snap)} pacientes ===")
    print(f"Pacientes con ≥1 alerta: {n_with_alert} ({n_with_alert/len(snap):.0%})")
    print(f"Alertas por severidad: {sev_counts}")
    print("\nDisparo por regla:")
    for r in rules.RULES:
        print(f"  {r.id} {r.name:42s} {counts[r.id]:>4}  [{r.severity}]")


if __name__ == "__main__":
    main()
