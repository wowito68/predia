"""Exporta el modelo de cribado (Regresión Logística) a parámetros consumibles por
el runtime TypeScript de PREDIA (sin Python en serving).

Produce apps/web/lib/ml-model-params.json con, para cada feature de salida del
ColumnTransformer, cómo derivarla del input crudo + el coeficiente de la LR.
"""
from __future__ import annotations

import json
import warnings

import joblib
import numpy as np

from predia_ml import config

warnings.simplefilter("ignore")


def main():
    est = joblib.load(config.MODELS_DIR / "screening_logistic_regression.joblib")
    prep = est.named_steps["prep"]
    clf = est.named_steps["clf"]

    out_names = list(prep.get_feature_names_out())
    coef = np.asarray(clf.coef_).ravel()
    intercept = float(clf.intercept_[0])
    assert len(out_names) == len(coef), (len(out_names), len(coef))

    # Transformadores ajustados
    ohe = prep.named_transformers_["cat"]          # OneHotEncoder(drop='if_binary')
    scaler = prep.named_transformers_["num"]        # StandardScaler
    num_cols = config.numeric_columns("screening")
    cat_cols = config.CATEGORICAL_COLS
    bin_cols = config.BINARY_COLS

    scaler_params = {c: {"mean": float(m), "scale": float(s)}
                     for c, m, s in zip(num_cols, scaler.mean_, scaler.scale_)}

    # Mapa nombre_salida -> spec de derivación desde input crudo
    # OneHotEncoder.get_feature_names_out usa el patrón "<col>_<categoria>"
    ohe_feature_names = list(ohe.get_feature_names_out(cat_cols))

    specs = []
    for name, c in zip(out_names, coef):
        if name in ohe_feature_names:
            # separar col y categoría (la col puede contener '_'); resolver por prefijo conocido
            col = next((cc for cc in cat_cols if name.startswith(cc + "_")), None)
            cat = name[len(col) + 1:] if col else None
            specs.append({"feature": name, "type": "onehot", "source": col, "category": cat, "coef": float(c)})
        elif name in num_cols:
            specs.append({"feature": name, "type": "scale", "source": name,
                          "mean": scaler_params[name]["mean"], "scale": scaler_params[name]["scale"],
                          "coef": float(c)})
        elif name in bin_cols:
            specs.append({"feature": name, "type": "passthrough", "source": name, "coef": float(c)})
        else:
            specs.append({"feature": name, "type": "passthrough", "source": name, "coef": float(c)})

    params = {
        "model": "logistic_regression",
        "framing": "screening",
        "intercept": intercept,
        "threshold": 0.5,
        "categorical_cols": cat_cols,
        "binary_cols": bin_cols,
        "numeric_cols": num_cols,
        "categories": {c: [str(x) for x in cats] for c, cats in zip(cat_cols, ohe.categories_)},
        "input_features": config.feature_columns("screening"),
        "specs": specs,
        "seed": config.SEED,
    }

    # exporta a ml-research/exports y a apps/web/lib (consumo en runtime TS)
    (config.EXPORTS_DIR / "ts_logreg_params.json").write_text(json.dumps(params, indent=2, ensure_ascii=False), encoding="utf-8")
    ts_target = config.REPO_DIR / "apps" / "web" / "lib" / "ml-model-params.json"
    ts_target.write_text(json.dumps(params, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Parámetros TS exportados: {len(specs)} features, intercept={intercept:.4f}")
    print("→", ts_target)


if __name__ == "__main__":
    main()
