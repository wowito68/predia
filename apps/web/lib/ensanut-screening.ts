import bundle from "./ensanut-screening-model.json"

export interface EnsanutScreeningInput {
  age: number
  female: 0 | 1
  parent_diabetes: 0 | 1 | null
  diagnosed_hypertension: 0 | 1 | null
  bmi: number
  waist_cm: number
}

export interface EnsanutScreeningResult {
  modelVersion: string
  studyFingerprint: string
  outcome: string
  screeningIndex: number
  rawModelProbability: number
  threshold: number
  screenPositive: boolean
  classification: "PRIORIZAR_CONFIRMACION" | "NO_PRIORIZADO"
  recommendation: string
  factors: string[]
  evidence: {
    testWave: number
    rocAuc: number
    rocAucCi95: [number, number]
    sensitivity: number
    specificity: number
  }
  warning: string
}

type SplineSpec = (typeof bundle.continuous.splines)[number]

function clamp(value: number, lower: number, upper: number): number {
  return Math.min(upper, Math.max(lower, value))
}

/** Cox-de Boor basis evaluation matching scipy BSpline for this locked bundle. */
function bsplineBasis(value: number, spec: SplineSpec): number[] {
  const { knots, degree, basisCount, lowerBound, upperBound } = spec
  const x = clamp(value, lowerBound, upperBound)
  let basis: number[] = Array.from({ length: knots.length - 1 }, (_, index) => {
    const inside = knots[index] <= x && x < knots[index + 1]
    const atUpperBoundary = x === upperBound && index === basisCount
    return inside || atUpperBoundary ? 1 : 0
  })

  for (let order = 1; order <= degree; order += 1) {
    basis = Array.from({ length: knots.length - order - 1 }, (_, index) => {
      const leftDenominator = knots[index + order] - knots[index]
      const rightDenominator = knots[index + order + 1] - knots[index + 1]
      const left = leftDenominator === 0 ? 0 : ((x - knots[index]) / leftDenominator) * basis[index]
      const right = rightDenominator === 0 ? 0 : ((knots[index + order + 1] - x) / rightDenominator) * basis[index + 1]
      return left + right
    })
  }

  return basis.slice(0, basisCount)
}

function standardize(values: number[], mean: number[], scale: number[]): number[] {
  return values.map((value, index) => (value - mean[index]) / scale[index])
}

function transform(input: EnsanutScreeningInput): number[] {
  const continuousValues = bundle.continuous.features.map((feature, index) => {
    const raw = input[feature as keyof EnsanutScreeningInput]
    const value = typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : bundle.continuous.imputerStatistics[index]
    // sklearn's SplineTransformer drops the final basis when include_bias=false.
    return bsplineBasis(value, bundle.continuous.splines[index]).slice(0, -1)
  }).flat()

  const continuous = standardize(
    continuousValues,
    bundle.continuous.scalerMean,
    bundle.continuous.scalerScale,
  )

  const binaryMissing = bundle.binary.features.map((feature) => input[feature as keyof EnsanutScreeningInput] == null)
  const binaryValues = bundle.binary.features.map((feature, index) => {
    const raw = input[feature as keyof EnsanutScreeningInput]
    return typeof raw === "number" ? raw : bundle.binary.imputerStatistics[index]
  })
  const indicators = bundle.binary.indicatorFeatures.map((feature) => {
    const index = bundle.binary.features.indexOf(feature)
    return binaryMissing[index] ? 1 : 0
  })
  const binary = standardize(
    [...binaryValues, ...indicators],
    bundle.binary.scalerMean,
    bundle.binary.scalerScale,
  )

  return [...continuous, ...binary]
}

function clinicalFactors(input: EnsanutScreeningInput): string[] {
  const factors: string[] = []
  if (input.age >= 45) factors.push("Edad de 45 años o más")
  if (input.parent_diabetes === 1) factors.push("Diabetes en padre o madre")
  if (input.diagnosed_hypertension === 1) factors.push("Hipertensión previamente diagnosticada")
  if (input.bmi >= 30) factors.push("Obesidad por índice de masa corporal")
  else if (input.bmi >= 25) factors.push("Sobrepeso por índice de masa corporal")
  const abdominalThreshold = input.female === 1 ? 88 : 102
  if (input.waist_cm >= abdominalThreshold) factors.push("Circunferencia de cintura elevada")
  if (input.parent_diabetes == null || input.diagnosed_hypertension == null) {
    factors.push("Uno o más antecedentes se registraron como desconocidos")
  }
  return factors
}

export function scoreEnsanutScreening(input: EnsanutScreeningInput): EnsanutScreeningResult {
  const values = transform(input)
  const linearPredictor = bundle.classifier.coefficients.reduce(
    (total, coefficient, index) => total + coefficient * values[index],
    bundle.classifier.intercept,
  )
  const probability = 1 / (1 + Math.exp(-linearPredictor))
  const screenPositive = probability >= bundle.threshold

  return {
    modelVersion: bundle.modelVersion,
    studyFingerprint: bundle.studyFingerprint,
    outcome: bundle.outcome.definition,
    screeningIndex: Math.round(probability * 100),
    rawModelProbability: probability,
    threshold: bundle.threshold,
    screenPositive,
    classification: screenPositive ? "PRIORIZAR_CONFIRMACION" : "NO_PRIORIZADO",
    recommendation: screenPositive
      ? "Priorizar glucosa plasmática en ayuno y/o HbA1c para confirmación bioquímica, según criterio clínico."
      : "Mantener el tamizaje indicado por edad, síntomas, embarazo, comorbilidades y criterio clínico; un resultado negativo no descarta disglucemia.",
    factors: clinicalFactors(input),
    evidence: {
      testWave: bundle.externalTest.wave,
      rocAuc: bundle.externalTest.rocAuc,
      rocAucCi95: bundle.externalTest.rocAucCi95 as [number, number],
      sensitivity: bundle.externalTest.sensitivity,
      specificity: bundle.externalTest.specificity,
    },
    warning: bundle.clinicalUse.warning,
  }
}

export const ensanutScreeningMetadata = {
  modelVersion: bundle.modelVersion,
  studyFingerprint: bundle.studyFingerprint,
  threshold: bundle.threshold,
  intendedUse: bundle.clinicalUse.intendedUse,
  warning: bundle.clinicalUse.warning,
} as const
