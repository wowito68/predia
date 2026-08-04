// __tests__/cdss.test.ts — FASE 3H: validación del motor CDSS (lib/cdss).
import { assessPatient, type PatientSnapshot } from "@/lib/cdss"

function snap(overrides: Partial<PatientSnapshot> = {}): PatientSnapshot {
  return {
    riesgo: 0.1, nivelRiesgo: "Bajo", ces: 60, evolucionBanda: "Mejoría leve",
    glucosa: 95, imc: 24, pas: 118, pad: 76, peso: 70,
    glucosaSlope: 0, imcSlope: 0, pesoSlope: 0,
    eventos: [], comorbilidades: [], nComorbilidades: 0,
    medicacion: [], nMedicacion: 0, diasSinConsulta: 20, factoresRiesgo: [],
    ...overrides,
  }
}

describe("CDSS assessPatient", () => {
  it("es monótono: a mayor riesgo, mayor Priority Score", () => {
    const low = assessPatient(snap({ riesgo: 0.05 })).priority.score
    const mid = assessPatient(snap({ riesgo: 0.3 })).priority.score
    const high = assessPatient(snap({ riesgo: 0.7 })).priority.score
    expect(low).toBeLessThan(mid)
    expect(mid).toBeLessThan(high)
  })

  it("clasifica al paciente sano como prioridad Baja y sin alertas críticas", () => {
    const a = assessPatient(snap())
    expect(a.priority.band).toBe("Baja")
    expect(a.alerts.some((x) => x.severity === "critical")).toBe(false)
  })

  it("dispara alertas críticas y prioridad alta en un paciente descompensado", () => {
    const a = assessPatient(snap({
      riesgo: 0.85, ces: 20, glucosa: 200, imc: 34, pas: 170, pad: 105,
      glucosaSlope: 12, comorbilidades: ["Hipertensión", "Obesidad"], nComorbilidades: 2,
      diasSinConsulta: 200,
    }))
    expect(a.alerts.some((x) => x.severity === "critical")).toBe(true)
    expect(["Alta", "Crítica"]).toContain(a.priority.band)
    // R04 (glucosa muy alta) y R05 (crisis HTA) deben dispararse
    const ids = a.alerts.map((x) => x.ruleId)
    expect(ids).toEqual(expect.arrayContaining(["R04", "R05"]))
  })

  it("toda recomendación incluye su razón (auditable) y se limita a 5", () => {
    const a = assessPatient(snap({ riesgo: 0.6, glucosa: 160, glucosaSlope: 10 }))
    expect(a.recommendations.length).toBeGreaterThan(0)
    expect(a.recommendations.length).toBeLessThanOrEqual(5)
    for (const r of a.recommendations) {
      expect(typeof r.reason).toBe("string")
      expect(r.reason.length).toBeGreaterThan(0)
      expect(r.label.length).toBeGreaterThan(0)
    }
  })

  it("cada alerta lleva evidencia (trazabilidad) y la salida es auditable", () => {
    const a = assessPatient(snap({ glucosa: 190 }))
    expect(a.auditable).toBe(true)
    for (const al of a.alerts) expect(al.evidence).toBeDefined()
  })

  it("renormaliza la prioridad cuando faltan componentes (sin riesgo ni CES)", () => {
    const a = assessPatient(snap({ riesgo: null, nivelRiesgo: null, ces: null, evolucionBanda: null }))
    expect(a.priority.score).toBeGreaterThanOrEqual(0)
    expect(a.priority.score).toBeLessThanOrEqual(100)
  })
})
