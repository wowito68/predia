// app/api/usuarios/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { query, queryOne } from "@/lib/db"
import { hashPassword, verifyToken } from "@/lib/auth"
import type { NextRequest } from "next/server"
import type { Usuario } from "@/types/database"

// Schema para crear usuario
const createUserSchema = z.object({
  username: z.string().min(3, "Username debe tener al menos 3 caracteres").max(100),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
  nombre: z.string().min(2, "Nombre requerido").max(100),
  apellido_paterno: z.string().min(2, "Apellido paterno requerido").max(100),
  apellido_materno: z.string().optional(),
  email: z.string().email("Email inválido").max(100),
  telefono: z.string().optional(),
  cedula_profesional: z.string().optional(),
  especialidad: z.string().optional(),
  id_rol: z.number().int().positive("Rol debe ser un número positivo"),
})

// GET - Listar todos los usuarios
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    // Obtener parámetros de query
    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit
    // mysql2.execute() falla con LIMIT/OFFSET enlazados; se interpolan enteros saneados
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 10
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0

    // Obtener usuarios con rol
    const usuarios = await query<Usuario & { nombre_rol: string }>(
      `
      SELECT u.*, r.nombre_rol
      FROM usuario u
      LEFT JOIN rol r ON u.id_rol = r.id_rol
      ORDER BY u.fecha_registro DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `,
      [],
    )

    // Contar total de usuarios
    const countResult = await queryOne<{ total: number }>(
      "SELECT COUNT(*) as total FROM usuario",
      [],
    )

    return NextResponse.json(
      {
        success: true,
        data: usuarios,
        pagination: {
          page,
          limit,
          total: countResult?.total || 0,
          pages: Math.ceil((countResult?.total || 0) / limit),
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error al obtener usuarios:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST - Crear nuevo usuario
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    // Parsear cuerpo de la solicitud
    const body = await req.json()

    // Validar con Zod
    const validation = createUserSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.errors },
        { status: 400 },
      )
    }

    const data = validation.data

    // Verificar que username no exista
    const existingUsername = await queryOne(
      "SELECT id_usuario FROM usuario WHERE username = ?",
      [data.username],
    )
    if (existingUsername) {
      return NextResponse.json({ error: "El username ya existe" }, { status: 409 })
    }

    // Verificar que email no exista
    const existingEmail = await queryOne(
      "SELECT id_usuario FROM usuario WHERE email = ?",
      [data.email],
    )
    if (existingEmail) {
      return NextResponse.json({ error: "El email ya existe" }, { status: 409 })
    }

    // Verificar que cédula profesional no exista (si se proporciona)
    if (data.cedula_profesional) {
      const existingCedula = await queryOne(
        "SELECT id_usuario FROM usuario WHERE cedula_profesional = ?",
        [data.cedula_profesional],
      )
      if (existingCedula) {
        return NextResponse.json({ error: "La cédula profesional ya existe" }, { status: 409 })
      }
    }

    // Verificar que el rol existe
    const roleExists = await queryOne(
      "SELECT id_rol FROM rol WHERE id_rol = ?",
      [data.id_rol],
    )
    if (!roleExists) {
      return NextResponse.json({ error: "El rol especificado no existe" }, { status: 400 })
    }

    // Hash de la contraseña
    const hashedPassword = await hashPassword(data.password)

    // Crear usuario
    const result = await query(
      `
      INSERT INTO usuario (
        username, password_hash, id_rol, nombre, 
        apellido_paterno, apellido_materno, email, 
        telefono, cedula_profesional, especialidad
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        data.username,
        hashedPassword,
        data.id_rol,
        data.nombre,
        data.apellido_paterno,
        data.apellido_materno || null,
        data.email,
        data.telefono || null,
        data.cedula_profesional || null,
        data.especialidad || null,
      ],
    )

    // Obtener el usuario creado
    const newUser = await queryOne<Usuario & { nombre_rol: string }>(
      `
      SELECT u.*, r.nombre_rol
      FROM usuario u
      LEFT JOIN rol r ON u.id_rol = r.id_rol
      WHERE u.id_usuario = ?
    `,
      [(result as any).insertId],
    )

    return NextResponse.json(
      {
        success: true,
        message: "Usuario creado exitosamente",
        data: newUser,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error al crear usuario:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
