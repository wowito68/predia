// lib/cdss/recommend.ts — FASE 3F: ranking de recomendaciones (Top-5) + ensamblaje.
import type { PatientSnapshot } from "./snapshot"
import type { FiredRule, Severity } from "./rules"
import { CDSS_THRESHOLDS as T } from "./rules"

export interface ActionDef {
  label: string
  baseImpact: number
}

export const ACTION_CATALOG: Record<string, ActionDef> = {
  actualizar_glucosa: { label: "Actualizar glucosa", baseImpact: 0.6 },
  actualizar_signos: { label: "Actualizar signos vitales (PA/peso)", baseImpact: 0.5 },
  programar_consulta: { label: "Programar consulta", baseImpact: 0.7 },
  contacto_preventivo: { label: "Contacto preventivo", baseImpact: 0.65 },
  revisar_tratamiento: { label: "Revisar/ajustar tratamiento", baseImpact: 0.8 },
  evaluar_factores: { label: "Evaluar factores de riesgo modificables", baseImpact: 0.5 },
  educacion_habitos: { label: "Educación en hábitos (dieta/actividad)", baseImpact: 0.45 },
  derivar_especialista: { label: "Derivar a especialista", baseImpact: 0.85 },
}

const SEV_BOOST: Record<Severity, number> = { critical: 1.6, warning: 1.3, info: 1.05 }

export interface RankedAction {
  rank: number
  action: string
  label: string
  impact: number
  reason: string
}

/** Top-N acciones ordenadas por impacto esperado (impacto base × relevancia). */
export function rankActions(
  s: PatientSnapshot, fired: FiredRule[], priorityScore: number, top = 5,
): RankedAction[] {
  const cand = new Map<string, { impact: number; reason: string }>()
  const add = (action: string, mult: number, reason: string) => {
    const def = ACTION_CATALOG[action]
    if (!def) return
    const impact = def.baseImpact * mult
    const prev = cand.get(action)
    if (!prev || impact > prev.impact) cand.set(action, { impact, reason })
  }

  // 1) Acciones de reglas disparadas (con su evidencia como razón)
  for (const r of fired) add(r.action, SEV_BOOST[r.severity], `[${r.ruleId}] ${r.message}`)

  // 2) Acciones según el estado clínico
  const stale = s.diasSinConsulta != null ? Math.min(s.diasSinConsulta / 120, 1.5) : 0.4
  add("actualizar_glucosa", 0.5 + stale,
    s.diasSinConsulta != null ? `Última actividad hace ${Math.round(s.diasSinConsulta)} días` : "Mantener glucosa al día")
  add("actualizar_signos", 0.5 + 0.7 * stale, "Mantener signos vitales al día")
  add("programar_consulta", 0.6 + priorityScore / 100, `Prioridad clínica = ${Math.round(priorityScore)}/100`)
  if (s.riesgo != null && s.riesgo >= T.riesgoMuyAlto) {
    add("contacto_preventivo", 1.2, `Riesgo muy alto (${(s.riesgo * 100).toFixed(0)}%)`)
    add("derivar_especialista", 0.9 + 0.3 * s.nComorbilidades,
      `Riesgo ${(s.riesgo * 100).toFixed(0)}% + ${s.nComorbilidades} comorbilidades`)
  }
  if (s.glucosa != null && (s.glucosa >= T.glucosaAlta || s.glucosaSlope >= T.glucosaSlopeAlta)) {
    add("revisar_tratamiento", 1.1,
      `Glucosa ${s.glucosa.toFixed(0)} (tendencia ${s.glucosaSlope >= 0 ? "+" : ""}${s.glucosaSlope.toFixed(1)}/mes)`)
  }
  add("evaluar_factores", 0.7 + 0.4 * (s.riesgo ?? 0), "Revisar factores de riesgo modificables")

  return [...cand.entries()]
    .map(([action, v]) => ({ action, label: ACTION_CATALOG[action].label, ...v }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, top)
    .map((a, i) => ({ rank: i + 1, action: a.action, label: a.label, impact: Math.round(a.impact * 1000) / 1000, reason: a.reason }))
}

/** Construye las viñetas "¿Por qué?" combinando factores de riesgo + reglas. */
export function buildWhy(s: PatientSnapshot, fired: FiredRule[]): string[] {
  const bullets: string[] = []
  for (const f of s.factoresRiesgo.slice(0, 4)) bullets.push(f)
  for (const r of fired) if (r.severity !== "info") bullets.push(`[${r.ruleId}] ${r.message}`)
  return bullets
}
