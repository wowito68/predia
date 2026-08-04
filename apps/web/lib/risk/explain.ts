// lib/risk/explain.ts
// Explicabilidad en lenguaje CLÍNICO (no técnico). Calcula, para este paciente,
// qué variables empujan el riesgo hacia arriba ("contribuyen") y cuáles lo
// protegen ("protegen"), a partir de la contribución de cada variable al logit
// del modelo (coeficiente × valor estandarizado). Desacoplado de la UI.
import params from "../ml-model-params.json"

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

// Etiquetas clínicas legibles por variable de origen.
const LABELS: Record<string, string> = {
  age: "Edad",
  bmi: "Índice de masa corporal (IMC)",
  waist_to_hip_ratio: "Relación cintura-cadera",
  family_history_diabetes: "Antecedentes familiares de diabetes",
  hypertension_history: "Antecedente de hipertensión",
  cardiovascular_history: "Antecedente cardiovascular",
  physical_activity_minutes_per_week: "Actividad física",
  diet_score: "Calidad de la dieta",
  sleep_hours_per_day: "Horas de sueño",
  screen_time_hours_per_day: "Tiempo frente a pantallas",
  alcohol_consumption_per_week: "Consumo de alcohol",
  smoking_status: "Tabaquismo",
  cholesterol_total: "Colesterol total",
  hdl_cholesterol: "Colesterol HDL",
  ldl_cholesterol: "Colesterol LDL",
  triglycerides: "Triglicéridos",
  systolic_bp: "Presión arterial sistólica",
  diastolic_bp: "Presión arterial diastólica",
  heart_rate: "Frecuencia cardíaca",
  gender: "Sexo",
  ethnicity: "Origen étnico",
  education_level: "Nivel educativo",
  income_level: "Nivel de ingreso",
  employment_status: "Situación laboral",
}

export interface RiskFactor {
  factor: string
  /** magnitud relativa de la contribución (para ordenar/graficar) */
  intensidad: number
}

export interface RiskExplanation {
  contribuyen: RiskFactor[]
  protegen: RiskFactor[]
}

function valueFor(spec: Spec, datos: Record<string, unknown>): number {
  const raw = datos[spec.source]
  if (spec.type === "onehot") return String(raw) === String(spec.category) ? 1 : 0
  const num = typeof raw === "number" ? raw : Number(raw)
  if (spec.type === "scale") return (num - (spec.mean ?? 0)) / (spec.scale ?? 1)
  return Number.isFinite(num) ? num : 0
}

/**
 * Devuelve los factores que contribuyen al riesgo y los que protegen, en
 * lenguaje clínico, ordenados por intensidad. `top` limita cada lista.
 */
export function explainFactors(datos: Record<string, unknown>, top = 5): RiskExplanation {
  // Contribución agregada al logit por variable de origen.
  const agg: Record<string, number> = {}
  for (const spec of SPECS) {
    agg[spec.source] = (agg[spec.source] ?? 0) + spec.coef * valueFor(spec, datos)
  }

  const contribuyen: RiskFactor[] = []
  const protegen: RiskFactor[] = []
  for (const [source, contrib] of Object.entries(agg)) {
    if (Math.abs(contrib) < 1e-4) continue
    const item: RiskFactor = {
      factor: LABELS[source] ?? source,
      intensidad: Math.round(Math.abs(contrib) * 1000) / 1000,
    }
    if (contrib > 0) contribuyen.push(item)
    else protegen.push(item)
  }

  const byInt = (a: RiskFactor, b: RiskFactor) => b.intensidad - a.intensidad
  return {
    contribuyen: contribuyen.sort(byInt).slice(0, top),
    protegen: protegen.sort(byInt).slice(0, top),
  }
}
