import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { serialize } from "@/lib/cookies"
import { revokeRefreshToken } from "@/lib/auth"

const refreshTokenSchema = z.string().min(32).max(256)

export async function POST(request: NextRequest) {
  let bodyRefreshToken: string | undefined
  try {
    const body = await request.json()
    bodyRefreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : undefined
  } catch {
    bodyRefreshToken = undefined
  }
  const refreshToken = bodyRefreshToken || request.cookies.get("refresh-token")?.value
  const validation = refreshTokenSchema.safeParse(refreshToken)
  if (validation.success) await revokeRefreshToken(validation.data)

  const response = NextResponse.json({ success: true, message: "Sesión cerrada" })
  const secureCookies = process.env.SECURE_COOKIES === "true" || process.env.NODE_ENV === "production"

  response.headers.append(
    "Set-Cookie",
    serialize("auth-token", "", {
      httpOnly: true,
      secure: secureCookies,
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    }),
  )
  response.headers.append(
    "Set-Cookie",
    serialize("refresh-token", "", {
      httpOnly: true,
      secure: secureCookies,
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 0,
    }),
  )

  return response
}
