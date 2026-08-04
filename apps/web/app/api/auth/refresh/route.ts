import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { serialize } from "@/lib/cookies"
import { refreshSession } from "@/lib/auth"
import { checkRateLimit, getClientIp, resetRateLimit } from "@/lib/rate-limit"

const refreshTokenSchema = z.string().min(32).max(256)

export async function POST(request: NextRequest) {
  try {
    let bodyRefreshToken: string | undefined
    try {
      const body = await request.json()
      bodyRefreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : undefined
    } catch {
      bodyRefreshToken = undefined
    }

    const refreshToken = bodyRefreshToken || request.cookies.get("refresh-token")?.value
    const validatedToken = refreshTokenSchema.safeParse(refreshToken)
    if (!validatedToken.success) {
      return NextResponse.json({ success: false, error: "Refresh token faltante" }, { status: 401 })
    }

    const clientIp = getClientIp(request)
    const rateLimitKey = `refresh:${clientIp}`
    const { allowed, resetIn } = checkRateLimit(rateLimitKey, 30, 15 * 60 * 1000)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Demasiados intentos de renovación" },
        { status: 429, headers: { "Retry-After": Math.ceil(resetIn / 1000).toString() } },
      )
    }

    const result = await refreshSession(validatedToken.data, {
      ip: clientIp,
      userAgent: request.headers.get("user-agent"),
    })

    if (!result.success || !result.token || !result.refreshToken) {
      return NextResponse.json({ success: false, error: result.message || "Refresh token inválido" }, { status: 401 })
    }
    resetRateLimit(rateLimitKey)

    const secureCookies = process.env.SECURE_COOKIES === "true" || process.env.NODE_ENV === "production"
    const response = NextResponse.json({
      success: true,
      token: result.token,
      refreshToken: result.refreshToken,
      user: result.user,
    })
    response.headers.append(
      "Set-Cookie",
      serialize("auth-token", result.token, {
        httpOnly: true,
        secure: secureCookies,
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      }),
    )
    response.headers.append(
      "Set-Cookie",
      serialize("refresh-token", result.refreshToken, {
        httpOnly: true,
        secure: secureCookies,
        sameSite: "lax",
        path: "/api/auth",
        maxAge: 7 * 24 * 60 * 60,
      }),
    )
    return response
  } catch (error) {
    console.error("Error en refresh:", error)
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 })
  }
}
