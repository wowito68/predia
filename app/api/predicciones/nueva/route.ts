// app/api/predicciones/nueva/route.ts
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { query, callProcedure } from "@/lib/db"
import { requireAuth, verificarPermiso, registrarAuditoria } from "@/lib/auth"
import { realizarPrediccion, validarDatos, calcularImportanciaFactores } from "@/lib/ml-predict"
import type { DataosPred } from "@/lib/ml-predict"

// Esquema de validación para predicción
const prediccionSchema = z.object({
  id_paciente: z.number().positive(),
  id_estudio: z.number().positive().optional(),
  id_medicion: z.number().positive().optional(),
  datos_entrada: z.object({
    Gender: z.number().min(0).max(1), // 0=F, 1=M
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

// Función para calcular nivel de riesgo
function calcularNivelRiesgo(probabilidad: number, hba1c: number, imc: number): string {
  if (probabilidad >= 0.75 || hba1c >= 6.5) {
    return "Muy Alto"
  } else if (probabilidad >= 0.5 || (hba1c >= 5.7 && imc >= 30)) {
    return "Alto"
  } else if (probabilidad >= 0.25 || imc >= 27) {
    return "Moderado"
  }
  return "Bajo"
}

// Función para identificar factores de riesgo
function identificarFactoresRiesgo(datos: any, probabilidad: number): string[] {
  const factores: string[] = []

  if (datos.HbA1c >= 6.5) {
    factores.push("HbA1c elevada (≥6.5%) - Indicativo de diabetes")
  } else if (datos.HbA1c >= 5.7) {
    factores.push("HbA1c en rango prediabético (5.7-6.4%)")
  }

  if (datos.BMI >= 30) {
    factores.push("Obesidad (IMC ≥30)")
  } else if (datos.BMI >= 27) {
    factores.push("Sobrepeso significativo (IMC 27-29.9)")
  } else if (datos.BMI >= 25) {
    factores.push("Sobrepeso (IMC 25-26.9)")
  }

  if (datos.TG >= 200) {
    factores.push("Triglicéridos muy elevados (≥200 mg/dL)")
  } else if (datos.TG >= 150) {
    factores.push("Triglicéridos elevados (150-199 mg/dL)")
  }

  if (datos.Chol >= 240) {
    factores.push("Colesterol total alto (≥240 mg/dL)")
  } else if (datos.Chol >= 200) {
    factores.push("Colesterol total límite alto (200-239 mg/dL)")
  }

  if (datos.HDL < 40) {
    factores.push("HDL bajo (<40 mg/dL) - Factor de riesgo cardiovascular")
  }

  if (datos.LDL >= 160) {
    factores.push("LDL muy alto (≥160 mg/dL)")
  } else if (datos.LDL >= 130) {
    factores.push("LDL límite alto (130-159 mg/dL)")
  }

  if (datos.AGE >= 45) {
    factores.push("Edad ≥45 años")
  }

  if (probabilidad >= 0.7) {
    factores.push("Alta probabilidad de diabetes según modelo predictivo")
  }

  return factores
}

// Función para generar recomendaciones
function generarRecomendaciones(nivelRiesgo: string, factores: string[]): string {
  const recomendaciones: string[] = []

  if (nivelRiesgo === "Muy Alto" || nivelRiesgo === "Alto") {
    recomendaciones.push("⚠️ URGENTE: Consulta inmediata con endocrinólogo")
    recomendaciones.push("🔬 Realizar pruebas de glucosa en ayunas y curva de tolerancia a la glucosa")
    recomendaciones.push("📊 Monitoreo frecuente de glucosa (considerar glucómetro)")
  }

  if (factores.some((f) => f.includes("HbA1c"))) {
    recomendaciones.push("📉 Control estricto de glucosa en sangre")
    recomendaciones.push("🥗 Dieta baja en azúcares y carbohidratos refinados")
  }

  if (factores.some((f) => f.includes("IMC") || f.includes("Obesidad") || f.includes("Sobrepeso"))) {
    recomendaciones.push("🏃 Programa de ejercicio: mínimo 150 minutos de actividad moderada por semana")
    recomendaciones.push("⚖️ Plan nutricional para reducción de peso (déficit calórico controlado)")
  }

  if (factores.some((f) => f.includes("Triglicéridos") || f.includes("Colesterol"))) {
    recomendaciones.push("🐟 Aumentar ingesta de omega-3 (pescados grasos)")
    recomendaciones.push("🚫 Reducir grasas saturadas y trans")
    recomendaciones.push("🥑 Incluir grasas saludables (aguacate, nueces, aceite de oliva)")
  }

  if (factores.some((f) => f.includes("HDL bajo"))) {
    recomendaciones.push("💪 Ejercicio aeróbico regular para aumentar HDL")
    recomendaciones.push("🚭 Evitar tabaco (reduce HDL)")
  }

  // Recomendaciones generales
  recomendaciones.push("📅 Seguimiento médico cada 3-6 meses")
  recomendaciones.push("💧 Mantener hidratación adecuada (2-3 litros de agua al día)")
  recomendaciones.push("😴 Dormir 7-8 horas diarias")
  recomendaciones.push("🧘 Manejo del estrés (meditación, yoga)")

  return recomendaciones.join("\n")
}

// POST - Crear nueva predicción
export const POST = requireAuth(async (request: NextRequest, { user }) => {
  try {
    // Verificar permisos
    if (!verificarPermiso(user.rol, "crear_prediccion")) {
      await registrarAuditoria(
        user.id_usuario,
        "crear_prediccion",
        "Intento sin permisos",
        "fallido",
      )
      return NextResponse.json(
        {
          error: "Permiso denegado",
          message: "No tienes permisos para crear predicciones",
        },
        { status: 403 },
      )
    }

    const body = await request.json()

    // Validar datos
    const validation = prediccionSchema.safeParse(body)
    if (!validation.success) {
      await registrarAuditoria(
        user.id_usuario,
        "crear_prediccion",
        `Validación fallida: ${JSON.stringify(validation.error.errors)}`,
        "fallido",
      )
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: validation.error.errors,
        },
        { status: 400 },
      )
    }

    const { id_paciente, id_estudio, id_medicion, datos_entrada } = validation.data

    // Verificar que el paciente existe
    const paciente = await query("SELECT id_paciente FROM paciente WHERE id_paciente = ? AND activo = TRUE", [
      id_paciente,
    ])

    if (paciente.length === 0) {
      return NextResponse.json(
        {
          error: "Paciente no encontrado",
        },
        { status: 404 },
      )
    }

    // Realizar predicción con el modelo mejorado
    const resultado = await realizarPrediccion(datos_entrada as DataosPred)
    
    // Calcular importancia de factores
    const factoresImportancia = calcularImportanciaFactores(datos_entrada as DataosPred)

    // Obtener modelo activo
    const modelo = await query("SELECT id_modelo FROM modelo_ia WHERE activo = TRUE ORDER BY fecha_registro DESC LIMIT 1")

    if (modelo.length === 0) {
      return NextResponse.json(
        {
          error: "No hay modelo de IA activo",
        },
        { status: 500 },
      )
    }

    const id_modelo = (modelo[0] as any).id_modelo

    // Registrar predicción usando procedimiento almacenado
    const prediccionResult = await query(
      `
      INSERT INTO prediccion (
        id_paciente, id_usuario, id_modelo, id_estudio, id_medicion,
        datos_entrada, resultado, probabilidad_diabetes, probabilidad_no_diabetes,
        nivel_riesgo, factores_riesgo, recomendaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id_paciente,
        user.id_usuario,
        id_modelo,
        id_estudio || null,
        id_medicion || null,
        JSON.stringify(datos_entrada),
        resultado.resultado,
        resultado.probabilidad_diabetes,
        resultado.probabilidad_no_diabetes,
        resultado.nivel_riesgo,
        JSON.stringify(resultado.factores_riesgo),
        resultado.recomendaciones,
      ],
    )

    const id_prediccion = (prediccionResult as any).insertId

    // Registrar en historial
    await query(
      `
      INSERT INTO historial_clinico (id_paciente, id_usuario, tipo_evento, descripcion)
      VALUES (?, ?, 'Predicción', ?)
    `,
      [id_paciente, user.id_usuario, `Predicción de diabetes realizada. Resultado: ${resultado.resultado}`],
    )

    // Obtener predicción completa
    const prediccion = await query("SELECT * FROM prediccion WHERE id_prediccion = ?", [id_prediccion])

    // Registrar en auditoria
    await registrarAuditoria(
      user.id_usuario,
      "crear_prediccion",
      `Predicción creada para paciente ${id_paciente}. Resultado: ${resultado.resultado}`,
      "exitoso",
    )

    return NextResponse.json(
      {
        success: true,
        message: "Predicción realizada exitosamente",
        data: {
          ...prediccion[0],
          datos_entrada: JSON.parse((prediccion[0] as any).datos_entrada),
          factores_riesgo: JSON.parse((prediccion[0] as any).factores_riesgo),
          factores_importancia: factoresImportancia.slice(0, 5), // Top 5 factores
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("POST predicción error:", error)
    const errorMsg = error instanceof Error ? error.message : "Error desconocido"
    
    // Registrar error en auditoria
    try {
      await registrarAuditoria(
        user.id_usuario,
        "crear_prediccion",
        `Error: ${errorMsg}`,
        "fallido",
      )
    } catch (auditError) {
      console.error("Error al registrar auditoria:", auditError)
    }

    return NextResponse.json(
      {
        success: false,
        error: "Error al crear predicción",
        details: errorMsg,
      },
      { status: 500 },
    )
  }
})
