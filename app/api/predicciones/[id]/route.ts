// app/api/predicciones/[id]/route.ts
// ✅ CORREGIDO para Next.js 15: async params, tipos unificados, respuestas consistentes
import { NextRequest, NextResponse } from "next/server"
import { query, QueryBuilder } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import type { Prediccion } from "@/types/database"

// ✅ GET - Obtener predicción por ID
export const GET = requireAuth(async (request: NextRequest, context: { params?: any; user: any }) => {
  try {
    // ✅ CORRECCIÓN: params es Promise en Next.js 15
    const params = await context.params
    const id = parseInt(params.id, 10)

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      )
    }

    const prediccion = await query<any>(
      `SELECT p.*, 
              pa.cedula,
              pa.genero,
              CONCAT(pa.nombre, ' ', pa.apellido_paterno) as paciente_nombre,
              pa.nombre,
              pa.apellido_paterno,
              u.username as usuario_nombre
       FROM prediccion p
       INNER JOIN paciente pa ON p.id_paciente = pa.id_paciente
       INNER JOIN usuario u ON p.id_usuario = u.id_usuario
       WHERE p.id_prediccion = ?`,
      [id],
    )

    if (prediccion.length === 0) {
      return NextResponse.json(
        { success: false, error: "Predicción no encontrada", code: "NOT_FOUND" },
        { status: 404 }
      )
    }

    const pred = prediccion[0]

    // Parse JSON fields
    const result = {
      ...pred,
      datos_entrada: typeof pred.datos_entrada === 'string' ? JSON.parse(pred.datos_entrada) : pred.datos_entrada,
      factores_riesgo: typeof pred.factores_riesgo === 'string' ? JSON.parse(pred.factores_riesgo) : pred.factores_riesgo,
      paciente: {
        nombre: pred.nombre,
        apellido_paterno: pred.apellido_paterno,
        cedula: pred.cedula,
        genero: pred.genero,
      }
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    console.error("❌ Error en GET predicción:", errorMessage)
    return NextResponse.json(
      { success: false, error: "Error al obtener predicción", details: errorMessage },
      { status: 500 }
    )
  }
})

// ✅ PUT - Actualizar predicción (validar resultado)
export const PUT = requireAuth(async (request: NextRequest, context: { params?: any; user: any }) => {
  try {
    // ✅ CORRECCIÓN: params es Promise en Next.js 15
    const params = await context.params
    const id = parseInt(params.id, 10)

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Solo permitir actualizar ciertos campos
    const allowedFields = ["diagnostico_confirmado", "notas_medicas", "validado"]
    const updateData: Record<string, any> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No hay campos para actualizar" },
        { status: 400 }
      )
    }

    // Si se valida, agregar fecha de validación
    if ("diagnostico_confirmado" in updateData) {
      updateData.fecha_validacion = new Date()
      updateData.validado = true
    }

    const { sql, params: queryParams } = QueryBuilder.update(
      "prediccion",
      updateData,
      "id_prediccion = ?",
      [id],
    )

    await query(sql, queryParams)

    const updated = await query<any>(
      `SELECT p.*, 
              CONCAT(pa.nombre, ' ', pa.apellido_paterno) as paciente_nombre
       FROM prediccion p
       INNER JOIN paciente pa ON p.id_paciente = pa.id_paciente
       WHERE p.id_prediccion = ?`,
      [id],
    )

    if (updated.length === 0) {
      return NextResponse.json(
        { success: false, error: "Predicción no encontrada después de actualizar" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Predicción actualizada",
      data: updated[0],
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    console.error("❌ Error en PUT predicción:", errorMessage)
    return NextResponse.json(
      { success: false, error: "Error al actualizar predicción" },
      { status: 500 }
    )
  }
})

// ✅ DELETE - Eliminar predicción (soft delete)
export const DELETE = requireAuth(async (request: NextRequest, context: { params?: any; user: any }) => {
  try {
    // ✅ CORRECCIÓN: params es Promise en Next.js 15
    const params = await context.params
    const id = parseInt(params.id, 10)

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      )
    }

    // Verificar existencia
    const existing = await query<Prediccion>(
      "SELECT id_prediccion FROM prediccion WHERE id_prediccion = ?",
      [id]
    )

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Predicción no encontrada" },
        { status: 404 }
      )
    }

    await query("UPDATE prediccion SET validado = FALSE WHERE id_prediccion = ?", [id])

    return NextResponse.json({
      success: true,
      message: "Predicción eliminada",
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    console.error("❌ Error en DELETE predicción:", errorMessage)
    return NextResponse.json(
      { success: false, error: "Error al eliminar predicción" },
      { status: 500 }
    )
  }
})
