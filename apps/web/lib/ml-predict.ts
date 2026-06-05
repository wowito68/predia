// lib/ml-predict.ts
// Lógica de predicción del modelo de IA

import { query, queryOne } from "./db"
import type { ModeloIA } from "@/types/database"

export interface DataosPred {
  Gender: number // 0=F, 1=M
  AGE: number
  Urea: number
  Cr: number
  HbA1c: number
  Chol: number
  TG: number
  HDL: number
  LDL: number
  VLDL: number
  BMI: number
}

export interface PrediccionResultado {
  resultado: "No Diabetes" | "Diabetes"
  probabilidad_diabetes: number
  probabilidad_no_diabetes: number
  nivel_riesgo: "Bajo" | "Moderado" | "Alto" | "Muy Alto"
  factores_riesgo: string[]
  recomendaciones: string
}

/**
 * Calcula el nivel de riesgo basado en valores clínicos PRIMERO, luego probabilidad
 * PRIORIDAD CLÍNICA: HbA1c ≥6.5% = diabetes confirmada, independiente del modelo
 */
function calcularNivelRiesgo(
  probabilidad: number,
  hba1c: number,
  imc: number,
): "Bajo" | "Moderado" | "Alto" | "Muy Alto" {
  // CRITERIOS CLÍNICOS PRIORITARIOS (ADA 2024)
  // HbA1c ≥6.5% = Diabetes confirmada
  if (hba1c >= 6.5) {
    return "Muy Alto"
  }

  // HbA1c 5.7-6.4% = Prediabetes + factores adicionales
  if (hba1c >= 5.7) {
    if (imc >= 30) return "Alto"  // Prediabetes + obesidad
    if (imc >= 27) return "Moderado"  // Prediabetes + sobrepeso
    return "Moderado"  // Solo prediabetes
  }

  // Si no hay criterios clínicos, usar probabilidad del modelo
  if (probabilidad >= 0.70) return "Alto"
  if (probabilidad >= 0.50) return "Moderado"
  if (probabilidad >= 0.25) return "Bajo"

  return "Bajo"
}

/**
 * Determina el resultado final considerando criterios clínicos + modelo
 * HbA1c ≥6.5% SIEMPRE indica Diabetes, independiente del modelo
 */
function determinarResultado(
  probabilidadModelo: number,
  hba1c: number,
): "No Diabetes" | "Diabetes" {
  // Criterio clínico tiene prioridad absoluta
  if (hba1c >= 6.5) {
    return "Diabetes"  // Diabetes confirmada por HbA1c
  }

  // Si está en rango prediabético (5.7-6.4%) con alta probabilidad del modelo
  if (hba1c >= 5.7 && probabilidadModelo >= 0.5) {
    return "Diabetes"  // Alta probabilidad + prediabetes
  }

  // Usar solo el modelo si no hay criterios clínicos
  return probabilidadModelo >= 0.5 ? "Diabetes" : "No Diabetes"
}

/**
 * Identifica los factores de riesgo principales
 */
