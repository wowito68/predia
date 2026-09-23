import bundle from "@/lib/ensanut-screening-model.json"
import { scoreEnsanutScreening, type EnsanutScreeningInput } from "@/lib/ensanut-screening"


describe("locked ENSANUT screening scorer", () => {
  it.each(bundle.goldenVectors)("matches sklearn for %#", ({ input, probability }) => {
    const result = scoreEnsanutScreening(input as EnsanutScreeningInput)
    expect(result.rawModelProbability).toBeCloseTo(probability, 11)
    expect(result.screenPositive).toBe(probability >= bundle.threshold)
  })

  it("does not present the output as a diagnosis", () => {
    const result = scoreEnsanutScreening({
      age: 58,
      female: 1,
      parent_diabetes: 1,
      diagnosed_hypertension: 1,
      bmi: 34,
      waist_cm: 108,
    })

    expect(result.classification).toBe("PRIORIZAR_CONFIRMACION")
    expect(result.recommendation).toMatch(/confirmaci.n bioqu.mica/i)
    expect(result.warning).toMatch(/No diagnostica diabetes/i)
    expect(result.studyFingerprint).toHaveLength(64)
  })

  it("reports unknown antecedents without changing the locked imputation", () => {
    const result = scoreEnsanutScreening({
      age: 84,
      female: 0,
      parent_diabetes: null,
      diagnosed_hypertension: null,
      bmi: 27.5,
      waist_cm: 96,
    })

    expect(result.factors).toContain("Uno o más antecedentes se registraron como desconocidos")
    expect(Number.isFinite(result.rawModelProbability)).toBe(true)
  })
})
