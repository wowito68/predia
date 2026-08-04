// lib/risk/recommendations.ts
// Motor de recomendaciones DESACOPLADO del modelo: reglas por nivel de riesgo.
// Ampliable (p. ej. mover a BD o reglas por factor) sin tocar el modelo ni la UI.
import { RiskLevel } from "./thresholds"

export interface RiskRecommendation {
  seguimiento: string
  acciones: string[]
}

const TABLE: Record<RiskLevel, RiskRecommendation> = {
  Bajo: {
    seguimiento: "Control anual de rutina.",
    acciones: [
      "Mantener los hábitos saludables actuales.",
      "Dieta balanceada y actividad física regular.",
      "Reevaluar el riesgo en el próximo control anual.",
    ],
  },
  Moderado: {
    seguimiento: "Control preventivo semestral.",
    acciones: [
      "Incrementar la actividad física a ≥150 min/semana.",
      "Optimizar la dieta y el control de peso.",
      "Reevaluar el riesgo en 6 meses.",
    ],
  },
  Alto: {
    seguimiento: "Seguimiento trimestral.",
    acciones: [
      "Solicitar estudios de laboratorio (HbA1c y glucosa en ayunas).",
      "Intervención intensiva sobre el estilo de vida.",
      "Monitoreo clínico más frecuente.",
    ],
  },
  "Muy Alto": {
    seguimiento: "Evaluación médica prioritaria.",
    acciones: [
      "Referencia/valoración médica inmediata.",
      "Estudios diagnósticos completos para confirmar el estado glucémico.",
      "Plan de manejo individualizado y seguimiento estrecho.",
    ],
  },
}

export function getRecommendations(nivel: RiskLevel): RiskRecommendation {
  return TABLE[nivel]
}
