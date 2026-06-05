// lib/ml-predict.ts
// Modelo de cribado (Regresión Logística) entrenado sobre diabetes_dataset.csv
// en el MARCO HONESTO (sin laboratorios diagnósticos), evitando data leakage.
//
// La SALIDA ya no es un diagnóstico binario ("Diabetes / No Diabetes"); es una
// ESTRATIFICACIÓN DE RIESGO CLÍNICO (Bajo/Moderado/Alto/Muy Alto) calculada por
// la capa desacoplada en `lib/risk/` con umbrales derivados de la curva ROC.
import params from "./ml-model-params.json"
import { query, queryOne } from "./db"
import type { ModeloIA } from "@/types/database"
import {
  stratifyRisk, getRecommendations, explainFactors,
  type RiskLevel, type RiskRecommendation, type RiskFactor,
} from "./risk"

// Contrato de entrada (features de cribado).
export interface DataosPred {
  gender: string
  ethnicity: string
  education_level: string
  income_level: string
  employment_status: string
  smoking_status: string
  family_history_diabetes: number
  hypertension_history: number
  cardiovascular_history: number
  age: number
  alcohol_consumption_per_week: number
  physical_activity_minutes_per_week: number
  diet_score: number
  sleep_hours_per_day: number
  screen_time_hours_per_day: number
  bmi: number
  waist_to_hip_ratio: number
  systolic_bp: number
  diastolic_bp: number
  heart_rate: number
  cholesterol_total: number
  hdl_cholesterol: number
  ldl_cholesterol: number
  triglycerides: number
}

export interface PrediccionResultado {
  /** Compatibilidad: ahora contiene el NIVEL de riesgo, no un diagnóstico. */
  resultado: RiskLevel
  score: number
  probabilidad_diabetes: number
  probabilidad_no_diabetes: number
  nivel_riesgo: RiskLevel
  nivel_numero: number
  titulo: string
  descripcion: string
  accion_clinica: string
  factores_riesgo: string[]
  contribuyen: RiskFactor[]
  protegen: RiskFactor[]
  recomendaciones: string
  recomendaciones_estructuradas: RiskRecommendation
}

interface Spec {
  feature: string
  type: "onehot" | "scale" | "passthrough"
  source: string
  category?: string | null
  mean?: number
  scale?: number
  coef: number
}

const SPECS = params.specs as Spec[]

function valueFor(spec: Spec, datos: Record<string, unknown>): number {
  const raw = datos[spec.source]
  if (spec.type === "onehot") return String(raw) === String(spec.category) ? 1 : 0
  const num = typeof raw === "number" ? raw : Number(raw)
  if (spec.type === "scale") return (num - (spec.mean ?? 0)) / (spec.scale ?? 1)
  return Number.isFinite(num) ? num : 0
}

// Banderas clínicas legibles (umbrales clínicos de referencia, no del modelo).
function factoresRiesgo(datos: DataosPred): string[] {
  const f: string[] = []
  if (datos.bmi >= 30) f.push("Obesidad (IMC ≥30)")
  else if (datos.bmi >= 25) f.push("Sobrepeso (IMC 25-29.9)")
  if (datos.family_history_diabetes) f.push("Antecedente familiar de diabetes")
  if (datos.hypertension_history) f.push("Antecedente de hipertensión")
  if (datos.cardiovascular_history) f.push("Antecedente cardiovascular")
  if (datos.physical_activity_minutes_per_week < 150) f.push("Actividad física insuficiente (<150 min/sem)")
  if (datos.age >= 45) f.push("Edad ≥45 años")
  if (datos.waist_to_hip_ratio >= 0.9) f.push("Relación cintura-cadera elevada")
  if (datos.triglycerides > 150) f.push("Triglicéridos elevados (>150 mg/dL)")
  if (datos.hdl_cholesterol < 40) f.push("HDL bajo (<40 mg/dL)")
  return [...new Set(f)]
}

