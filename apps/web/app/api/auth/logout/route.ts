import { NextRequest, NextResponse } from "next/server"
import { serialize } from "cookie"
import { revokeRefreshToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  let bodyRefreshToken: string | undefined
  try {
    const body = await request.json()
    bodyRefreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : undefined
  } catch {
    bodyRefreshToken = undefined
  }
  await revokeRefreshToken(bodyRefreshToken || request.cookies.get("refresh-token")?.value)

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
