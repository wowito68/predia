// lib/evolution/config.ts
// Configuración clínica del motor de evolución. Constantes justificadas en
// docs/clinical-evolution-score.md (NO arbitrarias).

export interface VarConfig {
  key: string
  label: string
  unidad: string
  /** cambio mensual "clínicamente fuerte" (ancla del puntaje direccional) */
  kappa: number
  /** peso en el CES (0 = se reporta pero no puntúa) */
  omega: number
  /** true si DISMINUIR es clínicamente bueno */
  lowerIsBetter: boolean
}

export const EVOLUTION_VARS: VarConfig[] = [
  { key: "glucosa", label: "Glucosa", unidad: "mg/dL", kappa: 10, omega: 0.40, lowerIsBetter: true },
  { key: "imc", label: "IMC", unidad: "kg/m²", kappa: 0.5, omega: 0.25, lowerIsBetter: true },
  { key: "pas", label: "Presión sistólica", unidad: "mmHg", kappa: 5, omega: 0.20, lowerIsBetter: true },
  { key: "pad", label: "Presión diastólica", unidad: "mmHg", kappa: 3, omega: 0.15, lowerIsBetter: true },
  { key: "peso", label: "Peso", unidad: "kg", kappa: 1, omega: 0, lowerIsBetter: true },
  { key: "hba1c", label: "HbA1c", unidad: "%", kappa: 0.5, omega: 0, lowerIsBetter: true },
]

export const VAR_BY_KEY: Record<string, VarConfig> = Object.fromEntries(EVOLUTION_VARS.map((v) => [v.key, v]))

export const CV_MAX = 0.20
// Penalización por volatilidad: la fluctuación resta confianza a la tendencia.
// Ancla CES=50 para un paciente estable (T_dir=0) con baja volatilidad (S→1).
export const VOL_PENALTY = 0.5
// Ventana mínima de observación para una tendencia fiable. Con mediciones muy
// juntas en el tiempo, extrapolar a "por mes" es inestable; se exige ≥14 días.
export const MIN_SPAN_DAYS = 14

export function cesBanda(ces: number): string {
  if (ces >= 70) return "Mejoría clara"
  if (ces >= 56) return "Mejoría leve"
  if (ces >= 45) return "Estable"
  if (ces >= 30) return "Deterioro leve"
  return "Deterioro marcado"
}
