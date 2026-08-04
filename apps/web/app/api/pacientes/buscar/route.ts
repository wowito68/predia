// app/api/pacientes/buscar/route.ts
import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import type { Paciente } from "@/types/database"

// GET - Buscar pacientes
export const GET = requireAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    if (q.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        page,
        limit,
        total: 0,
        pages: 0,
      })
    }

    const searchTerm = `%${q}%`
    // mysql2.execute() falla con LIMIT/OFFSET enlazados; se interpolan enteros saneados
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 10
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0

    const pacientes = await query<any>(
      `
      SELECT p.*,
             pred.fecha_prediccion,
             pred.resultado,
             pred.probabilidad_diabetes,
             pred.nivel_riesgo,
             pred.diagnostico_confirmado
      FROM paciente p
      LEFT JOIN (
        SELECT 
          id_paciente,
          fecha_prediccion,
          resultado,
          probabilidad_diabetes,
          nivel_riesgo,
          diagnostico_confirmado,
          ROW_NUMBER() OVER (PARTITION BY id_paciente ORDER BY fecha_prediccion DESC) as rn
        FROM prediccion
      ) pred ON p.id_paciente = pred.id_paciente AND pred.rn = 1
      WHERE p.activo = TRUE AND (
        p.nombre LIKE ? OR 
        p.apellido_paterno LIKE ? OR 
        p.apellido_materno LIKE ? OR 
        p.cedula LIKE ? OR
        p.email LIKE ?
      )
      ORDER BY p.fecha_registro DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
    )

    const [totalResult] = await query<{ total: number }>(
      `
      SELECT COUNT(*) as total FROM paciente WHERE activo = TRUE AND (
        nombre LIKE ? OR 
        apellido_paterno LIKE ? OR 
        apellido_materno LIKE ? OR 
        cedula LIKE ? OR
        email LIKE ?
      )
    `,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
    )

    return NextResponse.json({
      success: true,
      data: pacientes,
      page,
      limit,
      total: totalResult.total,
      pages: Math.ceil(totalResult.total / limit),
    })
  } catch (error) {
    console.error("Error al buscar pacientes:", error)
    return NextResponse.json({ error: "Error al buscar pacientes" }, { status: 500 })
  }
})
