"use client"
// components/evolution/ClinicalEvolution.tsx — Fase 5/6: Evolución Clínica
import { useEffect, useState } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { Loader2, TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, Info } from "lucide-react"

interface SeriesMetrics {
  key: string; label: string; unidad: string; n: number
  actual: number | null; promedio: number; slopePerMonth: number; intercept: number
  r2: number; accelPerMonth2: number; sigma: number; cv: number; estado: string; reliableTrend: boolean
}
interface CESComponent { variable: string; detalle: string }
interface CES { ces: number; T: number; S: number; banda: string; components: CESComponent[] }
interface EvEvent { tipo: string; severidad: "info" | "warning" | "critical"; mensaje: string }
export interface EvolutionData {
  variables: SeriesMetrics[]
  ces: CES | null
  eventos: EvEvent[]
  series: Record<string, { fecha: string; valor: number }[]>
}

const fmtFecha = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" })

function estadoStyle(estado: string) {
  if (estado === "Mejorando") return { cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300", icon: <TrendingDown className="h-3.5 w-3.5" /> }
  if (estado === "Empeorando") return { cls: "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300", icon: <TrendingUp className="h-3.5 w-3.5" /> }
  if (estado === "Estable") return { cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: <Minus className="h-3.5 w-3.5" /> }
  return { cls: "bg-muted text-muted-foreground", icon: <Minus className="h-3.5 w-3.5" /> }
}

function cesColor(ces: number) {
  if (ces >= 70) return "#059669"
  if (ces >= 55) return "#16a34a"
  if (ces >= 45) return "#64748b"
  if (ces >= 30) return "#ea580c"
  return "#991b1b"
}

export function ClinicalEvolution({ id, data: dataProp }: { id: string; data?: EvolutionData }) {
  const [data, setData] = useState<EvolutionData | null>(dataProp ?? null)
  const [loading, setLoading] = useState(!dataProp)
  const [error, setError] = useState("")

  useEffect(() => {
    if (dataProp) { setData(dataProp); setLoading(false); return }
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) { setError("No autenticado"); setLoading(false); return }
    fetch(`/api/pacientes/${id}/evolucion`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); else setError(j.error || "Error") })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [id, dataProp])

  if (loading) return <div className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Calculando evolución clínica…</div>
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{error}</div>
  if (!data) return null

  const withData = data.variables.filter((v) => v.n >= 1)
  const ces = data.ces

  return (
    <div className="space-y-6">
      {/* CES explicable */}
      {ces && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-4" style={{ borderColor: cesColor(ces.ces) }}>
              <span className="text-2xl font-bold" style={{ color: cesColor(ces.ces) }}>{ces.ces}</span>
              <span className="text-[10px] text-muted-foreground">/100</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Clinical Evolution Score: {ces.banda}</h3>
              <p className="text-sm text-muted-foreground">Tendencia T={ces.T} · Estabilidad S={ces.S} (50 = sin cambio; &gt;50 favorable)</p>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-background/60 p-3">
            <p className="mb-1 text-sm font-semibold text-foreground">¿Por qué este score?</p>
            <ul className="space-y-1">
              {ces.components.map((c, i) => <li key={i} className="text-sm text-muted-foreground">• {c.detalle}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Eventos / alertas */}
      {data.eventos.length > 0 && (
        <div className="space-y-2">
          {data.eventos.map((e, i) => {
            const c = e.severidad === "critical" ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
              : e.severidad === "warning" ? "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300"
              : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
            const Icon = e.severidad === "info" ? Info : AlertTriangle
            return <div key={i} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${c}`}><Icon className="h-4 w-4 shrink-0" />{e.mensaje}</div>
          })}
        </div>
      )}

      {/* Variables */}
      {withData.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
          <Activity className="mx-auto mb-2 h-8 w-8 opacity-40" />
          No hay suficientes mediciones temporales para analizar la evolución.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {withData.map((v) => {
            const raw = data.series[v.key] ?? []
            const t0 = raw.length ? new Date(raw[0].fecha).getTime() : 0
            const chart = raw.map((p) => {
              const tDays = (new Date(p.fecha).getTime() - t0) / 86400000
              return { fecha: fmtFecha(p.fecha), valor: p.valor, tendencia: Math.round((v.intercept + (v.slopePerMonth / 30) * tDays) * 100) / 100 }
            })
            const st = estadoStyle(v.estado)
            const signo = v.slopePerMonth > 0 ? "+" : ""
            return (
              <div key={v.key} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">{v.label}</h4>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.icon}{v.estado}</span>
                </div>
                <div className="mb-3 grid grid-cols-3 gap-2 text-sm">
                  <Metric label="Actual" value={v.actual != null ? `${v.actual} ${v.unidad}` : "—"} />
                  <Metric label="Promedio" value={`${v.promedio} ${v.unidad}`} />
                  <Metric label="Pendiente" value={v.reliableTrend ? `${signo}${v.slopePerMonth} ${v.unidad}/mes` : "—"} />
                </div>
                {v.n >= 2 ? (
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chart} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                        <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" domain={["auto", "auto"]} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Line type="monotone" dataKey="valor" stroke="#1565C0" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} name={v.label} />
                        <Line type="monotone" dataKey="tendencia" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} name="Tendencia" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-6 text-center text-xs text-muted-foreground">Una sola medición; se requiere ≥2 para tendencia.</p>
                )}
                {v.n >= 2 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Volatilidad σ={v.sigma} (CV={v.cv}) · R²={v.r2} · Aceleración={v.accelPerMonth2} {v.unidad}/mes²
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/60 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  )
}
