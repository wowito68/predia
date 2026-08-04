// components/risk/RiskCard.tsx
import { ArrowUp, ArrowDown, Stethoscope, ShieldCheck, Info } from "lucide-react"
import { RISK_BANDS, stratifyRisk, type RiskLevel } from "@/lib/risk"
import { RiskGauge } from "./RiskGauge"
import { RiskBadge } from "./RiskBadge"

interface FactorItem { factor: string; intensidad?: number }
interface Props {
  score: number
  nivel?: RiskLevel
  contribuyen?: FactorItem[]
  protegen?: FactorItem[]
  recomendaciones?: { seguimiento: string; acciones: string[] }
  fecha?: string
}

export function RiskCard({ score, nivel, contribuyen = [], protegen = [], recomendaciones, fecha }: Props) {
  const band = nivel ? RISK_BANDS.find((b) => b.nivel === nivel) ?? stratifyRisk(score) : stratifyRisk(score)

  return (
    <div className={`rounded-xl border p-5 ${band.color.card}`}>
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3">
        <RiskBadge nivel={band.nivel} />
        {fecha && <span className="text-xs text-muted-foreground">{new Date(fecha).toLocaleString()}</span>}
      </div>

      {/* Medidor + descripción */}
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <RiskGauge score={score} size={190} />
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${band.color.accent}`}>{band.titulo}</h3>
          <p className="mt-1 text-sm text-foreground/80">{band.descripcion}</p>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-background/60 p-3">
            <Stethoscope className={`mt-0.5 h-4 w-4 shrink-0 ${band.color.accent}`} />
            <p className="text-sm font-medium text-foreground">{band.accionClinica}</p>
          </div>
        </div>
      </div>

      {/* Explicabilidad clínica */}
      {(contribuyen.length > 0 || protegen.length > 0) && (
        <div className="mt-5">
          <h4 className="mb-2 text-sm font-semibold text-foreground">¿Por qué obtuvo este resultado?</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-900 dark:bg-orange-950/20">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-orange-700 dark:text-orange-400">
                <ArrowUp className="h-3.5 w-3.5" /> Contribuyen al riesgo
              </p>
              <ul className="space-y-1">
                {contribuyen.length === 0 && <li className="text-xs text-muted-foreground">—</li>}
                {contribuyen.map((f, i) => (
                  <li key={i} className="text-sm text-foreground">{f.factor}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <ArrowDown className="h-3.5 w-3.5" /> Protegen contra el riesgo
              </p>
              <ul className="space-y-1">
                {protegen.length === 0 && <li className="text-xs text-muted-foreground">—</li>}
                {protegen.map((f, i) => (
                  <li key={i} className="text-sm text-foreground">{f.factor}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Recomendaciones */}
      {recomendaciones && (
        <div className="mt-5 rounded-lg border border-border bg-background/60 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ShieldCheck className={`h-4 w-4 ${band.color.accent}`} /> Recomendaciones clínicas
          </p>
          <p className="text-sm font-medium text-foreground/90">{recomendaciones.seguimiento}</p>
          <ul className="mt-1 space-y-1">
            {recomendaciones.acciones.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/80">
                <span className={band.color.accent}>•</span>{a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Aviso */}
      <p className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Herramienta de apoyo a la decisión clínica basada en cribado. No constituye un diagnóstico;
        debe interpretarse junto con el juicio médico.
      </p>
    </div>
  )
}
