// lib/evolution/events.ts — Fase 4: detección automática de eventos clínicos.
import { SeriesMetrics, CESResult } from "./analyze"

export interface EvolutionEvent {
  tipo: string
  severidad: "info" | "warning" | "critical"
  mensaje: string
}

export function detectEvents(metrics: SeriesMetrics[], ces: CESResult | null): EvolutionEvent[] {
  const byKey: Record<string, SeriesMetrics> = Object.fromEntries(metrics.map((m) => [m.key, m]))
  const ev: EvolutionEvent[] = []
  const glu = byKey["glucosa"], imc = byKey["imc"], pas = byKey["pas"], pad = byKey["pad"]

  if (glu && glu.n >= 2 && (glu.slopePerMonth >= 8 || (glu.slopePerMonth > 0 && glu.accelPerMonth2 > 0))) {
    ev.push({
      tipo: "glucosa_aumentando",
      severidad: glu.slopePerMonth >= 15 ? "critical" : "warning",
      mensaje: `Glucosa aumentando rápidamente (+${glu.slopePerMonth} mg/dL por mes).`,
    })
  }
  if (imc && imc.n >= 3 && imc.slopePerMonth > 0 && imc.r2 >= 0.5) {
    ev.push({
      tipo: "imc_creciente_sostenido",
      severidad: "warning",
      mensaje: `IMC creciendo de forma sostenida (+${imc.slopePerMonth}/mes, R²=${imc.r2}).`,
    })
  }
  if ((pas && pas.n >= 2 && pas.slopePerMonth >= 3) || (pad && pad.n >= 2 && pad.slopePerMonth >= 2)) {
    ev.push({
      tipo: "presion_empeorando",
      severidad: "warning",
      mensaje: "Presión arterial empeorando en el tiempo.",
    })
  }
  const scored = metrics.filter((m) => m.n >= 2 && ["glucosa", "imc", "pas", "pad"].includes(m.key))
  if (scored.length > 0 && scored.every((m) => Math.abs(m.s) < 0.2) && ces && ces.S >= 0.8) {
    ev.push({ tipo: "estable", severidad: "info", mensaje: "Paciente clínicamente estable." })
  }
  if (ces && ces.ces >= 65 && glu && glu.slopePerMonth < 0 && imc && imc.slopePerMonth < 0) {
    ev.push({
      tipo: "mejora_significativa",
      severidad: "info",
      mensaje: `Mejora significativa (CES ${ces.ces}): glucosa e IMC en descenso.`,
    })
  }
  return ev
}
