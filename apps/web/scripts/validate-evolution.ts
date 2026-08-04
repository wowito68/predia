// Fase 8 — Validación del motor de evolución con pacientes sintéticos.
// Ejecutar: pnpm --filter @predia/web exec tsx scripts/validate-evolution.ts
import { analyzePatient, analyzeSeries, VAR_BY_KEY, type Point } from "../lib/evolution"

let pass = 0, fail = 0
const check = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log("  ✅", name) }
  else { fail++; console.log("  ❌", name, "→", detail) }
}
const approx = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol

// Serie sintética: x_i = x0 + (perMonth/30)·t_i + ruido_i ; t en días.
function series(x0: number, perMonth: number, n = 11, step = 15, noise: number[] = []): Point[] {
  const pts: Point[] = []
  for (let i = 0; i < n; i++) pts.push({ t: i * step, x: x0 + (perMonth / 30) * (i * step) + (noise[i] ?? 0) })
  return pts
}

console.log("== Escenario 1: DETERIORO progresivo ==")
{
  const ev = analyzePatient({ glucosa: series(100, 12), imc: series(28, 0.4), pas: series(120, 3), pad: series(78, 2) })
  const g = ev.variables.find((v) => v.key === "glucosa")!
  check("glucosa pendiente ≈ +12 mg/dL/mes", approx(g.slopePerMonth, 12, 0.6), `${g.slopePerMonth}`)
  check("glucosa estado = Empeorando", g.estado === "Empeorando", g.estado)
  check("alerta glucosa_aumentando activa", ev.eventos.some((e) => e.tipo === "glucosa_aumentando"))
  check("CES < 45 (deterioro)", (ev.ces?.ces ?? 99) < 45, `CES=${ev.ces?.ces}`)
}

console.log("== Escenario 2: MEJORÍA progresiva ==")
{
  const ev = analyzePatient({ glucosa: series(160, -12), imc: series(31, -0.4), pas: series(140, -3), pad: series(92, -2) })
  const g = ev.variables.find((v) => v.key === "glucosa")!
  check("glucosa pendiente ≈ -12 mg/dL/mes", approx(g.slopePerMonth, -12, 0.6), `${g.slopePerMonth}`)
  check("glucosa estado = Mejorando", g.estado === "Mejorando", g.estado)
  check("CES > 56 (mejoría)", (ev.ces?.ces ?? 0) > 56, `CES=${ev.ces?.ces}`)
  check("alerta mejora_significativa activa", ev.eventos.some((e) => e.tipo === "mejora_significativa"))
}

console.log("== Escenario 3: ESTABLE ==")
{
  const noise = [0.5, -0.5, 0.3, -0.4, 0.2, -0.3, 0.4, -0.2, 0.5, -0.4, 0.1]
  const ev = analyzePatient({
    glucosa: series(110, 0, 11, 15, noise), imc: series(27, 0, 11, 15, noise.map((x) => x * 0.02)),
    pas: series(118, 0, 11, 15, noise), pad: series(76, 0, 11, 15, noise),
  })
  const g = ev.variables.find((v) => v.key === "glucosa")!
  check("glucosa |pendiente| < 1", Math.abs(g.slopePerMonth) < 1, `${g.slopePerMonth}`)
  check("glucosa estado = Estable", g.estado === "Estable", g.estado)
  check("CES en [45,55] (estable)", ev.ces!.ces >= 45 && ev.ces!.ces <= 55, `CES=${ev.ces?.ces}`)
  check("alerta estable activa", ev.eventos.some((e) => e.tipo === "estable"))
}

console.log("== Escenario 4: ERRÁTICO ==")
{
  const noise = [20, -25, 18, -22, 15, -30, 28, -15, 22, -20, 17]
  const g = analyzeSeries(VAR_BY_KEY["glucosa"], series(120, 0, 11, 15, noise))
  check("σ alta (>15)", g.sigma > 15, `σ=${g.sigma}`)
  check("estabilidad baja (<0.3)", g.stability < 0.3, `stab=${g.stability}`)
  check("|pendiente| pequeña (<3)", Math.abs(g.slopePerMonth) < 3, `slope=${g.slopePerMonth}`)
}

console.log("== Escenario 5: ACELERACIÓN (incremento acelerado) ==")
{
  // x = 100 + 0.002·t²  → a=0.002/día², 2a·30² = 3.6/mes²
  const pts: Point[] = []
  for (let i = 0; i < 11; i++) { const t = i * 15; pts.push({ t, x: 100 + 0.002 * t * t }) }
  const g = analyzeSeries(VAR_BY_KEY["glucosa"], pts)
  check("aceleración > 0", g.accelPerMonth2 > 0, `${g.accelPerMonth2}`)
  check("aceleración ≈ 3.6/mes²", approx(g.accelPerMonth2, 3.6, 0.5), `${g.accelPerMonth2}`)
}

console.log(`\n== RESUMEN: ${pass} PASS, ${fail} FAIL ==`)
process.exit(fail > 0 ? 1 : 0)
