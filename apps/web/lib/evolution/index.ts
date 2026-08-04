// lib/evolution/index.ts — Motor matemático de evolución clínica (desacoplado).
import { Point } from "./timeseries"
import { EVOLUTION_VARS } from "./config"
import { analyzeSeries, computeCES, SeriesMetrics, CESResult } from "./analyze"
import { detectEvents, EvolutionEvent } from "./events"

export * from "./timeseries"
export * from "./config"
export * from "./analyze"
export * from "./events"

export interface PatientEvolution {
  variables: SeriesMetrics[]
  ces: CESResult | null
  eventos: EvolutionEvent[]
}

/**
 * Orquesta el análisis de evolución de un paciente.
 * @param seriesByKey { glucosa: Point[], imc: Point[], pas: Point[], pad: Point[], peso: Point[], hba1c: Point[] }
 *        donde cada Point tiene t en DÍAS desde la primera medición.
 */
export function analyzePatient(seriesByKey: Record<string, Point[]>): PatientEvolution {
  const variables = EVOLUTION_VARS.map((cfg) => analyzeSeries(cfg, seriesByKey[cfg.key] ?? []))
  const ces = computeCES(variables)
  const eventos = detectEvents(variables, ces)
  return { variables, ces, eventos }
}
