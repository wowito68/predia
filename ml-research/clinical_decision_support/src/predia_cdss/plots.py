"""Visualización del CDSS y dashboard 'Asistente Clínico' (Fase 3G). Backend Agg."""
from __future__ import annotations

from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from . import config

plt.rcParams.update({"figure.dpi": 110, "savefig.bbox": "tight", "font.size": 9})

PRIO_COLORS = {"Crítica": "#C62828", "Alta": "#EF6C00", "Media": "#F9A825", "Baja": "#2E7D32"}
SEV_COLORS = {"critical": "#C62828", "warning": "#EF6C00", "info": "#1565C0"}
BAND_COLORS = {"Bajo": "#2E7D32", "Moderado": "#F9A825", "Alto": "#EF6C00", "Muy Alto": "#C62828"}


def _save(fig, path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path)
    plt.close(fig)


def plot_rule_frequency(counts: dict, path):
    items = sorted(counts.items(), key=lambda kv: kv[1])
    fig, ax = plt.subplots(figsize=(7.5, 5))
    ax.barh([k for k, _ in items], [v for _, v in items], color="#00695C")
    ax.set_xlabel("Pacientes que dispararon la regla")
    ax.set_title("Frecuencia de disparo de reglas clínicas")
    _save(fig, path)


def plot_priority_distribution(pr: pd.DataFrame, path):
    fig, axes = plt.subplots(1, 2, figsize=(11, 4))
    axes[0].hist(pr["priority_score"], bins=25, color="#455A64", edgecolor="white")
    for lo, lab in config.PRIORITY_BANDS:
        axes[0].axvline(lo, color="gray", ls=":")
    axes[0].set_title("Distribución del Priority Score"); axes[0].set_xlabel("score 0-100")
    vc = pr["priority_band"].value_counts().reindex(["Baja", "Media", "Alta", "Crítica"]).fillna(0)
    axes[1].bar(vc.index, vc.values, color=[PRIO_COLORS[b] for b in vc.index])
    axes[1].set_title("Pacientes por banda de prioridad")
    for i, v in enumerate(vc.values):
        axes[1].text(i, v, int(v), ha="center", va="bottom")
    fig.tight_layout(); _save(fig, path)


def plot_priority_components(pr: pd.DataFrame, path):
    comp = pd.DataFrame(list(pr["components"]))
    means = comp.mean()
    fig, ax = plt.subplots(figsize=(6.5, 4))
    ax.bar(means.index, means.values, color="#1565C0")
    ax.set_title("Contribución media de cada componente del Priority Score")
    ax.set_ylabel("valor medio [0-1]"); plt.xticks(rotation=20)
    _save(fig, path)


def plot_shap_global(mean_abs, names, path):
    order = np.argsort(mean_abs)
    fig, ax = plt.subplots(figsize=(6.8, 5))
    ax.barh(np.array(names)[order], np.array(mean_abs)[order], color="#6A1B9A")
    ax.set_xlabel("Media |SHAP|"); ax.set_title("Factores que impulsan el deterioro (global)")
    _save(fig, path)


def plot_transition_heatmap(M_norm, path):
    fig, ax = plt.subplots(figsize=(5.5, 4.6))
    im = ax.imshow(M_norm, cmap="Reds", vmin=0, vmax=1)
    ax.set_xticks(range(4)); ax.set_yticks(range(4))
    ax.set_xticklabels(config.RISK_LEVELS, rotation=30, ha="right")
    ax.set_yticklabels(config.RISK_LEVELS)
    ax.set_xlabel("→ banda destino"); ax.set_ylabel("banda origen")
    for i in range(4):
        for j in range(4):
            ax.text(j, i, f"{M_norm[i,j]:.2f}", ha="center", va="center",
                    color="white" if M_norm[i, j] > 0.5 else "black", fontsize=8)
    ax.set_title("Matriz de transición de bandas de riesgo (Markov)")
    fig.colorbar(im, ax=ax, shrink=0.7); _save(fig, path)


def plot_km(km: dict, km_groups: dict, path):
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.2))
    axes[0].step(km["time"], km["surv"], where="post", color="#1565C0")
    axes[0].set_title("Kaplan-Meier — sin deterioro (cohorte)")
    axes[0].set_xlabel("días"); axes[0].set_ylabel("S(t)"); axes[0].set_ylim(0, 1)
    for g, c in km_groups.items():
        axes[1].step(c["time"], c["surv"], where="post", label=g)
    axes[1].set_title("KM por arquetipo"); axes[1].set_xlabel("días"); axes[1].set_ylim(0, 1)
    axes[1].legend(fontsize=7)
    fig.tight_layout(); _save(fig, path)


