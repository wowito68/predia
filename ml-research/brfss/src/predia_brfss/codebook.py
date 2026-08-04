"""Diccionario de variables BRFSS 2015: etiquetas legibles y decodificación de
valores categóricos. Imprescindible para la interpretabilidad clínica — las
columnas vienen como códigos numéricos sin significado a primera vista.
"""
from __future__ import annotations

# Etiqueta clínica legible por variable
LABELS = {
    "Diabetes_binary": "Diabetes (0=no, 1=sí)",
    "Diabetes_012": "Diabetes (0=no, 1=prediabetes, 2=diabetes)",
    "HighBP": "Hipertensión arterial",
    "HighChol": "Colesterol alto",
    "CholCheck": "Chequeo de colesterol en 5 años",
    "BMI": "Índice de masa corporal (IMC)",
    "Smoker": "Fumador (≥100 cigarrillos de por vida)",
    "Stroke": "Antecedente de ictus",
    "HeartDiseaseorAttack": "Cardiopatía coronaria o infarto",
    "PhysActivity": "Actividad física (últimos 30 días)",
    "Fruits": "Consume fruta ≥1/día",
    "Veggies": "Consume verdura ≥1/día",
    "HvyAlcoholConsump": "Consumo elevado de alcohol",
    "AnyHealthcare": "Tiene cobertura sanitaria",
    "NoDocbcCost": "No fue al médico por costo (últimos 12m)",
    "GenHlth": "Salud general percibida",
    "MentHlth": "Días de mala salud mental (30d)",
    "PhysHlth": "Días de mala salud física (30d)",
    "DiffWalk": "Dificultad para caminar/subir escaleras",
    "Sex": "Sexo (0=mujer, 1=hombre)",
    "Age": "Grupo etario",
    "Education": "Nivel educativo",
    "Income": "Nivel de ingreso",
}

# Decodificación de valores para variables ordinales/categóricas
VALUE_MAPS = {
    "GenHlth": {
        1: "Excelente", 2: "Muy buena", 3: "Buena", 4: "Regular", 5: "Mala",
    },
    "Age": {
        1: "18-24", 2: "25-29", 3: "30-34", 4: "35-39", 5: "40-44", 6: "45-49",
        7: "50-54", 8: "55-59", 9: "60-64", 10: "65-69", 11: "70-74", 12: "75-79",
        13: "80+",
    },
    "Education": {
        1: "Sin estudios", 2: "Primaria", 3: "Secundaria incompleta",
        4: "Bachillerato/GED", 5: "Universidad incompleta", 6: "Universidad",
    },
    "Income": {
        1: "<$10k", 2: "$10-15k", 3: "$15-20k", 4: "$20-25k", 5: "$25-35k",
        6: "$35-50k", 7: "$50-75k", 8: "≥$75k",
    },
    "Sex": {0: "Mujer", 1: "Hombre"},
}


def label(col: str) -> str:
    return LABELS.get(col, col)


def decode(col: str, value) -> str:
    """Devuelve la etiqueta legible de un valor; el valor crudo si no hay mapa."""
    m = VALUE_MAPS.get(col)
    if m is None:
        return str(value)
    try:
        return m.get(int(value), str(value))
    except (ValueError, TypeError):
        return str(value)
