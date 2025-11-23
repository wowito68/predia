// app/api/predicciones/route.ts
import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import type { Prediccion } from "@/types/database"

// GET - Obtener predicciones
export const GET = requireAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const id_paciente = searchParams.get("id_paciente")
    const offset = (page - 1) * limit

    let sql = `
      SELECT p.*, 
             CONCAT(pa.nombre, ' ', pa.apellido_paterno) as paciente_nombre,
             u.username as usuario_nombre
      FROM prediccion p
      INNER JOIN paciente pa ON p.id_paciente = pa.id_paciente
      INNER JOIN usuario u ON p.id_usuario = u.id_usuario
      WHERE 1=1
    `
    const params: any[] = []

    if (id_paciente) {
      sql += ` AND p.id_paciente = ?`
      params.push(parseInt(id_paciente))
    }

    sql += ` ORDER BY p.fecha_prediccion DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const predicciones = await query<any>(sql, params)

    // Total para paginación
    let countSql = `SELECT COUNT(*) as total FROM prediccion WHERE 1=1`
    const countParams: any[] = []
    if (id_paciente) {
      countSql += ` AND id_paciente = ?`
      countParams.push(parseInt(id_paciente))
    }

    const [total] = await query<{ total: number }>(countSql, countParams)

    return NextResponse.json({
      success: true,
      data: predicciones,
      page,
      limit,
      total: total.total,
      pages: Math.ceil(total.total / limit),
    })
  } catch (error) {
    console.error("Error al obtener predicciones:", error)
    return NextResponse.json({ error: "Error al obtener predicciones" }, { status: 500 })
  }
})

