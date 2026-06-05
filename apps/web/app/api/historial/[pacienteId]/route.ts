// app/api/historial/[pacienteId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { query, QueryBuilder } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import type { HistorialClinico } from "@/types/database"
import { HistoryRouteContext } from "@/types/route-context"
import { parseIdParam } from "@/lib/validation"

// GET - Obtener historial de un paciente
export const GET = requireAuth(async (request: NextRequest, { params, user }: HistoryRouteContext) => {
  try {
    const { id: id_paciente, error, status } = parseIdParam(params, "pacienteId")
    if (error) return NextResponse.json({ error }, { status })
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    const historial = await query<any>(
      `
      SELECT h.*, u.username as usuario_nombre
      FROM historial_clinico h
      INNER JOIN usuario u ON h.id_usuario = u.id_usuario
      WHERE h.id_paciente = ?
      ORDER BY h.fecha_registro DESC
      LIMIT ? OFFSET ?
    `,
      [id_paciente, limit, offset],
    )

    const [total] = await query<{ total: number }>(
      `SELECT COUNT(*) as total FROM historial_clinico WHERE id_paciente = ?`,
      [id_paciente],
    )

    return NextResponse.json({
      success: true,
      data: historial,
      page,
      limit,
      total: total.total,
      pages: Math.ceil(total.total / limit),
    })
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener historial" }, { status: 500 })
  }
})

// POST - Agregar entrada al historial
export const POST = requireAuth(async (request: NextRequest, { params, user }: HistoryRouteContext) => {
  try {
    const { id: id_paciente, error, status } = parseIdParam(params, "pacienteId")
    if (error) return NextResponse.json({ error }, { status })
    const body = await request.json()

    const data = {
      id_paciente,
      id_usuario: user.id_usuario,
      tipo_evento: body.tipo_evento,
      descripcion: body.descripcion,
      diagnostico: body.diagnostico || null,
      tratamiento: body.tratamiento || null,
      observaciones: body.observaciones || null,
      fecha_registro: new Date(),
    }

    const { sql, params: queryParams } = QueryBuilder.insert("historial_clinico", data)
    const result = await query(sql, queryParams)

    const id_historial = (result as any).insertId

    const entrada = await query<HistorialClinico>(
      `SELECT * FROM historial_clinico WHERE id_historial = ?`,
      [id_historial],
    )

    return NextResponse.json(
      {
        success: true,
        message: "Entrada agregada al historial",
        data: entrada[0],
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error al agregar al historial:", error)
    return NextResponse.json({ error: "Error al agregar al historial" }, { status: 500 })
  }
})
