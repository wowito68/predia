// ============================================
// app/api/estudios/route.ts
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { query, QueryBuilder } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

const createEstudioSchema = z.object({
  id_paciente: z.number().positive().or(z.string().pipe(z.coerce.number().positive())),
  urea: z.number().nonnegative().optional(),
  creatinina: z.number().nonnegative().optional(),
  hba1c: z.number().nonnegative().optional(),
  glucosa_ayunas: z.number().nonnegative().optional(),
  colesterol_total: z.number().nonnegative().optional(),
  trigliceridos: z.number().nonnegative().optional(),
  hdl: z.number().nonnegative().optional(),
  ldl: z.number().nonnegative().optional(),
  vldl: z.number().nonnegative().optional(),
  observaciones: z.string().optional(),
})

// GET - Obtener estudios
export const GET = requireAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const id_paciente = searchParams.get("id_paciente")
    const offset = (page - 1) * limit

    let sql = `
      SELECT e.*, 
             CONCAT(p.nombre, ' ', p.apellido_paterno) as paciente_nombre
      FROM estudio_laboratorio e
      INNER JOIN paciente p ON e.id_paciente = p.id_paciente
      WHERE e.activo = TRUE
    `
    const params: any[] = []

    if (id_paciente) {
      sql += ` AND e.id_paciente = ?`
      params.push(parseInt(id_paciente))
    }

    // mysql2.execute() falla con LIMIT/OFFSET enlazados; se interpolan enteros saneados
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 10
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0
    sql += ` ORDER BY e.fecha_estudio DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`

    const estudios = await query<any>(sql, params)

    // Total para paginación
    let countSql = `SELECT COUNT(*) as total FROM estudio_laboratorio WHERE activo = TRUE`
    const countParams: any[] = []
    if (id_paciente) {
      countSql += ` AND id_paciente = ?`
      countParams.push(parseInt(id_paciente))
    }

    const [total] = await query<{ total: number }>(countSql, countParams)

    return NextResponse.json({
      success: true,
      data: estudios,
      page,
      limit,
      total: total.total,
      pages: Math.ceil(total.total / limit),
    })
  } catch (error) {
    console.error("Error al obtener estudios:", error)
    return NextResponse.json({ error: "Error al obtener estudios" }, { status: 500 })
  }
})

// POST - Crear estudio
export const POST = requireAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json()
    const validation = createEstudioSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validation.error.errors }, { status: 400 })
    }

    // Filtrar valores undefined
    const data = Object.fromEntries(
      Object.entries({ ...validation.data, id_usuario: user.id_usuario }).filter(([, v]) => v !== undefined)
    )
    
    const { sql, params } = QueryBuilder.insert("estudio_laboratorio", data)

    const result = await query(sql, params)
    const id_estudio = (result as any).insertId

    const estudio = await query("SELECT * FROM estudio_laboratorio WHERE id_estudio = ?", [id_estudio])

    return NextResponse.json(
      {
        success: true,
        message: "Estudio creado",
        data: estudio[0],
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error al crear estudio:", error)
    return NextResponse.json({ error: "Error al crear estudio" }, { status: 500 })
  }
})
