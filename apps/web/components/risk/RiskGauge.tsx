// components/risk/RiskGauge.tsx
import { stratifyRisk } from "@/lib/risk"

interface Props {
  /** probabilidad 0..1 */
  score: number
  size?: number
}

/** Medidor semicircular del score de riesgo. El color del arco sigue el nivel
 *  (via currentColor + clases Tailwind, compatible con modo oscuro). */
export function RiskGauge({ score, size = 200 }: Props) {
  const s = Math.max(0, Math.min(1, score))
  const band = stratifyRisk(s)
  const pct = Math.round(s * 100)
  const h = size * 0.62

  return (
    <div className={`relative ${band.color.accent}`} style={{ width: size, height: h }}>
      <svg viewBox="0 0 200 116" width={size} height={h} role="img" aria-label={`Riesgo ${pct}%`}>
        {/* pista */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          strokeWidth={16}
          strokeLinecap="round"
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        {/* valor */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="currentColor"
          strokeWidth={16}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${s} 1`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <span className="text-3xl font-bold tabular-nums">{pct}%</span>
        <span className="text-xs font-medium opacity-80">Nivel {band.nivelNumero}</span>
      </div>
    </div>
  )
}
