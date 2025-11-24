// app/api/auth/login/route.ts
import { NextResponse, NextRequest } from "next/server"
import { z } from "zod"
import { authenticateUser, generateToken } from "@/lib/auth"
import { serialize } from "cookie"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

const loginSchema = z.object({
  username: z.string().min(3, "Usuario debe tener al menos 3 caracteres"),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
})

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req)
    const { allowed, remaining, resetIn } = checkRateLimit(clientIp, 5, 15 * 60 * 1000) // 5 intentos cada 15 minutos

    if (!allowed) {
      return NextResponse.json(
        {
          error: `Demasiados intentos. Intente en ${Math.ceil(resetIn / 1000)} segundos`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(resetIn / 1000).toString(),
          },
        }
      )
    }

    const body = await req.json()

    // Validar esquema
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.errors },
        { status: 400 },
      )
    }

    const { username, password } = validation.data

    // Autenticar usuario
    const result = await authenticateUser(username, password)

    if (!result.success) {
      return NextResponse.json({ error: result.message || "Autenticación fallida" }, { status: 401 })
    }

    // Crear respuesta
    const response = NextResponse.json(
      {
        success: true,
        message: "Autenticado exitosamente",
        token: result.token,
        user: result.user,
      },
      { status: 200 },
    )

    // Setear cookie segura (opcional, para redundancia)
    response.headers.append(
      "Set-Cookie",
           serialize("auth-token", result.token || "", {
        httpOnly: false,  // CAMBIAR a false para que el middleware pueda leerlo
        secure: false,     // CAMBIAR a false (sin HTTPS aún)
        sameSite: "lax",   // CAMBIAR de strict a lax
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 días
      }),
    )

    return response
  } catch (error) {
    console.error("Error en login:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
