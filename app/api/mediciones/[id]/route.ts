// app/api/mediciones/[id]/route.ts
// ✅ CORREGIDO para Next.js 15: async params, tipos unificados, respuestas consistentes
import { NextRequest, NextResponse } from "next/server"
import { query, QueryBuilder } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import type { MedicionAntropometrica } from "@/types/database"

// ✅ GET - Obtener medición por ID
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

    const medicion = await query<MedicionAntropometrica>(
      `SELECT * FROM medicion_antropometrica WHERE id_medicion = ? AND activo = TRUE`,
      [id],
    )

    if (medicion.length === 0) {
      return NextResponse.json(
        { success: false, error: "Medición no encontrada", code: "NOT_FOUND" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: medicion[0] })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    console.error("❌ Error en GET medición:", errorMessage)
    return NextResponse.json(
      { success: false, error: "Error al obtener medición" },
      { status: 500 }
    )
  }
})

// ✅ PUT - Actualizar medición (reemplazo completo)
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

    const { sql, params: queryParams } = QueryBuilder.update(
      "medicion_antropometrica",
      body,
      "id_medicion = ?",
      [id],
    )

    await query(sql, queryParams)

    const updated = await query<MedicionAntropometrica>(
      "SELECT * FROM medicion_antropometrica WHERE id_medicion = ?",
      [id],
    )

    if (updated.length === 0) {
      return NextResponse.json(
        { success: false, error: "Medición no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Medición actualizada",
      data: updated[0],
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    console.error("❌ Error en PUT medición:", errorMessage)
    return NextResponse.json(
      { success: false, error: "Error al actualizar medición" },
      { status: 500 }
    )
  }
})

// ✅ DELETE - Eliminar medición (soft delete)
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
    const existing = await query<MedicionAntropometrica>(
      "SELECT id_medicion FROM medicion_antropometrica WHERE id_medicion = ?",
      [id]
    )

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Medición no encontrada" },
        { status: 404 }
      )
    }

    await query("UPDATE medicion_antropometrica SET activo = FALSE WHERE id_medicion = ?", [id])

    return NextResponse.json({
      success: true,
      message: "Medición eliminada",
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    console.error("❌ Error en DELETE medición:", errorMessage)
    return NextResponse.json(
      { success: false, error: "Error al eliminar medición" },
      { status: 500 }
    )
  }
})
