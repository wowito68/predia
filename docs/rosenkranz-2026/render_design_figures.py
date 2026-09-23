"""Render fixed sensitivity estimates; retain raw Wald intervals in the source."""
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.special import expit, logit
from scipy.stats import t

HERE = Path(__file__).resolve().parent
RESULTS = HERE.parents[1] / "ml-research/ensanut_temporal/results"
OUTPUT = HERE / "figures"


def rate_logit_ci(row, scale=1000):
    p, se = row["estimate"]/scale, row["average"]["se"]/scale
    if not 0 < p < 1:
        raise ValueError("Logit interval requires an interior probability")
    margin = t.ppf(.975,row["df"])*se/(p*(1-p))
    return scale*expit(logit(p)+np.array([-margin,margin]))


def main():
    data = json.loads((RESULTS/"design_sensitivity/analysis.json").read_text())
    OUTPUT.mkdir(exist_ok=True)
    plt.rcParams.update({"font.family":"DejaVu Sans","font.size":10})
    fig, axes = plt.subplots(3,1,figsize=(8.4,9.2),layout="constrained")
    cal = pd.read_csv(RESULTS/"calibration_2021.csv")
    axes[0].plot(cal.predicted,cal.observed,"o-",color="#236D69",label="Modelo bloqueado")
    axes[0].plot([0,.65],[0,.65],"--",color="#747B80",label="Calibración ideal")
    axes[0].set(xlabel="Probabilidad media predicha",ylabel="Frecuencia observada",title="A. Calibración temporal",xlim=(0,.65),ylim=(0,.65))
    axes[0].legend(frameon=False)
    for ax, rows, methods in (
        (axes[1],data["decision_curve"],(("model","Modelo bloqueado","#236D69"),("all","Remitir a todos","#9B5660"))),
        (axes[2],[r for r in data["decision_curve"] if r["threshold"]<=.30],(("model","Modelo menos nadie","#236D69"),("difference_all","Modelo menos todos","#9B5660"))),
    ):
        x = [r["threshold"] for r in rows]
        for method,label,color in methods:
            ax.plot(x,[r[method]["estimate"] for r in rows],color=color,label=label)
            ax.fill_between(x,[r[method]["average"]["lower"] for r in rows],[r[method]["average"]["upper"] for r in rows],color=color,alpha=.15)
        ax.axhline(0,color="#747B80",ls="--"); ax.legend(frameon=False,fontsize=9)
        ax.set_xlabel("Umbral")
    axes[1].set(ylabel="Beneficio neto",title="B. Beneficio neto e IC95% puntuales")
    axes[2].set(ylabel="Diferencia de beneficio neto",title="C. Contrastes emparejados e IC95% puntuales",xlim=(.05,.30))
    for ax in axes:
        ax.spines[["top","right"]].set_visible(False); ax.grid(alpha=.15); ax.set_axisbelow(True)
    fig.savefig(OUTPUT/"calibration-decision.png",dpi=240,facecolor="white"); plt.close(fig)

    groups=["20-34","35-54","55+"]
    fig, axes=plt.subplots(1,2,figsize=(9,4.5),layout="constrained")
    display=[]
    for ax,measure,title in zip(axes,("missed_within_1000","missed_total_1000"),("Por 1,000 del mismo grupo","Por 1,000 de la cohorte total")):
        for j,g in enumerate(groups):
            row=data["metrics"][f"age/{g}/{measure}"]; lower,upper=rate_logit_ci(row)
            display.append({"age":g,"metric":measure,"estimate":row["estimate"],"lower":float(lower),"upper":float(upper),"method":"Taylor average singleton; logit-t interval"})
            ax.plot([lower,upper],[j,j],color="#236D69",lw=2)
            ax.plot(row["estimate"],j,"o",color="#236D69")
            ax.annotate(f"{row['estimate']:.1f}",(row["estimate"],j),xytext=(0,10),textcoords="offset points",ha="center",fontsize=10)
        ax.set_yticks(range(3),[f"{g} años" for g in groups]); ax.set_ylim(2.6,-.6)
        ax.set_title(title,fontsize=11,loc="left",pad=16); ax.set_xlabel("Alteraciones omitidas")
        ax.set_xlim(left=0); ax.spines[["top","right"]].set_visible(False); ax.grid(axis="x",alpha=.2)
    fig.savefig(OUTPUT/"age-omissions.png",dpi=240,facecolor="white"); plt.close(fig)
    pd.DataFrame(display).to_csv(OUTPUT/"age-omissions-logit-ci.csv",index=False)


if __name__=="__main__":
    main()
