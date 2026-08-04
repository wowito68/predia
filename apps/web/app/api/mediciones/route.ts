// ============================================
// app/api/mediciones/route.ts
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { query, QueryBuilder } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

const createMedicionSchema = z.object({
  id_paciente: z.coerce.number().int().positive(),
  peso: z.coerce.number().min(1).max(500).optional(),
  altura: z.coerce.number().min(0.4).max(2.5).optional(),
  circunferencia_cintura: z.coerce.number().min(20).max(250).optional(),
  circunferencia_cadera: z.coerce.number().min(20).max(250).optional(),
  presion_sistolica: z.coerce.number().int().min(50).max(260).optional(),
  presion_diastolica: z.coerce.number().int().min(30).max(180).optional(),
  observaciones: z.string().trim().max(2000).optional(),
}).strict().refine((data) => (
  data.peso != null
  || data.altura != null
  || data.circunferencia_cintura != null
  || data.circunferencia_cadera != null
  || data.presion_sistolica != null
  || data.presion_diastolica != null
  || !!data.observaciones
), { message: "Captura al menos una medición" })

// GET - Obtener mediciones
export const GET = requireAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")))
    const id_paciente = searchParams.get("id_paciente")
    const offset = (page - 1) * limit

    let sql = `
      SELECT m.*, 
             CONCAT(p.nombre, ' ', p.apellido_paterno) as paciente_nombre
      FROM medicion_antropometrica m
      INNER JOIN paciente p ON m.id_paciente = p.id_paciente
      WHERE m.activo = TRUE
    `
    const params: any[] = []

    if (id_paciente) {
      sql += ` AND m.id_paciente = ?`
      params.push(parseInt(id_paciente))
    }

    // mysql2 rechaza placeholders en LIMIT/OFFSET con execute(); como ya son
    // enteros validados, se interpolan de forma segura.
    const safeLimit = Number.isFinite(limit) ? limit : 10
    const safeOffset = Number.isFinite(offset) ? offset : 0
    sql += ` ORDER BY m.fecha_medicion DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`

    const mediciones = await query<any>(sql, params)

    // Total para paginación
    let countSql = `SELECT COUNT(*) as total FROM medicion_antropometrica WHERE activo = TRUE`
    const countParams: any[] = []
    if (id_paciente) {
      countSql += ` AND id_paciente = ?`
      countParams.push(parseInt(id_paciente))
    }

    const [total] = await query<{ total: number }>(countSql, countParams)

    return NextResponse.json({
      success: true,
      data: mediciones,
      page,
      limit,
      total: total.total,
      pages: Math.ceil(total.total / limit),
    })
  } catch (error) {
    console.error("Error al obtener mediciones:", error)
    return NextResponse.json({ error: "Error al obtener mediciones" }, { status: 500 })
  }
})

// POST - Crear medición
export const POST = requireAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json()
    const validation = createMedicionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validation.error.errors }, { status: 400 })
    }

    // Calcular IMC si se proporcionan peso y altura
    let data: any = { ...validation.data, id_usuario: user.id_usuario }
    if (data.peso && data.altura) {
      data.imc = Math.round((data.peso / (data.altura * data.altura)) * 100) / 100
    }

    // Filtrar valores undefined
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    )

    const { sql, params } = QueryBuilder.insert("medicion_antropometrica", cleanData)

    const result = await query(sql, params)
    const id_medicion = (result as any).insertId

    const medicion = await query("SELECT * FROM medicion_antropometrica WHERE id_medicion = ?", [id_medicion])

    return NextResponse.json(
      {
        success: true,
        message: "Medición creada",
        data: medicion[0],
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error al crear medición:", error)
    return NextResponse.json({ error: "Error al crear medición" }, { status: 500 })
  }
})
