// lib/risk/stratify.ts
// Capa de estratificación: transforma una probabilidad [0,1] en banda de riesgo.
import { RISK_BANDS, RiskBand } from "./thresholds"

export function stratifyRisk(score: number): RiskBand {
  const s = Math.max(0, Math.min(1, Number.isFinite(score) ? score : 0))
  return RISK_BANDS.find((b) => s >= b.min && s < b.max) ?? RISK_BANDS[RISK_BANDS.length - 1]
}
