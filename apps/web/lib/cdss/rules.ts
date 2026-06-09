// lib/cdss/rules.ts — FASE 3A: motor de reglas clínicas declarativo y auditable.
// Cada regla es IF condición THEN alerta/acción, con severidad, acción recomendada y la
// evidencia (los valores que la dispararon → rule trace). Reglas cuyos datos no existan
// en el EHR del paciente simplemente no disparan.
import type { PatientSnapshot } from "./snapshot"

export const CDSS_THRESHOLDS = {
  glucosaAlta: 130,
  glucosaMuyAlta: 180,
  imcObesidad: 30,
  pasElevada: 130,
  pasCrisis: 160,
  padCrisis: 100,
  riesgoMuyAlto: 0.4,
  riesgoAlto: 0.2,
  diasSinConsulta: 120,
  cesDeterioro: 40,
  glucosaSlopeAlta: 8,
  pesoSlopeAlta: 1,
} as const

export type Severity = "info" | "warning" | "critical"

export interface FiredRule {
  ruleId: string
  name: string
  severity: Severity
  action: string
  message: string
  priorityFlag: boolean
  evidence: Record<string, number | string | boolean>
}

interface RuleDef {
  id: string
  name: string
  severity: Severity
  action: string
  message: string
  priorityFlag?: boolean
  check: (s: PatientSnapshot) => Record<string, number | string | boolean> | null
}

const T = CDSS_THRESHOLDS

const RULES: RuleDef[] = [
  {
    id: "R01", name: "Hiperglucemia + obesidad", severity: "warning", action: "revisar_tratamiento",
    message: "Glucosa e IMC elevados de forma simultánea.",
    check: (s) =>
      s.glucosa != null && s.imc != null && s.glucosa > T.glucosaAlta && s.imc > T.imcObesidad
        ? { glucosa: s.glucosa, imc: s.imc } : null,
  },
  {
    id: "R03", name: "Riesgo muy alto sin consulta reciente", severity: "critical",
    action: "contacto_preventivo", priorityFlag: true,
    message: "Riesgo muy alto y sin consulta reciente: sugerir contacto preventivo.",
    check: (s) =>
      s.riesgo != null && s.riesgo >= T.riesgoMuyAlto && s.diasSinConsulta != null &&
      s.diasSinConsulta > T.diasSinConsulta
        ? { riesgo: s.riesgo, diasSinConsulta: s.diasSinConsulta } : null,
  },
  {
    id: "R04", name: "Glucosa muy alta", severity: "critical", action: "revisar_tratamiento",
    message: "Glucosa en rango muy alto: revisar tratamiento y reconfirmar medición.",
    check: (s) => (s.glucosa != null && s.glucosa >= T.glucosaMuyAlta ? { glucosa: s.glucosa } : null),
  },
  {
    id: "R05", name: "Crisis hipertensiva", severity: "critical", action: "derivar_especialista",
    priorityFlag: true, message: "Presión arterial en rango de crisis.",
    check: (s) =>
      (s.pas != null && s.pas >= T.pasCrisis) || (s.pad != null && s.pad >= T.padCrisis)
        ? { pas: s.pas ?? 0, pad: s.pad ?? 0 } : null,
  },
  {
    id: "R07", name: "Evolución desfavorable", severity: "warning", action: "evaluar_factores",
    priorityFlag: true, message: "Índice de evolución clínica bajo: deterioro de la evolución.",
    check: (s) => (s.ces != null && s.ces < T.cesDeterioro ? { ces: s.ces } : null),
  },
  {
    id: "R08", name: "Tendencia glucémica creciente", severity: "warning", action: "revisar_tratamiento",
    message: "Glucosa con pendiente creciente sostenida.",
    check: (s) => (s.glucosaSlope >= T.glucosaSlopeAlta ? { glucosaSlope: s.glucosaSlope } : null),
  },
  {
    id: "R10", name: "Datos clínicos desactualizados", severity: "info", action: "actualizar_glucosa",
    message: "Sin registros recientes: actualizar glucosa/signos vitales.",
    check: (s) =>
      s.diasSinConsulta != null && s.diasSinConsulta > T.diasSinConsulta
        ? { diasSinConsulta: s.diasSinConsulta } : null,
  },
  {
    id: "R11", name: "Multicomorbilidad con riesgo alto", severity: "warning",
    action: "derivar_especialista", priorityFlag: true,
    message: "Dos o más comorbilidades con riesgo elevado.",
    check: (s) =>
      s.nComorbilidades >= 2 && s.riesgo != null && s.riesgo >= T.riesgoAlto
        ? { comorbilidades: s.comorbilidades.join(", "), riesgo: s.riesgo } : null,
  },
  {
    id: "R12", name: "Aumento de peso sostenido", severity: "warning", action: "evaluar_factores",
    message: "Peso con pendiente creciente relevante.",
    check: (s) => (s.pesoSlope >= T.pesoSlopeAlta ? { pesoSlope: s.pesoSlope } : null),
  },
]

const SEV_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }

/** Evalúa todas las reglas sobre el snapshot y devuelve la traza de las que disparan. */
export function evaluateRules(s: PatientSnapshot): FiredRule[] {
  const fired: FiredRule[] = []
  for (const r of RULES) {
    const evidence = r.check(s)
    if (evidence) {
      fired.push({
        ruleId: r.id, name: r.name, severity: r.severity, action: r.action,
        message: r.message, priorityFlag: !!r.priorityFlag, evidence,
      })
    }
  }
  return fired.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity])
}

/** Catálogo de reglas (sin lambdas) para auditoría/documentación. */
export function ruleCatalog() {
  return RULES.map(({ id, name, severity, action, message, priorityFlag }) => ({
    id, name, severity, action, message, priorityFlag: !!priorityFlag,
  }))
}
