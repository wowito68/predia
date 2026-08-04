# PREDIA — Auditoría de Datos Temporales (Sistema de Evolución Clínica)

> Fase 1. Documentar antes de modificar. Inventario de variables longitudinales reales.

## 1. Fuentes con timestamp

| Tabla (modelo Prisma) | Timestamp | Origen | Variables temporales |
|---|---|---|---|
| `medicion_antropometrica` (`MedicionAntropometrica`) | `fecha_medicion` | Personal clínico | `peso`, `altura`, `imc`, `presion_sistolica`, `presion_diastolica`, `circunferencia_cintura`, `circunferencia_cadera` |
| `automonitoreo` (`Automonitoreo`) | `fecha_registro` | Paciente (app móvil) | `tipo` ∈ {glucosa, peso, presion}, `valor`, `valor_secundario` (PAD cuando tipo=presion) |
| `estudio_laboratorio` (`EstudioLaboratorio`) | `fecha_estudio` | Laboratorio | `glucosa_ayunas`, `hba1c`, `colesterol_total`, `trigliceridos`, `hdl`, `ldl`, `vldl` |
| `prediccion` (`Prediccion`) | `fecha_prediccion` | Modelo IA | `score_riesgo`, `nivel_riesgo` |

## 2. Frecuencia de captura

**No hay cadencia fija.** Las mediciones son **event-driven** (se crean cuando un clínico o el paciente registran un dato). Implicaciones para el diseño:

- Las series son **irregularmente muestreadas** (Δt variable entre puntos).
- El motor matemático **debe usar los timestamps reales** (no asumir intervalos constantes): la regresión y las derivadas se calculan sobre el eje de tiempo en días, no sobre índices.
- Se requiere un **mínimo de puntos** por métrica (n≥2 para pendiente; n≥3 para aceleración/R²).

## 3. Variables aptas para análisis longitudinal

Cada variable se construye **fusionando** las fuentes disponibles y ordenando por fecha:

| Serie | Fuentes fusionadas | Apta |
|---|---|---|
| **Peso(t)** | `medicion_antropometrica.peso` ∪ `automonitoreo[peso].valor` | ✅ |
| **IMC(t)** | `medicion_antropometrica.imc` | ✅ |
| **Glucosa(t)** | `automonitoreo[glucosa].valor` ∪ `estudio_laboratorio.glucosa_ayunas` | ✅ |
| **PAS(t)** (sistólica) | `medicion_antropometrica.presion_sistolica` ∪ `automonitoreo[presion].valor` | ✅ |
| **PAD(t)** (diastólica) | `medicion_antropometrica.presion_diastolica` ∪ `automonitoreo[presion].valor_secundario` | ✅ |
| **HbA1c(t)** | `estudio_laboratorio.hba1c` | ✅ (baja frecuencia) |
| **Frecuencia cardíaca(t)** | — | ❌ **No capturada en el EHR** |
| **Saturación O₂(t)** | — | ❌ **No capturada en el EHR** |

> `heart_rate` y `saturación` aparecen en el dataset de entrenamiento ML (`diabetes_dataset.csv`) pero **no** en el expediente del paciente, por lo que no pueden analizarse longitudinalmente sin añadir su captura (limitación documentada; ver migración opcional en el informe final).

## 4. Conclusión

Hay **6 series clínicas longitudinales** viables (Peso, IMC, Glucosa, PAS, PAD, HbA1c). El motor (`lib/evolution`) consumirá un endpoint que las fusiona por paciente y calcula tendencia, velocidad, aceleración, volatilidad, medias móviles, regresión lineal y el Clinical Evolution Score. No se requiere migración para las 6 series (todas tienen timestamp); FC/SpO₂ quedan como trabajo futuro.