def plot_cox_forest(cox_df: pd.DataFrame, path):
    d = cox_df.iloc[::-1]
    y = np.arange(len(d))
    fig, ax = plt.subplots(figsize=(6.5, 4))
    for yi, (_, r) in zip(y, d.iterrows()):
        ci = r["ci95"]
        ax.plot([ci[0], ci[1]], [yi, yi], color="#455A64", lw=1.4)
        ax.plot(r["hazard_ratio"], yi, "o", color="#C62828", ms=7)
    ax.axvline(1.0, color="gray", ls="--")
    ax.set_yticks(y); ax.set_yticklabels(d["covariate"])
    ax.set_xlabel("Hazard Ratio (IC95%) — Cox PH"); ax.set_title("Riesgo de deterioro por covariable basal")
    _save(fig, path)


def _series(df_long, pid, key):
    s = df_long[(df_long.patient_id == pid) & (df_long.variable == key)].sort_values("t_days")
    return s["t_days"].to_numpy(), s["valor"].to_numpy()


def plot_assistant_dashboard(df_long, snapshot, rec, path):
    """Mockup del módulo 'Asistente Clínico' dentro del expediente (Fase 3G)."""
    pid = int(snapshot["patient_id"])
    fig = plt.figure(figsize=(13, 8.5))
    gs = fig.add_gridspec(3, 3, height_ratios=[0.8, 1, 1.1], hspace=0.45, wspace=0.3)

    # Fila 0: cabecera con riesgo y prioridad
    ax0 = fig.add_subplot(gs[0, :]); ax0.axis("off")
    prio = rec["priority"]
    ax0.text(0.0, 0.7, f"Asistente Clínico · Paciente {pid} · {snapshot['archetype']}",
             fontsize=14, fontweight="bold")
    ax0.text(0.0, 0.25, f"Riesgo diabetes: {rec['risk']['prob']:.0%}  |  "
             f"CES/Evolución: {snapshot['ces']:.0f} ({snapshot['ces_band']})  |  "
             f"Comorbilidades: {snapshot['comorbilidades'] or '—'}", fontsize=10)
    ax0.add_patch(plt.Rectangle((0.78, 0.2), 0.22, 0.7, color=PRIO_COLORS[prio["band"]], alpha=0.85))
    ax0.text(0.89, 0.55, f"PRIORIDAD\n{prio['band']}\n{prio['score']:.0f}/100",
             ha="center", va="center", color="white", fontsize=11, fontweight="bold")

    # Fila 1 izq: mini-timeline glucosa + riesgo
    ax1 = fig.add_subplot(gs[1, 0])
    t, x = _series(df_long, pid, "glucosa"); ax1.plot(t, x, color="#1565C0")
    ax1.set_title("Glucosa (mg/dL)", fontsize=9); ax1.set_xlabel("días")
    ax2 = fig.add_subplot(gs[1, 1])
    t, x = _series(df_long, pid, "riesgo"); ax2.plot(t, x, color="#C62828")
    ax2.set_title("Riesgo de diabetes", fontsize=9); ax2.set_xlabel("días"); ax2.set_ylim(0, 1)

    # Fila 1 der: alertas
    ax3 = fig.add_subplot(gs[1, 2]); ax3.axis("off"); ax3.set_title("Alertas", fontsize=10, loc="left")
    for i, a in enumerate(rec["alerts"][:5]):
        ax3.text(0.0, 0.9 - i * 0.18, f"● {a['name']}", color=SEV_COLORS[a["severity"]],
                 fontsize=8.5, transform=ax3.transAxes)
    if not rec["alerts"]:
        ax3.text(0.0, 0.9, "Sin alertas activas", fontsize=9, transform=ax3.transAxes)

    # Fila 2 izq: ¿Por qué? (explicación)
    ax4 = fig.add_subplot(gs[2, 0:2]); ax4.axis("off")
    ax4.set_title("¿Por qué? (explicación auditable)", fontsize=10, loc="left")
    for i, b in enumerate(rec["why"][:6]):
        ax4.text(0.0, 0.92 - i * 0.16, f"• {b}", fontsize=8.5, transform=ax4.transAxes)

    # Fila 2 der: Top-5 recomendaciones
    ax5 = fig.add_subplot(gs[2, 2]); ax5.axis("off")
    ax5.set_title("Top-5 recomendaciones", fontsize=10, loc="left")
    for i, r in enumerate(rec["recommendations"][:5]):
        ax5.text(0.0, 0.92 - i * 0.18, f"{r['rank']}. {r['label']}", fontsize=8.5,
                 transform=ax5.transAxes, fontweight="bold")
    _save(fig, path)
