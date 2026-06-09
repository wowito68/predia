"use client"
// components/cdss/AsistenteClinico.tsx — FASE 3: panel "Asistente Clínico" (CDSS).
// Muestra prioridad, alertas, "¿por qué?" y Top-5 recomendaciones. Sin cajas negras:
// cada recomendación y alerta lleva su justificación auditable.
import { useEffect, useState } from "react"
import {
  Loader2, Stethoscope, AlertTriangle, Info, ShieldAlert, ListChecks, HelpCircle,
} from "lucide-react"

interface FiredRule { ruleId: string; name: string; severity: "info" | "warning" | "critical"; message: string }
interface RankedAction { rank: number; label: string; reason: string }
interface Priority { score: number; band: "Baja" | "Media" | "Alta" | "Crítica"; topDriver: string; contributions: Record<string, number> }
interface Assessment {
  riesgo: { prob: number | null; nivel: string | null }
  evolucion: { ces: number | null; banda: string | null }
  priority: Priority
  alerts: FiredRule[]
  why: string[]
  recommendations: RankedAction[]
}

const BAND_STYLE: Record<string, string> = {
  "Crítica": "bg-red-100 text-red-900 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900",
  "Alta": "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-900",
  "Media": "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
  "Baja": "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
}
const SEV_STYLE = {
  critical: { cls: "text-red-700 dark:text-red-300", icon: <ShieldAlert className="h-4 w-4 shrink-0" /> },
  warning: { cls: "text-orange-700 dark:text-orange-300", icon: <AlertTriangle className="h-4 w-4 shrink-0" /> },
  info: { cls: "text-sky-700 dark:text-sky-300", icon: <Info className="h-4 w-4 shrink-0" /> },
}
const DRIVER_LABEL: Record<string, string> = {
  riesgo: "Riesgo actual", evolucion: "Evolución (CES)", eventos: "Eventos recientes",
  comorbilidades: "Comorbilidades",
}

export function AsistenteClinico({ id }: { id: string }) {
  const [data, setData] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null
    fetch(`/api/pacientes/${id}/asistente`, { headers: t ? { Authorization: `Bearer ${t}` } : {} })
      .then((r) => r.json())
      .then((res) => {
        if (res?.success) setData(res.data)
        else setError(res?.error || "No se pudo generar el asistente")
      })
      .catch(() => setError("Error de conexión con el asistente"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-card p-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />Generando asistente clínico…
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        {error || "Sin datos suficientes para el asistente clínico."}
      </div>
    )
  }

  const { priority, alerts, why, recommendations, riesgo, evolucion } = data
  const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`)

  return (
    <section className="rounded-xl border bg-card shadow-sm" aria-labelledby="asistente-titulo">
      {/* Cabecera */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          <h2 id="asistente-titulo" className="text-lg font-semibold text-foreground">Asistente Clínico</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
            Riesgo: <strong className="text-foreground">{pct(riesgo.prob)}</strong>
            {riesgo.nivel ? ` · ${riesgo.nivel}` : ""}
          </span>
          <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
            Evolución: <strong className="text-foreground">{evolucion.ces ?? "—"}</strong>
            {evolucion.banda ? ` · ${evolucion.banda}` : ""}
          </span>
          <span className={`rounded-md border px-3 py-1 font-semibold ${BAND_STYLE[priority.band]}`}>
            Prioridad {priority.band} · {Math.round(priority.score)}/100
          </span>
        </div>
      </header>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        {/* Alertas */}
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4" />Alertas
          </h3>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin alertas activas.</p>
          ) : (
            <ul className="space-y-1.5">
              {alerts.map((a) => (
                <li key={a.ruleId} className={`flex items-start gap-2 text-sm ${SEV_STYLE[a.severity].cls}`}>
                  {SEV_STYLE[a.severity].icon}
                  <span><span className="font-medium">{a.name}.</span> {a.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recomendaciones */}
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ListChecks className="h-4 w-4" />Recomendaciones sugeridas
          </h3>
          <ol className="space-y-1.5">
            {recommendations.map((r) => (
              <li key={r.rank} className="text-sm">
                <span className="font-medium text-foreground">{r.rank}. {r.label}</span>
                <span className="block text-xs text-muted-foreground">{r.reason}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ¿Por qué? */}
      {why.length > 0 && (
        <div className="border-t p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <HelpCircle className="h-4 w-4" />¿Por qué? (explicación auditable)
          </h3>
          <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            {why.map((b, i) => (
              <li key={i} className="flex items-start gap-1.5"><span aria-hidden>•</span><span>{b}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Driver principal de la prioridad: <strong>{DRIVER_LABEL[priority.topDriver] ?? priority.topDriver}</strong>.
            Soporte a la decisión, no diagnóstico; la decisión clínica corresponde al médico.
          </p>
        </div>
      )}
    </section>
  )
}
