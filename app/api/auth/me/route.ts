// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { queryOne } from "@/lib/db"
import type { Usuario } from "@/types/database"

export const GET = async (request: NextRequest) => {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 })
    }

    // Obtener datos del usuario
    const user = await queryOne<Usuario & { nombre_rol: string }>(
      `SELECT u.*, r.nombre_rol 
       FROM usuario u
       INNER JOIN rol r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = ? AND u.activo = TRUE`,
      [payload.id_usuario],
    )

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id_usuario: user.id_usuario,
        username: user.username,
        email: user.email,
        rol: user.nombre_rol,
        nombre_completo: `${user.nombre} ${user.apellido_paterno}`,
        cedula_profesional: user.cedula_profesional,
        especialidad: user.especialidad,
      },
    })
  } catch (error) {
    console.error("Error en /auth/me:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
