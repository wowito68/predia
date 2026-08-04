// app/api/estudios/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { query, QueryBuilder } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import type { EstudioLaboratorio } from "@/types/database"
import { DynamicRouteContext } from "@/types/route-context"
import { parseIdParam } from "@/lib/validation"

// GET - Obtener estudio por ID
export const GET = requireAuth(async (request: NextRequest, { params, user }: DynamicRouteContext) => {
  try {
    const { id, error, status } = parseIdParam(params, "id")
    if (error) return NextResponse.json({ error }, { status })

    const estudio = await query<EstudioLaboratorio>(
      `SELECT * FROM estudio_laboratorio WHERE id_estudio = ? AND activo = TRUE`,
      [id],
    )

    if (estudio.length === 0) {
      return NextResponse.json({ error: "Estudio no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: estudio[0] })
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener estudio" }, { status: 500 })
  }
})

// PUT - Actualizar estudio
export const PUT = requireAuth(async (request: NextRequest, { params, user }: DynamicRouteContext) => {
  try {
    const { id, error, status } = parseIdParam(params, "id")
    if (error) return NextResponse.json({ error }, { status })
    const body = await request.json()

    const { sql, params: queryParams } = QueryBuilder.update(
      "estudio_laboratorio",
      body,
      "id_estudio = ?",
      [id],
    )

    await query(sql, queryParams)

    const updated = await query<EstudioLaboratorio>(
      "SELECT * FROM estudio_laboratorio WHERE id_estudio = ?",
      [id],
    )

    return NextResponse.json({
      success: true,
      message: "Estudio actualizado",
      data: updated[0],
    })
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }
})

// DELETE - Eliminar estudio
export const DELETE = requireAuth(async (request: NextRequest, { params, user }: DynamicRouteContext) => {
  try {
    const { id, error, status } = parseIdParam(params, "id")
    if (error) return NextResponse.json({ error }, { status })

    await query("UPDATE estudio_laboratorio SET activo = FALSE WHERE id_estudio = ?", [id])

    return NextResponse.json({
      success: true,
      message: "Estudio eliminado",
    })
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 })
  }
})