function identificarFactoresRiesgo(datos: DataosPred, probabilidad: number, resultadoFinal: "No Diabetes" | "Diabetes"): string[] {
  const factores: string[] = []

  // HbA1c (PRIORIDAD MÁXIMA)
  if (datos.HbA1c >= 6.5) {
    factores.push("🔴 HbA1c ≥6.5% - DIABETES CONFIRMADA (Criterio Diagnóstico ADA)")
  } else if (datos.HbA1c >= 6.0) {
    factores.push("🟠 HbA1c elevada (6.0-6.4%) - Prediabetes avanzada")
  } else if (datos.HbA1c >= 5.7) {
    factores.push("🟡 HbA1c en rango prediabético (5.7-5.9%)")
  }

  // IMC
  if (datos.BMI >= 35) {
    factores.push("🔴 Obesidad severa (IMC ≥35)")
  } else if (datos.BMI >= 30) {
    factores.push("🟠 Obesidad (IMC ≥30)")
  } else if (datos.BMI >= 27) {
    factores.push("🟡 Sobrepeso significativo (IMC 27-29.9)")
  } else if (datos.BMI >= 25) {
    factores.push("Sobrepeso leve (IMC 25-26.9)")
  }

  // Lípidos
  if (datos.Chol > 240) {
    factores.push("🔴 Colesterol total muy alto (>240 mg/dL)")
  } else if (datos.Chol > 200) {
    factores.push("🟡 Colesterol total límite alto (200-240 mg/dL)")
  }

  if (datos.TG > 200) {
    factores.push("🔴 Triglicéridos muy elevados (>200 mg/dL)")
  } else if (datos.TG > 150) {
    factores.push("🟡 Triglicéridos elevados (150-200 mg/dL)")
  }

  if (datos.HDL < 35) {
    factores.push("🔴 HDL muy bajo (<35 mg/dL) - Riesgo cardiovascular alto")
  } else if (datos.HDL < 40) {
    factores.push("🟠 HDL bajo (<40 mg/dL)")
  }

  if (datos.LDL > 190) {
    factores.push("🔴 LDL muy alto (>190 mg/dL)")
  } else if (datos.LDL > 160) {
    factores.push("🟠 LDL elevado (160-190 mg/dL)")
  } else if (datos.LDL > 130) {
    factores.push("🟡 LDL límite alto (130-160 mg/dL)")
  }

  // Función renal
  if (datos.Cr > 1.5) {
    factores.push("🔴 Creatinina muy elevada (>1.5) - Deterioro renal significativo")
  } else if (datos.Cr > 1.3) {
    factores.push("🟠 Creatinina elevada (>1.3) - Posible deterioro renal")
  }

  if (datos.Urea > 50) {
    factores.push("🔴 Urea muy elevada (>50 mg/dL)")
  } else if (datos.Urea > 25) {
    factores.push("🟡 Urea elevada (>25 mg/dL)")
  }

  // Edad
  if (datos.AGE >= 60) {
    factores.push("⚠️ Edad ≥60 años - Riesgo aumentado")
  } else if (datos.AGE >= 45) {
    factores.push("⚠️ Edad ≥45 años - Vigilancia recomendada")
  }

  // Probabilidad del modelo (solo si es relevante)
  if (resultadoFinal === "Diabetes" && probabilidad >= 0.7) {
    factores.push("🤖 Alta probabilidad según modelo predictivo (≥70%)")
  }

  return [...new Set(factores)] // Eliminar duplicados
}

/**
 * Genera recomendaciones personalizadas más claras y específicas
 */
