// lib/cdss/snapshot.ts
// Snapshot clínico del paciente que alimenta el Asistente Clínico (FASE 3).
// Se arma desde el EHR real reutilizando el motor de evolución (lib/evolution) y la
// estratificación de riesgo (lib/risk). Los campos sin dato en el EHR (p. ej. adherencia)
// se omiten y el motor los ignora / renormaliza.
import type { PatientEvolution } from "@/lib/evolution"

export interface PatientSnapshot {
  /** Probabilidad de diabetes [0,1] de la última predicción, o null si no hay. */
  riesgo: number | null
  /** Banda de riesgo (lib/risk) de la última predicción. */
  nivelRiesgo: string | null
  /** Clinical Evolution Score 0-100 (50 = estable), o null si no hay serie suficiente. */
  ces: number | null
  evolucionBanda: string | null
  // Valores actuales (última medición disponible)
  glucosa: number | null
  imc: number | null
  pas: number | null
  pad: number | null
  peso: number | null
  // Pendientes temporales (por mes) del motor de evolución
  glucosaSlope: number
  imcSlope: number
  pesoSlope: number
  // Eventos detectados por el motor de evolución
  eventos: { tipo: string; severidad: "info" | "warning" | "critical"; mensaje: string }[]
  // Contexto clínico
  comorbilidades: string[]
  nComorbilidades: number
  medicacion: string[]
  nMedicacion: number
  /** Días desde la última consulta, o null si nunca hubo. */
  diasSinConsulta: number | null
  /** Factores de riesgo de la última predicción (atribución, para "¿Por qué?"). */
  factoresRiesgo: string[]
}

export interface BuildSnapshotParams {
  evolution: PatientEvolution
  riesgo: number | null
  nivelRiesgo: string | null
  factoresRiesgo: string[]
  comorbilidades: string[]
  medicacion: string[]
  diasSinConsulta: number | null
}

function metric(evolution: PatientEvolution, key: string) {
  return evolution.variables.find((v) => v.key === key) ?? null
}

/** Ensambla el snapshot a partir de las piezas ya consultadas del EHR (testeable). */
export function buildSnapshot(p: BuildSnapshotParams): PatientSnapshot {
  const glu = metric(p.evolution, "glucosa")
  const imc = metric(p.evolution, "imc")
  const pas = metric(p.evolution, "pas")
  const pad = metric(p.evolution, "pad")
  const peso = metric(p.evolution, "peso")

  return {
    riesgo: p.riesgo,
    nivelRiesgo: p.nivelRiesgo,
    ces: p.evolution.ces?.ces ?? null,
    evolucionBanda: p.evolution.ces?.banda ?? null,
    glucosa: glu?.actual ?? null,
    imc: imc?.actual ?? null,
    pas: pas?.actual ?? null,
    pad: pad?.actual ?? null,
    peso: peso?.actual ?? null,
    glucosaSlope: glu?.slopePerMonth ?? 0,
    imcSlope: imc?.slopePerMonth ?? 0,
    pesoSlope: peso?.slopePerMonth ?? 0,
    eventos: p.evolution.eventos,
    comorbilidades: p.comorbilidades,
    nComorbilidades: p.comorbilidades.length,
    medicacion: p.medicacion,
    nMedicacion: p.medicacion.length,
    diasSinConsulta: p.diasSinConsulta,
    factoresRiesgo: p.factoresRiesgo,
  }
}
