"""Enriquecimiento de la cohorte de FASE 2 con contexto clínico para el CDSS."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_cdss import config, enrich  # noqa: E402


def main():
    data = enrich.load_temporal()
    snap, consultas = enrich.build_snapshots(data)
    snap.to_csv(config.DATASETS_DIR / "snapshots.csv", index=False)
    consultas.to_csv(config.DATASETS_DIR / "consultas.csv", index=False)

    print(f"=== Cohorte enriquecida: {len(snap)} pacientes ===")
    print(f"Consultas totales: {len(consultas)} (media {len(consultas)/len(snap):.1f}/paciente)")
    print(f"Con medicación: {(snap.n_medicacion>0).mean():.0%} | "
          f"adherencia media: {snap.adherencia.mean():.2f}")
    print("Comorbilidades (nº pacientes):")
    print(snap.n_comorbilidades.value_counts().sort_index().to_string())
    print(f"\nDías desde última consulta — media {snap.days_since_last_consulta.mean():.0f}, "
          f"máx {snap.days_since_last_consulta.max():.0f}")


if __name__ == "__main__":
    main()
