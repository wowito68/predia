// scripts/verify-asistente.ts
// Verificación end-to-end del Asistente Clínico SIN base de datos: alimenta series
// sintéticas por la misma cadena que usa la ruta API (analyzePatient -> buildSnapshot
// -> assessPatient) y muestra la evaluación del CDSS.
//   Ejecutar:  npx tsx scripts/verify-asistente.ts
import { analyzePatient, type Point } from "../lib/evolution"
import { buildSnapshot, assessPatient } from "../lib/cdss"

// Paciente que se deteriora: glucosa e IMC subiendo, PA en crisis al final.
function series(base: number, slopePerMonth: number, n = 8, noise = 0): Point[] {
  return Array.from({ length: n }, (_, i) => ({
    t: i * 15, // cada 15 días
    x: base + (slopePerMonth / 30) * (i * 15) + (noise ? (Math.sin(i) * noise) : 0),
  }))
}

const evolution = analyzePatient({
  glucosa: series(150, 12, 10, 6),
  imc: series(31, 0.4),
  pas: series(140, 4),
  pad: series(88, 2),
  peso: series(88, 1.1),
  hba1c: [],
})

const snapshot = buildSnapshot({
  evolution,
  riesgo: 0.78,
  nivelRiesgo: "Muy Alto",
  factoresRiesgo: ["Glucosa elevada", "IMC elevado", "Hipertensión", "Sedentarismo"],
  comorbilidades: ["Hipertensión", "Obesidad"],
  medicacion: ["Metformina"],
  diasSinConsulta: 160,
})

const assessment = assessPatient(snapshot)

console.log("=== SNAPSHOT ===")
console.log({
  riesgo: snapshot.riesgo, ces: snapshot.ces, glucosa: snapshot.glucosa,
  glucosaSlope: snapshot.glucosaSlope, imc: snapshot.imc, pas: snapshot.pas,
  comorbilidades: snapshot.comorbilidades, diasSinConsulta: snapshot.diasSinConsulta,
})
console.log("\n=== PRIORIDAD ===")
console.log(assessment.priority)
console.log("\n=== ALERTAS ===")
for (const a of assessment.alerts) console.log(`  [${a.severity}] ${a.ruleId} ${a.name} -> ${a.action}`, a.evidence)
console.log("\n=== ¿POR QUÉ? ===")
for (const w of assessment.why) console.log("  •", w)
console.log("\n=== TOP-5 RECOMENDACIONES ===")
for (const r of assessment.recommendations) console.log(`  ${r.rank}. ${r.label} — ${r.reason}`)

// Aserciones mínimas de sanidad
const ok =
  ["Alta", "Crítica"].includes(assessment.priority.band) &&
  assessment.alerts.some((a) => a.severity === "critical") &&
  assessment.recommendations.length > 0 &&
  assessment.recommendations.every((r) => r.reason.length > 0)
console.log("\nSANITY:", ok ? "OK ✓" : "FALLO ✗")
process.exit(ok ? 0 : 1)
