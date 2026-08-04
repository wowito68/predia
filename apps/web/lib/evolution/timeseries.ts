// lib/evolution/timeseries.ts
// Primitivas matemáticas para series de tiempo clínicas irregulares.
// El eje t está en DÍAS desde la primera medición; las pendientes se reportan /mes (×30).
export const DAYS_PER_MONTH = 30

export interface Point {
  t: number // días desde el primer punto
  x: number // valor
}

const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)

/** Regresión lineal por mínimos cuadrados: pendiente (/día), intercepto y R². */
export function linearRegression(pts: Point[]): { slope: number; intercept: number; r2: number } {
  const n = pts.length
  if (n < 2) return { slope: 0, intercept: n ? pts[0].x : 0, r2: 0 }
  const tbar = mean(pts.map((p) => p.t))
  const xbar = mean(pts.map((p) => p.x))
  let sxx = 0, sxy = 0
  for (const p of pts) {
    sxx += (p.t - tbar) ** 2
    sxy += (p.t - tbar) * (p.x - xbar)
  }
  const slope = sxx === 0 ? 0 : sxy / sxx
  const intercept = xbar - slope * tbar
  let ssRes = 0, ssTot = 0
  for (const p of pts) {
    const yh = intercept + slope * p.t
    ssRes += (p.x - yh) ** 2
    ssTot += (p.x - xbar) ** 2
  }
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot)
  return { slope, intercept, r2 }
}

/** Resuelve un sistema 3×3 por Cramer; devuelve la primera incógnita (a) o null. */
function solveQuadraticA(pts: Point[]): number | null {
  let S0 = pts.length, S1 = 0, S2 = 0, S3 = 0, S4 = 0, Sx = 0, Stx = 0, St2x = 0
  for (const { t, x } of pts) {
    S1 += t; S2 += t * t; S3 += t * t * t; S4 += t * t * t * t
    Sx += x; Stx += t * x; St2x += t * t * x
  }
  // [[S4,S3,S2],[S3,S2,S1],[S2,S1,S0]] · [a,b,c]ᵀ = [St2x,Stx,Sx]ᵀ
  const det = S4 * (S2 * S0 - S1 * S1) - S3 * (S3 * S0 - S1 * S2) + S2 * (S3 * S1 - S2 * S2)
  if (Math.abs(det) < 1e-12) return null
  const detA = St2x * (S2 * S0 - S1 * S1) - S3 * (Stx * S0 - S1 * Sx) + S2 * (Stx * S1 - S2 * Sx)
  return detA / det
}

/** Aceleración d²x/dt² = 2a del ajuste cuadrático (/día²). Requiere n≥3. */
export function acceleration(pts: Point[]): number {
  if (pts.length < 3) return 0
  const a = solveQuadraticA(pts)
  return a === null ? 0 : 2 * a
}

/** Volatilidad: σ muestral, CV y σ de residuos respecto a la tendencia. */
export function volatility(pts: Point[]): { sigma: number; cv: number; residualStd: number; mean: number } {
  const xs = pts.map((p) => p.x)
  const n = xs.length
  const m = mean(xs)
  const sigma = n < 2 ? 0 : Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1))
  const cv = m !== 0 ? sigma / Math.abs(m) : 0
  let residualStd = 0
  if (n >= 3) {
    const { slope, intercept } = linearRegression(pts)
    const ss = pts.reduce((s, p) => s + (p.x - (intercept + slope * p.t)) ** 2, 0)
    residualStd = Math.sqrt(ss / (n - 2))
  }
  return { sigma, cv, residualStd, mean: m }
}

/** Media móvil de ventana k (devuelve la serie suavizada). */
export function movingAverage(xs: number[], k: number): number[] {
  if (k <= 1 || xs.length < k) return []
  const out: number[] = []
  for (let i = k - 1; i < xs.length; i++) {
    let s = 0
    for (let j = i - k + 1; j <= i; j++) s += xs[j]
    out.push(Math.round((s / k) * 100) / 100)
  }
  return out
}

/** Pendiente por extremos (referencia simple): (x_n − x_1)/(t_n − t_1). */
export function endpointSlope(pts: Point[]): number {
  if (pts.length < 2) return 0
  const a = pts[0], b = pts[pts.length - 1]
  return b.t === a.t ? 0 : (b.x - a.x) / (b.t - a.t)
}
