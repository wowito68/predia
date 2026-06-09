// components/risk/RiskDistributionWidget.tsx — Fase 10: widgets de riesgo del dashboard
import { TrendingUp, TrendingDown, Minus, Users } from "lucide-react"
import { RISK_BANDS } from "@/lib/risk"

interface Props {
  distribucion?: Record<string, number>
  tendencia?: { aumentaron: number; disminuyeron: number; estables: number }
}

export function RiskDistributionWidget({ distribucion, tendencia }: Props) {
  const dist = distribucion ?? { Bajo: 0, Moderado: 0, Alto: 0, "Muy Alto": 0 }
  const total = Object.values(dist).reduce((a, b) => a + b, 0)

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Distribución por nivel */}
      <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Pacientes por nivel de riesgo</h3>
          <span className="ml-auto text-xs text-muted-foreground">{total} evaluados</span>
        </div>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay evaluaciones de riesgo registradas.</p>
        ) : (
          <div className="space-y-3">
            {RISK_BANDS.map((band) => {
              const n = dist[band.nivel] ?? 0
              const pct = total ? Math.round((n / total) * 100) : 0
              return (
                <div key={band.nivel}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className={`font-medium ${band.color.accent}`}>{band.titulo}</span>
                    <span className="text-muted-foreground tabular-nums">{n} · {pct}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: band.color.gauge }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tendencia del cohorte */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Evolución del riesgo</h3>
        <div className="space-y-3">
          <TrendRow
            icon={<TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />}
            label="Aumentaron riesgo" value={tendencia?.aumentaron ?? 0}
            className="text-red-700 dark:text-red-400"
          />
          <TrendRow
            icon={<TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            label="Disminuyeron riesgo" value={tendencia?.disminuyeron ?? 0}
            className="text-emerald-700 dark:text-emerald-400"
          />
          <TrendRow
            icon={<Minus className="h-4 w-4 text-muted-foreground" />}
            label="Estables" value={tendencia?.estables ?? 0}
            className="text-muted-foreground"
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Comparando las dos últimas evaluaciones de cada paciente.</p>
      </div>
    </div>
  )
}

function TrendRow({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: number; className: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
      <span className="flex items-center gap-2 text-sm text-foreground">{icon}{label}</span>
      <span className={`text-lg font-bold tabular-nums ${className}`}>{value}</span>
    </div>
  )
}
