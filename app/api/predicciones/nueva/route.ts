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
  datos_entrada: z.object({
    Gender: z.number().min(0).max(1),
    AGE: z.number().positive(),
    Urea: z.number().nonnegative(),
    Cr: z.number().nonnegative(),
    HbA1c: z.number().nonnegative(),
    Chol: z.number().nonnegative(),
    TG: z.number().nonnegative(),
    HDL: z.number().nonnegative(),
    LDL: z.number().nonnegative(),
    VLDL: z.number().nonnegative(),
    BMI: z.number().positive(),
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
          version: "v1.0-LogisticRegression",
          fecha_entrenamiento: new Date("2025-11-20T23:06:44"),
          accuracy: 0.9789,
          n_samples_train: 757,
          n_samples_test: 190,
          features: JSON.stringify(["Gender", "AGE", "Urea", "Cr", "HbA1c", "Chol", "TG", "HDL", "LDL", "VLDL", "BMI"]),
          feature_importance: JSON.stringify({
            Gender: 0.318, AGE: 0.229, Urea: 0.110, Cr: -0.043,
            HbA1c: 2.363, Chol: 0.954, TG: 0.961, HDL: 0.292,
            LDL: 0.048, VLDL: 0.225, BMI: 2.869,
          }),
          descripcion: "Regresión Logística entrenada con dataset de 947 muestras",
          archivo_modelo: "models/modelo_diabetes.pkl",
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