export async function realizarPrediccion(datos: DataosPred): Promise<PrediccionResultado> {
  const validation = validarDatos(datos)
  if (!validation.valido) {
    throw new Error(`Datos inválidos: ${validation.errores.join(", ")}`)
  }

  const d = datos as unknown as Record<string, unknown>
  let z = params.intercept as number
  for (const spec of SPECS) z += spec.coef * valueFor(spec, d)

  const p = 1 / (1 + Math.exp(-z))
  const score = Math.round(p * 10000) / 10000

  // Capa de estratificación (desacoplada)
  const band = stratifyRisk(p)
  const explicacion = explainFactors(d)
  const recs = getRecommendations(band.nivel)
  const recomendacionesTexto = [
    band.accionClinica,
    `Seguimiento: ${recs.seguimiento}`,
    ...recs.acciones.map((a) => `• ${a}`),
  ].join("\n")

  return {
    resultado: band.nivel,
    score,
    probabilidad_diabetes: score,
    probabilidad_no_diabetes: Math.round((1 - p) * 10000) / 10000,
    nivel_riesgo: band.nivel,
    nivel_numero: band.nivelNumero,
    titulo: band.titulo,
    descripcion: band.descripcion,
    accion_clinica: band.accionClinica,
    factores_riesgo: factoresRiesgo(datos),
    contribuyen: explicacion.contribuyen,
    protegen: explicacion.protegen,
    recomendaciones: recomendacionesTexto,
    recomendaciones_estructuradas: recs,
  }
}

export function validarDatos(datos: DataosPred): { valido: boolean; errores: string[] } {
  const errores: string[] = []
  const numericos: (keyof DataosPred)[] = [
    "age", "bmi", "waist_to_hip_ratio", "systolic_bp", "diastolic_bp", "heart_rate",
    "cholesterol_total", "hdl_cholesterol", "ldl_cholesterol", "triglycerides",
    "alcohol_consumption_per_week", "physical_activity_minutes_per_week",
    "diet_score", "sleep_hours_per_day", "screen_time_hours_per_day",
  ]
  for (const c of numericos) {
    const v = datos[c]
    if (v === null || v === undefined || typeof v !== "number" || !isFinite(v)) {
      errores.push(`${c}: número válido requerido`)
    }
  }
  if (datos.age <= 0) errores.push("age: debe ser positivo")
  if (datos.bmi <= 0) errores.push("bmi: debe ser positivo")
  return { valido: errores.length === 0, errores }
}

/** Importancia local: contribución |coef * valor| por variable de entrada. */
export function calcularImportanciaFactores(
  datos: DataosPred,
): Array<{ nombre: string; importancia: number; contribucion: number; riesgo_nivel: string }> {
  const d = datos as unknown as Record<string, unknown>
  const agg: Record<string, number> = {}
  for (const spec of SPECS) {
    const contrib = Math.abs(spec.coef * valueFor(spec, d))
    agg[spec.source] = (agg[spec.source] ?? 0) + contrib
  }
  return Object.entries(agg)
    .map(([nombre, contribucion]) => ({
      nombre,
      importancia: Math.round(contribucion * 10000) / 10000,
      contribucion: Math.round(contribucion * 10000) / 10000,
      riesgo_nivel: contribucion > 1.0 ? "Alto" : contribucion > 0.4 ? "Moderado" : "Bajo",
    }))
    .sort((a, b) => b.contribucion - a.contribucion)
}

export async function obtenerModeloActivo(): Promise<ModeloIA | null> {
  try {
    return await queryOne<ModeloIA>(
      `SELECT * FROM modelo_ia WHERE activo = TRUE ORDER BY fecha_entrenamiento DESC LIMIT 1`,
    )
  } catch (error) {
    console.error("Error al obtener modelo activo:", error)
    return null
  }
}

export function calcularIMC(peso: number, altura: number): number {
  return Math.round((peso / (altura * altura)) * 100) / 100
}
