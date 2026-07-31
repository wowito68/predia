// app/api/auth/login/route.ts
import { NextResponse, NextRequest } from "next/server"
import { z } from "zod"
import { authenticateUser, issueRefreshToken } from "@/lib/auth"
import { serialize } from "cookie"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { recordAuthAttempt } from "@/lib/metrics"

const loginSchema = z.object({
  username: z.string().min(3, "Usuario debe tener al menos 3 caracteres"),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
})

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req)
    const userAgent = req.headers.get("user-agent")
    const { allowed, remaining, resetIn } = checkRateLimit(clientIp, 5, 15 * 60 * 1000) // 5 intentos cada 15 minutos
    if (!allowed) {
      recordAuthAttempt("usuario", false)
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
      recordAuthAttempt("usuario", false)
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.errors },
        { status: 400 },
      )
    }

    const { username, password } = validation.data

    // Autenticar usuario
    const result = await authenticateUser(username, password)

    if (!result.success) {
      recordAuthAttempt("usuario", false)
      return NextResponse.json({ error: result.message || "Autenticación fallida" }, { status: 401 })
    }
    recordAuthAttempt("usuario", true)

    const refreshToken = await issueRefreshToken(
      { subject_type: "usuario", id_usuario: result.user!.id_usuario },
      { ip: clientIp, userAgent },
    )
    const secureCookies = process.env.SECURE_COOKIES === "true" || process.env.NODE_ENV === "production"

    // Crear respuesta
    const response = NextResponse.json(
      {
        success: true,
        message: "Autenticado exitosamente",
        token: result.token,
        refreshToken,
        user: result.user,
      },
      { status: 200 },
    )

    // Setear cookie segura (opcional, para redundancia)
    response.headers.append(
      "Set-Cookie",
      serialize("auth-token", result.token || "", {
        httpOnly: true,
        secure: secureCookies,
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      }),
    )
    response.headers.append(
      "Set-Cookie",
      serialize("refresh-token", refreshToken, {
        httpOnly: true,
        secure: secureCookies,
        sameSite: "lax",
        path: "/api/auth",
        maxAge: 7 * 24 * 60 * 60,
      }),
    )

    return response
  } catch (error) {
    console.error("Error en login:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
