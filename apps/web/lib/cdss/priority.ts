// lib/cdss/priority.ts — FASE 3B: Priority Score 0-100.
// Combina riesgo actual, evolución (CES), eventos recientes y comorbilidades.
// Los componentes sin dato se omiten y los pesos se renormalizan.
import type { PatientSnapshot } from "./snapshot"

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v))

const WEIGHTS = { riesgo: 0.4, evolucion: 0.25, eventos: 0.2, comorbilidades: 0.15 } as const

export type PriorityBand = "Baja" | "Media" | "Alta" | "Crítica"

export interface PriorityResult {
  score: number
  band: PriorityBand
  topDriver: string
  contributions: Record<string, number>
}

export function priorityBand(score: number): PriorityBand {
  if (score >= 75) return "Crítica"
  if (score >= 50) return "Alta"
  if (score >= 25) return "Media"
  return "Baja"
}

export function computePriority(s: PatientSnapshot): PriorityResult {
  // Componentes normalizados [0,1] (mayor = más prioritario); null = sin dato
  const comp: Record<string, number | null> = {
    riesgo: s.riesgo != null ? clamp(s.riesgo) : null,
    evolucion: s.ces != null ? clamp((50 - s.ces) / 50) : null,
    eventos: clamp(
      s.eventos.reduce((a, e) => a + (e.severidad === "critical" ? 1 : e.severidad === "warning" ? 0.5 : 0), 0) / 2,
    ),
    comorbilidades: clamp(s.nComorbilidades / 3),
  }

  // Renormaliza los pesos sobre los componentes con dato
  let wSum = 0
  for (const k of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
    if (comp[k] != null) wSum += WEIGHTS[k]
  }
  if (wSum === 0) wSum = 1

  const contributions: Record<string, number> = {}
  let total = 0
  for (const k of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
    const c = comp[k]
    if (c == null) continue
    const contrib = (100 * (WEIGHTS[k] / wSum) * c)
    contributions[k] = Math.round(contrib * 10) / 10
    total += contrib
  }

  const score = Math.round(clamp(total, 0, 100) * 10) / 10
  const topDriver =
    Object.keys(contributions).sort((a, b) => contributions[b] - contributions[a])[0] ?? "—"

  return { score, band: priorityBand(score), topDriver, contributions }
}
