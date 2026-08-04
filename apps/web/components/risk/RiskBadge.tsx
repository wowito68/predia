// components/risk/RiskBadge.tsx
import { RISK_BANDS, stratifyRisk, type RiskLevel } from "@/lib/risk"

interface Props {
  nivel?: RiskLevel
  score?: number
  className?: string
}

/** Etiqueta compacta del nivel de riesgo (paleta médica, claro/oscuro). */
export function RiskBadge({ nivel, score, className = "" }: Props) {
  const band = nivel
    ? RISK_BANDS.find((b) => b.nivel === nivel) ?? RISK_BANDS[0]
    : stratifyRisk(score ?? 0)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${band.color.badge} ${className}`}
    >
      <span className="opacity-70">Nivel {band.nivelNumero}</span>
      <span aria-hidden>·</span>
      {band.titulo}
    </span>
  )
}
