"""FASE 2F — Clustering temporal de pacientes según su evolución.

Construye un vector de trayectoria por paciente (tendencia + estado + volatilidad +
CES) y compara KMeans, Gaussian Mixture, Agglomerative y DBSCAN. Métricas internas
(silhouette, Davies-Bouldin) y perfiles resultantes (A/B/C/D).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.cluster import AgglomerativeClustering, DBSCAN, KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import davies_bouldin_score, silhouette_score
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler

from . import config

# Features de trayectoria para el clustering
TRAJ_COLS_TEMPLATE = ["{v}_slope_m", "{v}_mean", "{v}_cv"]
TRAJ_VARS = ["glucosa", "imc", "pas", "pad", "riesgo"]


def build_traj_matrix(feat_df: pd.DataFrame, ces_df: pd.DataFrame) -> tuple:
    cols = []
    for v in TRAJ_VARS:
        cols += [c.format(v=v) for c in TRAJ_COLS_TEMPLATE]
    cols = [c for c in cols if c in feat_df.columns]
    X = feat_df[["patient_id"] + cols].merge(
        ces_df[["patient_id", "ces", "E_evolution", "G_state"]], on="patient_id")
    feature_cols = cols + ["ces", "E_evolution", "G_state"]
    M = X[feature_cols].fillna(0.0).to_numpy()
    Xs = StandardScaler().fit_transform(M)
    return X["patient_id"].to_numpy(), Xs, feature_cols


def _safe_scores(X, labels) -> dict:
    uniq = set(labels) - {-1}
    if len(uniq) < 2:
        return {"silhouette": float("nan"), "davies_bouldin": float("nan"),
                "n_clusters": len(uniq), "n_noise": int(np.sum(labels == -1))}
    mask = labels != -1
    return {
        "silhouette": float(silhouette_score(X[mask], labels[mask])),
        "davies_bouldin": float(davies_bouldin_score(X[mask], labels[mask])),
        "n_clusters": len(uniq),
        "n_noise": int(np.sum(labels == -1)),
    }


def run_all(X, k: int = 4) -> dict:
    """Ejecuta los 4 algoritmos. Devuelve {method: {labels, scores}}."""
    out = {}
    km = KMeans(n_clusters=k, n_init=10, random_state=config.SEED).fit_predict(X)
    out["KMeans"] = {"labels": km, "scores": _safe_scores(X, km)}

    gmm = GaussianMixture(n_components=k, random_state=config.SEED).fit_predict(X)
    out["GMM"] = {"labels": gmm, "scores": _safe_scores(X, gmm)}

    agg = AgglomerativeClustering(n_clusters=k).fit_predict(X)
    out["Agglomerative"] = {"labels": agg, "scores": _safe_scores(X, agg)}

    # DBSCAN: eps por heurística (mediana de distancias al k-ésimo vecino)
    from sklearn.neighbors import NearestNeighbors
    nn = NearestNeighbors(n_neighbors=min(6, len(X) - 1)).fit(X)
    d, _ = nn.kneighbors(X)
    eps = float(np.median(d[:, -1])) * 1.3
    db = DBSCAN(eps=eps, min_samples=5).fit_predict(X)
    out["DBSCAN"] = {"labels": db, "scores": _safe_scores(X, db), "eps": round(eps, 3)}
    return out


def pca_2d(X):
    return PCA(n_components=2, random_state=config.SEED).fit_transform(X)


def profile_summary(pids, labels, feat_df, ces_df, meta_df) -> pd.DataFrame:
    """Caracteriza cada cluster: tamaño, CES medio, pendientes medias y arquetipo dominante."""
    d = pd.DataFrame({"patient_id": pids, "cluster": labels})
    d = d.merge(ces_df[["patient_id", "ces"]], on="patient_id") \
         .merge(meta_df[["patient_id", "archetype"]], on="patient_id") \
         .merge(feat_df[["patient_id", "glucosa_slope_m", "imc_slope_m", "riesgo_slope_m"]],
                on="patient_id")
    rows = []
    for cl, grp in d.groupby("cluster"):
        dom = grp.archetype.value_counts(normalize=True)
        rows.append({
            "cluster": int(cl),
            "n": len(grp),
            "ces_mean": round(grp.ces.mean(), 1),
            "glucosa_slope_m": round(grp.glucosa_slope_m.mean(), 2),
            "imc_slope_m": round(grp.imc_slope_m.mean(), 3),
            "riesgo_slope_m": round(grp.riesgo_slope_m.mean(), 4),
            "arquetipo_dominante": dom.index[0],
            "pureza": round(float(dom.iloc[0]), 2),
        })
    return pd.DataFrame(rows).sort_values("ces_mean", ascending=False)
