// app/api/auth/login-paciente/route.ts
// Login de PACIENTE para la app móvil: CURP + PIN.
import { NextResponse, NextRequest } from "next/server"
import { z } from "zod"
import { authenticatePaciente, issueRefreshToken } from "@/lib/auth"
import { checkRateLimit, getClientIp, resetRateLimit } from "@/lib/rate-limit"
import { serialize } from "@/lib/cookies"
import { recordAuthAttempt } from "@/lib/metrics"

const loginPacienteSchema = z.object({
  curp: z.string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/, "CURP inválida")),
  pin: z.string().regex(/^\d{6,12}$/, "El PIN debe contener entre 6 y 12 dígitos"),
}).strict()

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req)
    const userAgent = req.headers.get("user-agent")
    const rateLimitKey = `login-patient:${clientIp}`
    const { allowed, resetIn } = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000)
    if (!allowed) {
      recordAuthAttempt("paciente", false)
      return NextResponse.json(
        { success: false, error: `Demasiados intentos. Intente en ${Math.ceil(resetIn / 1000)} segundos` },
        { status: 429, headers: { "Retry-After": Math.ceil(resetIn / 1000).toString() } },
      )
    }

    const body = await req.json()
    const validation = loginPacienteSchema.safeParse(body)
    if (!validation.success) {
      recordAuthAttempt("paciente", false)
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: validation.error.errors },
        { status: 400 },
      )
    }

    const { curp, pin } = validation.data
    const result = await authenticatePaciente(curp, pin)

    if (!result.success) {
      recordAuthAttempt("paciente", false)
      return NextResponse.json({ success: false, error: result.message || "Autenticación fallida" }, { status: 401 })
    }
    resetRateLimit(rateLimitKey)
    recordAuthAttempt("paciente", true)

    const refreshToken = await issueRefreshToken(
      { subject_type: "paciente", id_paciente: result.user!.id_paciente },
      { ip: clientIp, userAgent },
    )
    const secureCookies = process.env.SECURE_COOKIES === "true" || process.env.NODE_ENV === "production"
    const response = NextResponse.json(
      { success: true, message: "Autenticado exitosamente", token: result.token, refreshToken, user: result.user },
      { status: 200 },
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
    console.error("Error en login-paciente:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}