function generarRecomendaciones(
  datos: DataosPred,
  resultado: "No Diabetes" | "Diabetes",
  factores: string[],
  probabilidad: number,
): string {
  const recomendaciones: string[] = []

  // URGENTE: Diabetes confirmada o muy alta probabilidad
  if (datos.HbA1c >= 6.5 || resultado === "Diabetes") {
    recomendaciones.push("URGENTE:")
    recomendaciones.push("  • Consulta INMEDIATA con endocrinólogo especialista")
    recomendaciones.push("  • Realizar prueba de glucosa en ayunas para confirmar diagnóstico")
    recomendaciones.push("  • Iniciar monitoreo glucémico frecuente")
    recomendaciones.push("")
  }

  // Prediabetes
  if (datos.HbA1c >= 5.7 && datos.HbA1c < 6.5) {
    recomendaciones.push("PREDIABETES DETECTADA:")
    recomendaciones.push("  • Cambios intensivos en estilo de vida AHORA")
    recomendaciones.push("  • Control de HbA1c cada 3-6 meses")
    recomendaciones.push("  • Consulta con nutricionista especializado en diabetes")
    recomendaciones.push("")
  }

  // Sobrepeso/Obesidad
  if (datos.BMI >= 30) {
    recomendaciones.push("PROGRAMA DE PÉRDIDA DE PESO:")
    recomendaciones.push("  • Objetivo: reducir 7-10% del peso actual")
    recomendaciones.push("  • Ejercicio aeróbico: 150-300 min/semana (caminata rápida, natación)")
    recomendaciones.push("  • Entrenamiento de resistencia 2-3 veces/semana")
    recomendaciones.push("  • Supervisión nutricional especializada")
    recomendaciones.push("")
  } else if (datos.BMI >= 25) {
    recomendaciones.push("CONTROL DE PESO:")
    recomendaciones.push("  • Mantener peso actual o reducir 3-5%")
    recomendaciones.push("  • Ejercicio regular: 150 min/semana mínimo")
    recomendaciones.push("")
  }

  // Lípidos alterados
  if (datos.Chol > 200 || datos.TG > 150 || datos.LDL > 130 || datos.HDL < 40) {
    recomendaciones.push("PERFIL LIPÍDICO:")
    recomendaciones.push("  • Dieta baja en grasas saturadas y trans")
    recomendaciones.push("  • Aumentar omega-3 (pescado graso 2-3 veces/semana)")
    recomendaciones.push("  • Considerar tratamiento farmacológico (estatinas)")
    recomendaciones.push("  • Control lipídico cada 3-6 meses")
    recomendaciones.push("")
  }

  // Función renal
  if (datos.Cr > 1.3 || datos.Urea > 25) {
    recomendaciones.push("FUNCIÓN RENAL:")
    recomendaciones.push("  • Evaluación completa de función renal (TFG, albuminuria)")
    recomendaciones.push("  • Limitar consumo de sodio (<2300mg/día)")
    recomendaciones.push("  • Control estricto de presión arterial (<130/80)")
    recomendaciones.push("  • Hidratación adecuada (2-3 litros/día)")
    recomendaciones.push("")
  }

  // Recomendaciones generales
  if (resultado === "No Diabetes" && probabilidad < 0.25) {
    recomendaciones.push("PREVENCIÓN:")
    recomendaciones.push("  • Mantener hábitos saludables actuales")
    recomendaciones.push("  • Chequeos anuales de rutina")
    recomendaciones.push("  • Actividad física regular")
    recomendaciones.push("  • Dieta balanceada baja en azúcares")
  } else {
    recomendaciones.push("SEGUIMIENTO:")
    recomendaciones.push("  • Evaluaciones cada 3-6 meses")
    recomendaciones.push("  • Monitoreo de HbA1c, glucosa, lípidos")
    recomendaciones.push("  • Control de peso e IMC")
  }

  return recomendaciones.join("\n")
}

/**
 * Modelo de Regresión Logística entrenado con 947 muestras
 * Accuracy: 98.42% | Precision: 100% | Recall: 98.22% | AUC-ROC: 99.75%
 * Entrenado: 2024-11-23
 */
