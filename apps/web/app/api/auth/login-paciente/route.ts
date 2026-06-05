// app/api/auth/login-paciente/route.ts
// Login de PACIENTE para la app móvil: CURP + PIN.
import { NextResponse, NextRequest } from "next/server"
import { z } from "zod"
import { authenticatePaciente } from "@/lib/auth"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

const loginPacienteSchema = z.object({
  curp: z.string().trim().min(8, "CURP inválido").max(18).transform((v) => v.toUpperCase()),
  pin: z.string().min(4, "El PIN debe tener al menos 4 dígitos").max(12),
})

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req)
    const { allowed, resetIn } = checkRateLimit(clientIp, 5, 15 * 60 * 1000)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: `Demasiados intentos. Intente en ${Math.ceil(resetIn / 1000)} segundos` },
        { status: 429, headers: { "Retry-After": Math.ceil(resetIn / 1000).toString() } },
      )
    }

    const body = await req.json()
    const validation = loginPacienteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: validation.error.errors },
        { status: 400 },
      )
    }

    const { curp, pin } = validation.data
    const result = await authenticatePaciente(curp, pin)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message || "Autenticación fallida" }, { status: 401 })
    }

    return NextResponse.json(
      { success: true, message: "Autenticado exitosamente", token: result.token, user: result.user },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error en login-paciente:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}
