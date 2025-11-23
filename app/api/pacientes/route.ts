// app/api/pacientes/route.ts
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { query, QueryBuilder } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import type { Paciente, PacienteConUltimaPredicion } from "@/types/database"

// Esquema de validación para crear paciente
const createPacienteSchema = z.object({
  cedula: z.string().min(5, "La cédula debe tener al menos 5 caracteres"),
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  apellido_paterno: z.string().min(2, "El apellido paterno es requerido"),
  apellido_materno: z.string().optional().or(z.literal("")).or(z.null()),
  genero: z.enum(["M", "F", "Otro"], {
    errorMap: () => ({ message: "Género debe ser M, F u Otro" }),
  }),
  fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  telefono: z.string().optional().or(z.literal("")).or(z.null()),
  email: z.string().email("Email inválido").optional().or(z.literal("")).or(z.null()),
})

// GET - Obtener todos los pacientes
export const GET = requireAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const offset = (page - 1) * limit

    let sql = `
      SELECT 
        p.*,
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
      WHERE p.activo = TRUE
    `

    const params: any[] = []

    // Búsqueda
    if (search) {
      sql += ` AND (
        p.nombre LIKE ? OR 
        p.apellido_paterno LIKE ? OR 
        p.cedula LIKE ?
      )`
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    // Paginación
    sql += ` ORDER BY p.fecha_registro DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const pacientes = await query<PacienteConUltimaPredicion>(sql, params)

    // Contar total de pacientes
    let countSql = "SELECT COUNT(*) as total FROM paciente WHERE activo = TRUE"
    const countParams: any[] = []

    if (search) {
      countSql += ` AND (nombre LIKE ? OR apellido_paterno LIKE ? OR cedula LIKE ?)`
      const searchTerm = `%${search}%`
      countParams.push(searchTerm, searchTerm, searchTerm)
    }

    const [countResult] = await query<{ total: number }>(countSql, countParams)
    const total = countResult?.total || 0

    return NextResponse.json({
      success: true,
      data: pacientes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("GET pacientes error:", error)
    return NextResponse.json(
      {
        error: "Error al obtener pacientes",
      },
      { status: 500 },
    )
  }
})

// POST - Crear nuevo paciente
export const POST = requireAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json()

    // Validar datos
    const validation = createPacienteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: validation.error.errors,
        },
        { status: 400 },
      )
    }

    const data = validation.data

    // Verificar si la cédula ya existe en pacientes activos
    const existingPaciente = await query<Paciente>(
      "SELECT id_paciente FROM paciente WHERE cedula = ? AND activo = TRUE",
      [data.cedula]
    )

    if (existingPaciente.length > 0) {
      return NextResponse.json(
        {
          error: "Ya existe un paciente activo con esa cédula",
        },
        { status: 409 },
      )
    }

    // Insertar paciente
    const { sql, params } = QueryBuilder.insert("paciente", {
      cedula: data.cedula.trim(),
      nombre: data.nombre.trim(),
      apellido_paterno: data.apellido_paterno.trim(),
      apellido_materno: data.apellido_materno ? data.apellido_materno.toString().trim() : null,
      genero: data.genero,
      fecha_nacimiento: data.fecha_nacimiento,
      telefono: data.telefono ? data.telefono.toString().trim() : null,
      email: data.email ? data.email.toString().trim() : null,
    })

    const result = await query<any>(sql, params)
    const id_paciente = (result as any).insertId

    if (!id_paciente) {
      return NextResponse.json(
        {
          error: "Error al crear paciente",
          details: "No se generó ID para el paciente",
        },
        { status: 500 },
      )
    }

    // Obtener el paciente creado
    const paciente = await query<Paciente>("SELECT * FROM paciente WHERE id_paciente = ?", [id_paciente])

    if (!paciente || paciente.length === 0) {
      return NextResponse.json(
        {
          error: "Error al crear paciente",
          details: "No se pudo recuperar el paciente creado",
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Paciente creado exitosamente",
        data: paciente[0],
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("POST paciente error:", error)
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    return NextResponse.json(
      {
        error: "Error al crear paciente",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
})