export async function realizarPrediccion(datos: DataosPred): Promise<PrediccionResultado> {
  try {
    // Validar datos
    const validation = validarDatos(datos)
    if (!validation.valido) {
      throw new Error(`Datos inválidos: ${validation.errores.join(", ")}`)
    }

    // MODELO ENTRENADO - Parámetros reales del dataset
    const MODEL = {
      intercept: 7.1669788811981245,
      coefficients: {
        Gender: 0.335497351512284,
        AGE: 0.3223037047889465,
        BMI: 3.375988439950719,
        HbA1c: 2.8953666847306057,
        Chol: 0.7156498329854006,
        TG: 0.9349895587924476,
        HDL: 0.4126440715436978,
        LDL: 0.0850782382678055,
        VLDL: 0.36401990863427697,
        Urea: 0.03244181875670607,
        Cr: -0.20203857822256888
      },
      scaler: {
        mean: {
          Gender: 0.5521796565389696,
          AGE: 53.83619550858653,
          BMI: 29.914927344782033,
          HbA1c: 8.344729194187584,
          Chol: 4.898309114927344,
          TG: 2.3615852047556145,
          HDL: 1.2094715984147952,
          LDL: 2.6254953764861293,
          VLDL: 1.9173051519154556,
          Urea: 5.17894715984148,
          Cr: 68.72258916776751
        },
        std: {
          Gender: 0.4972698296131338,
          AGE: 8.524243788001666,
          BMI: 4.8688959849529105,
          HbA1c: 2.4969151560566334,
          Chol: 1.3066420279695645,
          TG: 1.4212506343335498,
          HDL: 0.7143843721888771,
          LDL: 1.1300951779709563,
          VLDL: 3.7821703844557346,
          Urea: 3.125364817782983,
          Cr: 59.7094654901703
        }
      }
    }

    // Normalizar datos con StandardScaler (z-score)
    const datosNormalizados = {
      Gender: (datos.Gender - MODEL.scaler.mean.Gender) / MODEL.scaler.std.Gender,
      AGE: (datos.AGE - MODEL.scaler.mean.AGE) / MODEL.scaler.std.AGE,
      BMI: (datos.BMI - MODEL.scaler.mean.BMI) / MODEL.scaler.std.BMI,
      HbA1c: (datos.HbA1c - MODEL.scaler.mean.HbA1c) / MODEL.scaler.std.HbA1c,
      Chol: (datos.Chol - MODEL.scaler.mean.Chol) / MODEL.scaler.std.Chol,
      TG: (datos.TG - MODEL.scaler.mean.TG) / MODEL.scaler.std.TG,
      HDL: (datos.HDL - MODEL.scaler.mean.HDL) / MODEL.scaler.std.HDL,
      LDL: (datos.LDL - MODEL.scaler.mean.LDL) / MODEL.scaler.std.LDL,
      VLDL: (datos.VLDL - MODEL.scaler.mean.VLDL) / MODEL.scaler.std.VLDL,
      Urea: (datos.Urea - MODEL.scaler.mean.Urea) / MODEL.scaler.std.Urea,
      Cr: (datos.Cr - MODEL.scaler.mean.Cr) / MODEL.scaler.std.Cr,
    }

    // Calcular z = intercept + sum(coef_i * x_i)
    let z = MODEL.intercept
    z += datosNormalizados.Gender * MODEL.coefficients.Gender
    z += datosNormalizados.AGE * MODEL.coefficients.AGE
    z += datosNormalizados.BMI * MODEL.coefficients.BMI
    z += datosNormalizados.HbA1c * MODEL.coefficients.HbA1c
    z += datosNormalizados.Chol * MODEL.coefficients.Chol
    z += datosNormalizados.TG * MODEL.coefficients.TG
    z += datosNormalizados.HDL * MODEL.coefficients.HDL
    z += datosNormalizados.LDL * MODEL.coefficients.LDL
    z += datosNormalizados.VLDL * MODEL.coefficients.VLDL
    z += datosNormalizados.Urea * MODEL.coefficients.Urea
    z += datosNormalizados.Cr * MODEL.coefficients.Cr

    // Aplicar función logística: P(diabetes) = 1 / (1 + e^(-z))
    const probabilidad_modelo = 1 / (1 + Math.exp(-z))
    const probabilidad_diabetes_final = Math.round(probabilidad_modelo * 10000) / 10000
    const probabilidad_no_diabetes = Math.round((1 - probabilidad_diabetes_final) * 10000) / 10000

    // Resto del código permanece igual...

    // Determinar resultado CONSIDERANDO CRITERIOS CLÍNICOS
    const resultado = determinarResultado(probabilidad_diabetes_final, datos.HbA1c)

    // Calcular nivel de riesgo (va nivel de riesgo COHERENTE con resultado)
    const nivel_riesgo = calcularNivelRiesgo(probabilidad_diabetes_final, datos.HbA1c, datos.BMI)

    // Identificar factores
    const factores_riesgo = identificarFactoresRiesgo(datos, probabilidad_diabetes_final, resultado)

    // Generar recomendaciones
    const recomendaciones = generarRecomendaciones(
      datos,
      resultado,
      factores_riesgo,
      probabilidad_diabetes_final,
    )

    return {
      resultado,
      probabilidad_diabetes: probabilidad_diabetes_final,
      probabilidad_no_diabetes,
      nivel_riesgo,
      factores_riesgo,
      recomendaciones,
    }
  } catch (error) {
    console.error("Error en predicción:", error)
    throw new Error(
      `Error al realizar predicción: ${error instanceof Error ? error.message : "Desconocido"}`,
    )
  }
}

/**
 * Obtiene el modelo activo de la BD
 */
export async function obtenerModeloActivo(): Promise<ModeloIA | null> {
  try {
    const modelo = await queryOne<ModeloIA>(
      `SELECT * FROM modelo_ia WHERE activo = TRUE ORDER BY fecha_entrenamiento DESC LIMIT 1`,
    )
    return modelo
  } catch (error) {
    console.error("Error al obtener modelo activo:", error)
    return null
  }
}

