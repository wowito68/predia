"use client"
// components/risk/RiskTimeline.tsx — Fase 5: "Evolución del Riesgo"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Dot,
} from "recharts"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { RISK_THRESHOLDS, stratifyRisk, type RiskLevel } from "@/lib/risk"
import { RiskBadge } from "./RiskBadge"

export interface TimelinePoint {
  fecha: string
  score: number
  nivel: RiskLevel
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" })

export function RiskTimeline({ points }: { points: TimelinePoint[] }) {
  if (!points.length) return null

  const data = points.map((p) => ({
    fecha: fmt(p.fecha),
    score: Math.round(p.score * 1000) / 10, // %
    color: stratifyRisk(p.score).color.gauge,
  }))

  // Evolución (más reciente primero) con delta respecto a la evaluación previa.
  const rev = [...points].reverse()
  const trend = rev.map((p, i) => {
    const prev = rev[i + 1]
    const delta = prev ? p.score - prev.score : 0
    return { ...p, delta, hasPrev: !!prev }
  })

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-1 text-lg font-bold text-foreground">Evolución del Riesgo</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Historial del score de riesgo a lo largo del tiempo. Las líneas marcan los umbrales clínicos.
      </p>

      {points.length >= 2 ? (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip
                formatter={(v: number) => [`${v}%`, "Score"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <ReferenceLine y={RISK_THRESHOLDS.tBajo * 100} stroke="#D97706" strokeDasharray="4 4" />
              <ReferenceLine y={RISK_THRESHOLDS.tMid * 100} stroke="#EA580C" strokeDasharray="4 4" />
              <ReferenceLine y={RISK_THRESHOLDS.tAlto * 100} stroke="#991B1B" strokeDasharray="4 4" />
              <Line
                type="monotone" dataKey="score" stroke="#1565C0" strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props
                  return <Dot key={index} cx={cx} cy={cy} r={4} fill={payload.color} stroke="#fff" strokeWidth={1} />
                }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="rounded-lg bg-background/60 p-3 text-sm text-muted-foreground">
          Se necesita más de una evaluación para mostrar la tendencia.
        </p>
      )}

      {/* Tabla Fecha | Riesgo | Score | tendencia */}
      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Fecha</th>
              <th className="px-3 py-2 text-left font-semibold">Riesgo</th>
              <th className="px-3 py-2 text-right font-semibold">Score</th>
              <th className="px-3 py-2 text-center font-semibold">Tendencia</th>
            </tr>
          </thead>
          <tbody>
            {trend.map((p, i) => {
              const up = p.delta > 0.02, down = p.delta < -0.02
              return (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">{fmt(p.fecha)}</td>
                  <td className="px-3 py-2"><RiskBadge nivel={p.nivel} /></td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-foreground">{Math.round(p.score * 100)}%</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1 text-xs">
                      {!p.hasPrev ? <span className="text-muted-foreground">—</span>
                        : up ? <><TrendingUp className="h-3.5 w-3.5 text-red-600 dark:text-red-400" /><span className="text-red-600 dark:text-red-400">+{Math.round(p.delta * 100)}%</span></>
                        : down ? <><TrendingDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /><span className="text-emerald-600 dark:text-emerald-400">{Math.round(p.delta * 100)}%</span></>
                        : <><Minus className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">estable</span></>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
