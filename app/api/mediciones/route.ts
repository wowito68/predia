// ============================================
// app/api/mediciones/route.ts
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { query, QueryBuilder } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

const createMedicionSchema = z.object({
  id_paciente: z.number().positive().or(z.string().pipe(z.coerce.number().positive())),
  peso: z.number().positive().optional(),
  altura: z.number().positive().optional(),
  circunferencia_cintura: z.number().positive().optional(),
  circunferencia_cadera: z.number().positive().optional(),
  presion_sistolica: z.number().positive().optional(),
  presion_diastolica: z.number().positive().optional(),
  observaciones: z.string().optional(),
})

// GET - Obtener mediciones
export const GET = requireAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
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

    sql += ` ORDER BY m.fecha_medicion DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

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