/**
 * Calcula el IMC si no está en los datos
 */
export function calcularIMC(peso: number, altura: number): number {
  // altura debe estar en metros
  return Math.round((peso / (altura * altura)) * 100) / 100
}

/**
 * Valida que los datos de entrada sean válidos
 * Previene NaN, verifica campos obligatorios y rangos clínicos
 */
export function validarDatos(datos: DataosPred): { valido: boolean; errores: string[] } {
  const errores: string[] = []

  // Validar que no sean NaN
  const camposRequeridos: (keyof DataosPred)[] = [
    "Gender",
    "AGE",
    "Urea",
    "Cr",
    "HbA1c",
    "Chol",
    "TG",
    "HDL",
    "LDL",
    "VLDL",
    "BMI",
  ]

  for (const campo of camposRequeridos) {
    const valor = datos[campo]
    if (valor === null || valor === undefined) {
      errores.push(`${campo}: Campo obligatorio (no puede estar vacío)`)
      continue
    }

    if (typeof valor !== "number" || isNaN(valor)) {
      errores.push(`${campo}: Debe ser un número válido (recibió: ${valor})`)
      continue
    }

    if (!isFinite(valor)) {
      errores.push(`${campo}: Valor inválido (infinito o no válido)`)
    }
  }

  // Validaciones adicionales solo para campos que requieren restricciones
  // Gender solo puede ser 0 (Femenino) o 1 (Masculino)
  if (datos.Gender !== 0 && datos.Gender !== 1) {
    errores.push("Gender: Debe ser 0 (Femenino) o 1 (Masculino)")
  }

  // AGE debe ser positivo
  if (datos.AGE <= 0) {
    errores.push("Edad: Debe ser un valor positivo")
  }

  // BMI debe ser positivo
  if (datos.BMI <= 0) {
    errores.push("IMC: Debe ser un valor positivo")
  }

  return {
    valido: errores.length === 0,
    errores,
  }
}

/**
 * Calcula la importancia relativa de cada factor en la predicción
 * Retorna un array ordenado por importancia
 */
export function calcularImportanciaFactores(
  datos: DataosPred,
): Array<{ nombre: string; importancia: number; contribucion: number; riesgo_nivel: string }> {
  // Feature importance real del modelo
  const featureImportance = {
    BMI: 2.8686502631767,
    HbA1c: 2.3631992243027704,
    TG: 0.9613424067495561,
    Chol: 0.9542881107964201,
    HDL: 0.29184760410378857,
    Gender: 0.3183557348654833,
    AGE: 0.22936094532066664,
    VLDL: 0.22504995049774568,
    Urea: 0.10982623619557576,
    LDL: 0.04769850667047656,
    Cr: -0.04324178150248287,
  }

  // Normalizar datos
  const datosNormalizados = {
    Gender: datos.Gender - 0.5,
    AGE: (datos.AGE - 45) / 15,
    Urea: (datos.Urea - 25) / 10,
    Cr: (datos.Cr - 1.0) / 0.4,
    HbA1c: (datos.HbA1c - 5.5) / 1.5,
    Chol: (datos.Chol - 200) / 50,
    TG: (datos.TG - 150) / 100,
    HDL: (datos.HDL - 50) / 15,
    LDL: (datos.LDL - 100) / 50,
    VLDL: (datos.VLDL - 30) / 15,
    BMI: (datos.BMI - 25) / 5,
  }

  // Calcular contribución de cada factor
  const factores = []

  for (const [nombre, importancia] of Object.entries(featureImportance)) {
    const valorNormalizado = datosNormalizados[nombre as keyof typeof datosNormalizados]
    const contribucion = Math.abs(valorNormalizado * importancia)

    let riesgo_nivel = "Bajo"
    if (contribucion > 1.5) {
      riesgo_nivel = "Alto"
    } else if (contribucion > 0.75) {
      riesgo_nivel = "Moderado"
    }

    factores.push({
      nombre,
      importancia: Math.round(Math.abs(importancia) * 10000) / 10000,
      contribucion: Math.round(contribucion * 10000) / 10000,
      riesgo_nivel,
    })
  }

  // Ordenar por importancia descendente
  return factores.sort((a, b) => b.importancia - a.importancia)
}
