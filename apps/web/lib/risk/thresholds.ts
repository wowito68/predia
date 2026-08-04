// lib/risk/thresholds.ts
// Umbrales de estratificación de riesgo clínico, DERIVADOS de la curva ROC real
// del modelo de cribado (ver ml-research/derive_risk_thresholds.py y
// metrics/risk_thresholds.json). NO son arbitrarios:
//   t_bajo = 0.36  -> sensibilidad >= 0.90 (regla de exclusión)
//   t_mid  = 0.51  -> punto de Youden (mejor equilibrio)
//   t_alto = 0.63  -> especificidad >= 0.90 (regla de inclusión)
//
// Caveat clínico: el modelo es de cribado (AUC ~0.66) y la prevalencia base es
// alta; "Bajo" significa el riesgo RELATIVO más bajo del cohorte, no ausencia de
// riesgo. El lenguaje de la UI lo refleja explícitamente.

export type RiskLevel = "Bajo" | "Moderado" | "Alto" | "Muy Alto"

export const RISK_THRESHOLDS = { tBajo: 0.36, tMid: 0.51, tAlto: 0.63 } as const

export interface RiskBand {
  nivel: RiskLevel
  /** índice 1..4 (Nivel 1 = Bajo) */
  nivelNumero: 1 | 2 | 3 | 4
  min: number
  max: number
  titulo: string
  /** Descripción clínica honesta. */
  descripcion: string
  /** Acción clínica principal asociada al nivel. */
  accionClinica: string
  /** Tokens de color (paleta médica, sin colores puros, modo claro/oscuro). */
  color: {
    /** clases Tailwind para badge/etiqueta */
    badge: string
    /** clases para fondo de tarjeta */
    card: string
    /** clase de texto de acento */
    accent: string
    /** color del medidor (hex, tono médico) */
    gauge: string
    /** color del medidor en modo oscuro (hex) */
    gaugeDark: string
  }
}

export const RISK_BANDS: RiskBand[] = [
  {
    nivel: "Bajo",
    nivelNumero: 1,
    min: 0,
    max: RISK_THRESHOLDS.tBajo,
    titulo: "Riesgo Bajo",
    descripcion:
      "Riesgo relativo más bajo dentro del cohorte evaluado. No equivale a ausencia de riesgo.",
    accionClinica: "Seguimiento normal. Mantener hábitos saludables.",
    color: {
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
      card: "bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900",
      accent: "text-emerald-700 dark:text-emerald-400",
      gauge: "#059669",
      gaugeDark: "#34D399",
    },
  },
  {
    nivel: "Moderado",
    nivelNumero: 2,
    min: RISK_THRESHOLDS.tBajo,
    max: RISK_THRESHOLDS.tMid,
    titulo: "Riesgo Moderado",
    descripcion: "Riesgo intermedio. Conviene intervención preventiva temprana.",
    accionClinica: "Recomendar cambios de estilo de vida y seguimiento preventivo.",
    color: {
      badge: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
      card: "bg-amber-50/60 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900",
      accent: "text-amber-700 dark:text-amber-400",
      gauge: "#D97706",
      gaugeDark: "#FBBF24",
    },
  },
  {
    nivel: "Alto",
    nivelNumero: 3,
    min: RISK_THRESHOLDS.tMid,
    max: RISK_THRESHOLDS.tAlto,
    titulo: "Riesgo Alto",
    descripcion: "Riesgo elevado. Requiere confirmación y vigilancia estrecha.",
    accionClinica: "Solicitar estudios complementarios y monitoreo más frecuente.",
    color: {
      badge: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-900",
      card: "bg-orange-50/60 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900",
      accent: "text-orange-700 dark:text-orange-400",
      gauge: "#EA580C",
      gaugeDark: "#FB923C",
    },
  },
  {
    nivel: "Muy Alto",
    nivelNumero: 4,
    min: RISK_THRESHOLDS.tAlto,
    max: 1.01,
    titulo: "Riesgo Muy Alto",
    descripcion: "Riesgo muy elevado dentro del cohorte. Prioridad clínica.",
    accionClinica: "Referencia médica prioritaria y evaluación clínica inmediata.",
    color: {
      badge: "bg-red-100 text-red-900 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900",
      card: "bg-red-50/70 border-red-300 dark:bg-red-950/30 dark:border-red-900",
      accent: "text-red-800 dark:text-red-300",
      gauge: "#991B1B",
      gaugeDark: "#F87171",
    },
  },
]
