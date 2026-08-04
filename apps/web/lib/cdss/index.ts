// lib/cdss/index.ts — Personalized Clinical Decision Support System (FASE 3).
// Capa desacoplada: integra riesgo (lib/risk) y evolución (lib/evolution) en
// recomendaciones accionables, explicables y auditables. Sin cajas negras.
import type { PatientSnapshot } from "./snapshot"
import { evaluateRules, type FiredRule } from "./rules"
import { computePriority, type PriorityResult } from "./priority"
import { rankActions, buildWhy, type RankedAction } from "./recommend"

export * from "./snapshot"
export * from "./rules"
export * from "./priority"
export * from "./recommend"

export interface CDSSAssessment {
  riesgo: { prob: number | null; nivel: string | null }
  evolucion: { ces: number | null; banda: string | null }
  priority: PriorityResult
  alerts: FiredRule[]
  why: string[]
  recommendations: RankedAction[]
  auditable: true
}

/** Evalúa a un paciente y produce la salida completa del CDSS. */
export function assessPatient(s: PatientSnapshot): CDSSAssessment {
  const alerts = evaluateRules(s)
  const priority = computePriority(s)
  const recommendations = rankActions(s, alerts, priority.score)
  const why = buildWhy(s, alerts)
  return {
    riesgo: { prob: s.riesgo, nivel: s.nivelRiesgo },
    evolucion: { ces: s.ces, banda: s.evolucionBanda },
    priority,
    alerts,
    why,
    recommendations,
    auditable: true,
  }
}
