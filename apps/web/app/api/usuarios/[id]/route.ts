// app/api/usuarios/[id]/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { query, queryOne } from "@/lib/db"
import { hashPassword, verificarPermiso, verifyToken } from "@/lib/auth"
import { PUBLIC_USER_SELECT, type PublicUsuario } from "@/lib/public-user"
import type { NextRequest } from "next/server"

// Schema para actualizar usuario
const updateUserSchema = z.object({
  password: z.string().min(12).max(128).optional(),
  nombre: z.string().min(2).max(100).optional(),
  apellido_paterno: z.string().min(2).max(100).optional(),
  apellido_materno: z.string().max(100).optional(),
  email: z.string().email().max(100).optional(),
  telefono: z.string().optional(),
  cedula_profesional: z.string().optional(),
  especialidad: z.string().optional(),
  id_rol: z.number().int().positive().optional(),
  activo: z.boolean().optional(),
}).strict()

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Obtener un usuario específico
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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
    if (!verificarPermiso(user.rol, "listar_usuarios")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const userId = parseInt(id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID de usuario inválido" }, { status: 400 })
    }

    const usuario = await queryOne<PublicUsuario>(
      `
      SELECT ${PUBLIC_USER_SELECT}
      FROM usuario u
      LEFT JOIN rol r ON u.id_rol = r.id_rol
      WHERE u.id_usuario = ?
    `,
      [userId],
    )

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    return NextResponse.json(
      {
        success: true,
        data: usuario,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error al obtener usuario:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// PATCH - Actualizar usuario
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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
    if (!verificarPermiso(user.rol, "editar_usuario")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const userId = parseInt(id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID de usuario inválido" }, { status: 400 })
    }

    const body = await req.json()

    // Validar con Zod
    const validation = updateUserSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.errors },
        { status: 400 },
      )
    }

    const data = validation.data

    if (user.id_usuario === userId && (data.activo === false || data.id_rol !== undefined)) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta ni cambiar tu propio rol" },
        { status: 409 },
      )
    }

    // Verificar que el usuario existe
    const existingUser = await queryOne("SELECT id_usuario FROM usuario WHERE id_usuario = ?", [
      userId,
    ])
    if (!existingUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar que email no exista en otro usuario
    if (data.email) {
      const emailExists = await queryOne(
        "SELECT id_usuario FROM usuario WHERE email = ? AND id_usuario != ?",
        [data.email, userId],
      )
      if (emailExists) {
        return NextResponse.json({ error: "El email ya está en uso" }, { status: 409 })
      }
    }

    // Verificar que cédula profesional no exista en otro usuario
    if (data.cedula_profesional) {
      const cedulaExists = await queryOne(
        "SELECT id_usuario FROM usuario WHERE cedula_profesional = ? AND id_usuario != ?",
        [data.cedula_profesional, userId],
      )
      if (cedulaExists) {
        return NextResponse.json({ error: "La cédula profesional ya está en uso" }, { status: 409 })
      }
    }

    if (data.id_rol) {
      const roleExists = await queryOne("SELECT id_rol FROM rol WHERE id_rol = ? AND activo = TRUE", [data.id_rol])
      if (!roleExists) {
        return NextResponse.json({ error: "El rol especificado no existe" }, { status: 400 })
      }
    }

    // Construir query de actualización dinámicamente
    const updateFields: string[] = []
    const updateValues: unknown[] = []

    if (data.password) {
      updateFields.push("password_hash = ?")
      updateValues.push(await hashPassword(data.password))
    }
    if (data.nombre) {
      updateFields.push("nombre = ?")
      updateValues.push(data.nombre)
    }
    if (data.apellido_paterno) {
      updateFields.push("apellido_paterno = ?")
      updateValues.push(data.apellido_paterno)
    }
    if (data.apellido_materno !== undefined) {
      updateFields.push("apellido_materno = ?")
      updateValues.push(data.apellido_materno || null)
    }
    if (data.email) {
      updateFields.push("email = ?")
      updateValues.push(data.email)
    }
    if (data.telefono !== undefined) {
      updateFields.push("telefono = ?")
      updateValues.push(data.telefono || null)
    }
    if (data.cedula_profesional !== undefined) {
      updateFields.push("cedula_profesional = ?")
      updateValues.push(data.cedula_profesional || null)
    }
    if (data.especialidad !== undefined) {
      updateFields.push("especialidad = ?")
      updateValues.push(data.especialidad || null)
    }
    if (data.id_rol) {
      updateFields.push("id_rol = ?")
      updateValues.push(data.id_rol)
    }
    if (data.activo !== undefined) {
      updateFields.push("activo = ?")
      updateValues.push(data.activo)
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 })
    }

    // Agregar el ID al final
    updateValues.push(userId)

    // Ejecutar actualización
    await query(
      `
      UPDATE usuario 
      SET ${updateFields.join(", ")}, fecha_modificacion = NOW()
      WHERE id_usuario = ?
    `,
      updateValues,
    )

    // Obtener usuario actualizado
    const updatedUser = await queryOne<PublicUsuario>(
      `
      SELECT ${PUBLIC_USER_SELECT}
      FROM usuario u
      LEFT JOIN rol r ON u.id_rol = r.id_rol
      WHERE u.id_usuario = ?
    `,
      [userId],
    )

    return NextResponse.json(
      {
        success: true,
        message: "Usuario actualizado exitosamente",
        data: updatedUser,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error al actualizar usuario:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE - Eliminar usuario
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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
    if (!verificarPermiso(user.rol, "eliminar_usuario")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const userId = parseInt(id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID de usuario inválido" }, { status: 400 })
    }
    if (user.id_usuario === userId) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 409 })
    }

    // Verificar que el usuario existe
    const existingUser = await queryOne("SELECT id_usuario FROM usuario WHERE id_usuario = ?", [
      userId,
    ])
    if (!existingUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Baja lógica: conserva trazabilidad clínica y relaciones de auditoría.
    await query("UPDATE usuario SET activo = FALSE, fecha_modificacion = NOW() WHERE id_usuario = ?", [userId])

    return NextResponse.json(
      {
        success: true,
        message: "Usuario desactivado exitosamente",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error al eliminar usuario:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
