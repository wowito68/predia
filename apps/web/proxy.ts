// proxy.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import jwt from "jsonwebtoken"

function hasValidToken(token: string | undefined): boolean {
  const secret = process.env.JWT_SECRET
  if (!token || !secret || Buffer.byteLength(secret, "utf8") < 32) return false

  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      issuer: process.env.JWT_ISSUER || "predia-api",
      audience: process.env.JWT_AUDIENCE || "predia-clients",
    })
    if (!payload || typeof payload !== "object") return false

    if (payload.tipo === "staff") {
      return Number.isInteger(payload.id_usuario)
        && typeof payload.username === "string"
        && typeof payload.rol === "string"
    }
    if (payload.tipo === "paciente") {
      return Number.isInteger(payload.id_paciente) && payload.rol === "PACIENTE"
    }
    return false
  } catch {
    return false
  }
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const origin = request.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  if (pathname.startsWith("/api") && request.method === "OPTIONS") {
    if (origin && !corsHeaders["Access-Control-Allow-Origin"]) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 })
    }
    return new NextResponse(null, { status: 204, headers: corsHeaders })
  }

  const withCors = (response: NextResponse) => {
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()")
    response.headers.set("X-PREDIA-Instance", process.env.PREDIA_INSTANCE_ID || process.env.HOSTNAME || "local-dev")
    if (pathname.startsWith("/api")) {
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    }
    return response
  }

  // Rutas públicas (sin protección)
  const publicRoutes = [
    "/login",
    "/",
    "/api/auth/login",
    "/api/auth/login-paciente",
    "/api/auth/refresh",
    "/api/auth/logout",
    "/api/health",
    "/api/ready",
    "/api/metrics",
    "/api/ping",
  ]

  if (publicRoutes.some(route => pathname === route)) {
    return withCors(NextResponse.next())
  }

  // Para rutas protegidas de frontend
  if (!pathname.startsWith("/api")) {
    const token = request.cookies.get("auth-token")?.value || request.headers.get("x-token") || undefined

    if (!hasValidToken(token) && !publicRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  // Para rutas API protegidas
  if (pathname.startsWith("/api")) {
    const authHeader = request.headers.get("authorization")

    // Excepciones: auth públicas
    if (publicRoutes.includes(pathname)) {
      return withCors(NextResponse.next())
    }

    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined
    if (!hasValidToken(bearerToken)) {
      return withCors(NextResponse.json(
        { error: "No autorizado - token inválido o faltante" },
        { status: 401 }
      ))
    }
  }

  return withCors(NextResponse.next())
}

function getCorsHeaders(origin: string | null) {
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  const localOrigin = process.env.NODE_ENV !== "production"
    && origin
    && /^(http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?)$/.test(origin)
  const allowedOrigin = origin && (configured.includes(origin) || localOrigin) ? origin : null

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  }
  if (allowedOrigin) headers["Access-Control-Allow-Origin"] = allowedOrigin
  return headers
}

export const config = {
  matcher: [
    // Proteger: todas excepto static assets, PWA files y favicon
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|sw\\.js|workbox-.*|manifest\\.json|public/).*)",
  ],
}
