"""FASE 2F — Clustering temporal de pacientes (KMeans/GMM/Agglomerative/DBSCAN)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predia_temporal import config, clustering, plots, validation  # noqa: E402


def main():
    feat = pd.read_csv(config.DATASETS_DIR / "features.csv")
    ces_df = pd.read_csv(config.METRICS_DIR / "ces.csv")
    meta = pd.read_csv(config.DATASETS_DIR / "cohort_meta.csv")

    pids, X, cols = clustering.build_traj_matrix(feat, ces_df)
    results = clustering.run_all(X, k=len(config.ARCHETYPES) - 1)  # ~4 perfiles

    comp = pd.DataFrame([{
        "method": m, **r["scores"],
        "ari_vs_arquetipo": validation.cluster_archetype_agreement(pids, r["labels"], meta)["ari"],
    } for m, r in results.items()])
    comp.to_csv(config.METRICS_DIR / "clustering_comparison.csv", index=False)

    # Mejor método por silhouette
    valid = comp.dropna(subset=["silhouette"])
    best = valid.sort_values("silhouette", ascending=False).iloc[0]["method"]
    labels = results[best]["labels"]

    prof = clustering.profile_summary(pids, labels, feat, ces_df, meta)
    prof.to_csv(config.METRICS_DIR / "cluster_profiles.csv", index=False)

    emb = clustering.pca_2d(X)
    plots.plot_clusters_pca(emb, labels, config.fig_dir("clustering") / "clusters_pca.png",
                            title=f"Clustering temporal — {best} (PCA 2D)")

    with open(config.METRICS_DIR / "clustering.json", "w", encoding="utf-8") as f:
        json.dump({"best_method": best, "feature_cols": cols,
                   "comparison": comp.to_dict("records"),
                   "profiles": prof.to_dict("records")}, f, ensure_ascii=False, indent=1)

    print("=== Comparación de algoritmos de clustering ===")
    print(comp.to_string(index=False))
    print(f"\nMejor método: {best}")
    print("\n=== Perfiles encontrados ===")
    print(prof.to_string(index=False))


if __name__ == "__main__":
    main()
