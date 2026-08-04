// app/api/predicciones/nueva/route.ts
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/auth"
import { realizarPrediccion, validarDatos, calcularImportanciaFactores } from "@/lib/ml-predict"
import type { DataosPred } from "@/lib/ml-predict"

// Esquema de validación para predicción
const prediccionSchema = z.object({
  id_paciente: z.number().positive(),
  id_estudio: z.number().positive().optional(),
  id_medicion: z.number().positive().optional(),
  // Contrato MIGRADO: features de cribado (diabetes_dataset.csv), sin laboratorios
  // diagnósticos (HbA1c/glucosa) para evitar fuga de información.
  datos_entrada: z.object({
    gender: z.string(),
    ethnicity: z.string(),
    education_level: z.string(),
    income_level: z.string(),
    employment_status: z.string(),
    smoking_status: z.string(),
    family_history_diabetes: z.number().min(0).max(1),
    hypertension_history: z.number().min(0).max(1),
    cardiovascular_history: z.number().min(0).max(1),
    age: z.number().positive(),
    alcohol_consumption_per_week: z.number().nonnegative(),
    physical_activity_minutes_per_week: z.number().nonnegative(),
    diet_score: z.number().nonnegative(),
    sleep_hours_per_day: z.number().nonnegative(),
    screen_time_hours_per_day: z.number().nonnegative(),
    bmi: z.number().positive(),
    waist_to_hip_ratio: z.number().positive(),
    systolic_bp: z.number().positive(),
    diastolic_bp: z.number().positive(),
    heart_rate: z.number().positive(),
    cholesterol_total: z.number().nonnegative(),
    hdl_cholesterol: z.number().nonnegative(),
    ldl_cholesterol: z.number().nonnegative(),
    triglycerides: z.number().nonnegative(),
  }),
})

// POST - Crear nueva predicción
export async function POST(request: NextRequest) {
  try {
    // Auth
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const body = await request.json()

    // Validar datos
    const validation = prediccionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.errors },
        { status: 400 },
      )
    }

    const { id_paciente, id_estudio, id_medicion, datos_entrada } = validation.data

    // Verificar que el paciente existe (Prisma)
    const paciente = await prisma.paciente.findFirst({
      where: { id_paciente, activo: true },
    })

    if (!paciente) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })
    }

    // Realizar predicción con el modelo (pure TypeScript, no dependencies)
    const resultado = await realizarPrediccion(datos_entrada as DataosPred)

    // Calcular importancia de factores
    const factoresImportancia = calcularImportanciaFactores(datos_entrada as DataosPred)

    // Obtener modelo activo (Prisma)
    let modelo = await prisma.modeloIA.findFirst({
      where: { activo: true },
      orderBy: { fecha_registro: "desc" },
    })

    // Si no existe modelo activo, crearlo automáticamente
    if (!modelo) {
      console.warn("⚠️ No hay modelo de IA activo. Creando registro por defecto...")
      modelo = await prisma.modeloIA.create({
        data: {
          version: "v2.0-screening-logreg",
          fecha_entrenamiento: new Date(),
          // Métrica HONESTA de cribado (sin laboratorios diagnósticos). Ver
          // ml-research/metrics/comparison_screening.json y reports/model_report.md.
          accuracy: 0.6044,
          n_samples_train: 80000,
          n_samples_test: 20000,
          features: JSON.stringify([
            "age", "gender", "ethnicity", "education_level", "income_level",
            "employment_status", "smoking_status", "alcohol_consumption_per_week",
            "physical_activity_minutes_per_week", "diet_score", "sleep_hours_per_day",
            "screen_time_hours_per_day", "family_history_diabetes", "hypertension_history",
            "cardiovascular_history", "bmi", "waist_to_hip_ratio", "systolic_bp",
            "diastolic_bp", "heart_rate", "cholesterol_total", "hdl_cholesterol",
            "ldl_cholesterol", "triglycerides",
          ]),
          feature_importance: JSON.stringify({}),
          descripcion: "Regresión Logística de cribado (diabetes_dataset.csv, 100k) SIN laboratorios diagnósticos — evita la fuga de HbA1c del modelo anterior",
          archivo_modelo: "ml-research/exports/predia_diabetes_model.joblib",
          activo: true,
        },
      })
    }

    // Crear predicción (Prisma)
    const prediccion = await prisma.prediccion.create({
      data: {
        id_paciente,
        id_usuario: user.id_usuario,
        id_modelo: modelo.id_modelo,
        id_estudio: id_estudio || null,
        id_medicion: id_medicion || null,
        datos_entrada: JSON.stringify(datos_entrada),
        resultado: resultado.resultado,
        probabilidad_diabetes: resultado.probabilidad_diabetes,
        probabilidad_no_diabetes: resultado.probabilidad_no_diabetes,
        nivel_riesgo: resultado.nivel_riesgo,
        factores_riesgo: JSON.stringify(resultado.factores_riesgo),
        recomendaciones: resultado.recomendaciones,
        score_riesgo: resultado.score,
        recomendaciones_generadas: JSON.stringify({
          nivel_numero: resultado.nivel_numero,
          titulo: resultado.titulo,
          descripcion: resultado.descripcion,
          accion_clinica: resultado.accion_clinica,
          contribuyen: resultado.contribuyen,
          protegen: resultado.protegen,
          recomendaciones: resultado.recomendaciones_estructuradas,
        }),
      },
    })

    // Registrar en historial clínico (optional, don't fail if table missing)
    try {
      await prisma.historialClinico.create({
        data: {
          id_paciente,
          id_usuario: user.id_usuario,
          tipo_evento: "Predicción",
          descripcion: `Predicción de diabetes realizada. Resultado: ${resultado.resultado}`,
        },
      })
    } catch (histErr) {
      console.warn("Could not write to historial_clinico:", histErr)
    }

    return NextResponse.json(
      {
        success: true,
        message: "Predicción realizada exitosamente",
        data: {
          ...prediccion,
          datos_entrada: JSON.parse(prediccion.datos_entrada),
          factores_riesgo: prediccion.factores_riesgo ? JSON.parse(prediccion.factores_riesgo) : [],
          factores_importancia: factoresImportancia.slice(0, 5),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("POST predicción error:", error)
    const errorMsg = error instanceof Error ? error.message : "Error desconocido"

    return NextResponse.json(
      {
        success: false,
        error: "Error al crear predicción",
        details: errorMsg,
      },
      { status: 500 },
    )
  }
}
