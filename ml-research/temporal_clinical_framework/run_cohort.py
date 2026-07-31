"""FASE 2A — Genera la cohorte longitudinal sintética y modela las series por paciente."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from predia_temporal import config, cohort, plots  # noqa: E402

N_PATIENTS = 400


def main():
    df, meta, ev = cohort.generate(n_patients=N_PATIENTS, seed=config.SEED)
    df.to_csv(config.DATASETS_DIR / "cohort_long.csv", index=False)
    meta.to_csv(config.DATASETS_DIR / "cohort_meta.csv", index=False)
    ev.to_csv(config.DATASETS_DIR / "cohort_events.csv", index=False)

    # Timelines de ejemplo: un paciente por arquetipo
    for arch in config.ARCHETYPES:
        pid = int(meta[meta.archetype == arch].patient_id.iloc[0])
        plots.plot_patient_timeline(
            df, pid, config.fig_dir("cohort") / f"timeline_{arch.replace(' ', '_')}.png",
            title=f"Timeline — {arch} (paciente {pid})")

    print(f"=== Cohorte generada: {N_PATIENTS} pacientes ===")
    print(f"Filas (largo): {len(df):,} | variables: {sorted(df.variable.unique())}")
    print(f"Obs/paciente — glucosa: {meta.n_glucosa.mean():.1f}, "
          f"antropometría: {meta.n_antropometria.mean():.1f}")
    print("Distribución de arquetipos:")
    print(meta.archetype.value_counts().to_string())
    print(f"Eventos agudos inyectados: {len(ev)} "
          f"({ev.type.value_counts().to_dict() if len(ev) else '—'})")


if __name__ == "__main__":
    main()
