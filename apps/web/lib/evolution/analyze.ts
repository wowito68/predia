// lib/evolution/analyze.ts
import {
  Point, linearRegression, acceleration, volatility, movingAverage, endpointSlope, DAYS_PER_MONTH,
} from "./timeseries"
import { VarConfig, VAR_BY_KEY, CV_MAX, VOL_PENALTY, MIN_SPAN_DAYS, cesBanda } from "./config"

const clip = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const r = (v: number, d = 2) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : 0)

export type Estado = "Mejorando" | "Empeorando" | "Estable" | "Sin datos suficientes"

export interface SeriesMetrics {
  key: string
  label: string
  unidad: string
  n: number
  actual: number | null
  promedio: number
  slopePerMonth: number
  endpointSlopePerMonth: number
  intercept: number
  r2: number
  accelPerMonth2: number
  sigma: number
  cv: number
  residualStd: number
  movingAvg3: number[]
  movingAvg5: number[]
  movingAvg10: number[]
  s: number // puntaje direccional [-1,1]
  stability: number // [0,1]
  estado: Estado
  /** true si la ventana de observación es suficiente para una tendencia fiable */
  reliableTrend: boolean
  spanDays: number
}

export function analyzeSeries(cfg: VarConfig, pts: Point[]): SeriesMetrics {
  const n = pts.length
  const base: SeriesMetrics = {
    key: cfg.key, label: cfg.label, unidad: cfg.unidad, n,
    actual: n ? pts[n - 1].x : null, promedio: 0, slopePerMonth: 0, endpointSlopePerMonth: 0,
    intercept: 0, r2: 0, accelPerMonth2: 0, sigma: 0, cv: 0, residualStd: 0,
    movingAvg3: [], movingAvg5: [], movingAvg10: [], s: 0, stability: 0,
    estado: "Sin datos suficientes", reliableTrend: false, spanDays: 0,
  }
  if (n < 2) return base

  const span = pts[n - 1].t - pts[0].t
  const reliable = span >= MIN_SPAN_DAYS
  const { slope, intercept, r2 } = linearRegression(pts)
  const { sigma, cv, residualStd, mean } = volatility(pts)
  const xs = pts.map((p) => p.x)
  const slopePerMonth = reliable ? slope * DAYS_PER_MONTH : 0
  const accel = reliable ? acceleration(pts) * DAYS_PER_MONTH * DAYS_PER_MONTH : 0
  const s = reliable ? clip((cfg.lowerIsBetter ? -slopePerMonth : slopePerMonth) / cfg.kappa, -1, 1) : 0
  const stability = clip(1 - cv / CV_MAX, 0, 1)
  const estado: Estado = !reliable
    ? "Sin datos suficientes"
    : Math.abs(s) < 0.2 ? "Estable" : s > 0 ? "Mejorando" : "Empeorando"

  return {
    ...base,
    promedio: r(mean), slopePerMonth: r(slopePerMonth),
    endpointSlopePerMonth: reliable ? r(endpointSlope(pts) * DAYS_PER_MONTH) : 0,
    intercept: r(intercept), r2: r(r2, 3), accelPerMonth2: r(accel, 3),
    sigma: r(sigma), cv: r(cv, 4), residualStd: r(residualStd),
    movingAvg3: movingAverage(xs, 3), movingAvg5: movingAverage(xs, 5), movingAvg10: movingAverage(xs, 10),
    s: r(s, 3), stability: r(stability, 3), estado, reliableTrend: reliable, spanDays: r(span, 1),
  }
}

export interface CESComponent {
  variable: string
  s: number
  pesoEfectivo: number
  estado: Estado
  detalle: string
}
export interface CESResult {
  ces: number
  T: number
  S: number
  banda: string
  components: CESComponent[]
}

/** Clinical Evolution Score a partir de las métricas por variable. */
export function computeCES(metrics: SeriesMetrics[]): CESResult | null {
  const contributing = metrics.filter((m) => (VAR_BY_KEY[m.key]?.omega ?? 0) > 0 && m.reliableTrend)
  if (contributing.length === 0) return null
  const sumOmega = contributing.reduce((acc, m) => acc + VAR_BY_KEY[m.key].omega, 0)
  const weightedS = contributing.reduce((acc, m) => acc + VAR_BY_KEY[m.key].omega * m.s, 0) / sumOmega // T_dir ∈ [-1,1]
  const T = 0.5 + 0.5 * weightedS // composite de tendencia 0..1 (para mostrar)
  const S = contributing.reduce((acc, m) => acc + m.stability, 0) / contributing.length
  // CES anclado en 50 (estable); la volatilidad (1−S) penaliza la tendencia.
  const W = Math.max(-1, Math.min(1, weightedS - VOL_PENALTY * (1 - S)))
  const ces = Math.round(50 * (1 + W))

  const components: CESComponent[] = contributing.map((m) => {
    const pesoEfectivo = VAR_BY_KEY[m.key].omega / sumOmega
    const dir = m.estado === "Mejorando" ? "mejorando" : m.estado === "Empeorando" ? "empeorando" : "estable"
    const signo = m.slopePerMonth > 0 ? "+" : ""
    return {
      variable: m.label, s: m.s, pesoEfectivo: r(pesoEfectivo, 2), estado: m.estado,
      detalle: `${m.label} ${dir} (${signo}${m.slopePerMonth} ${m.unidad}/mes, peso ${Math.round(pesoEfectivo * 100)}%)`,
    }
  })

  return { ces, T: r(T, 3), S: r(S, 3), banda: cesBanda(ces), components }
}
