import { z } from "zod"

export const medicalRangesSchema = {
    age: z.number().int().min(0, "Edad debe ser positiva").max(120, "Edad máxima es 120 años"),

    bmi: z.number().min(10, "IMC mínimo es 10").max(100, "IMC máximo es 100"),

    hba1c: z.number().min(2, "HbA1c mínimo es 2%").max(20, "HbA1c máximo es 20%"),

    glucose: z.number().min(40, "Glucosa mínima es 40 mg/dL").max(600, "Glucosa máxima es 600 mg/dL"),

    cholesterol: z.number().min(100, "Colesterol mínimo es 100").max(500, "Colesterol máximo es 500"),

    triglycerides: z.number().min(0).max(1000, "Triglicéridos máximo es 1000"),

    creatinine: z.number().min(0.5, "Creatinina mínima es 0.5").max(10, "Creatinina máxima es 10"),

    urea: z.number().min(5, "Urea mínima es 5").max(300, "Urea máxima es 300"),

    systolicBP: z.number().min(70, "Presión sistólica mínima es 70").max(250, "Presión sistólica máxima es 250"),

    diastolicBP: z.number().min(40, "Presión diastólica mínima es 40").max(150, "Presión diastólica máxima es 150"),
}

export const prediccionSchema = z.object({
    edad: medicalRangesSchema.age,
    genero: z.enum(["M", "F"]),
    bmi: medicalRangesSchema.bmi,
    hba1c: medicalRangesSchema.hba1c,
    glucosa: medicalRangesSchema.glucose,
    colesterol: medicalRangesSchema.cholesterol,
    trigliceridos: medicalRangesSchema.triglycerides,
    creatinina: medicalRangesSchema.creatinine,
    urea: medicalRangesSchema.urea,
})
