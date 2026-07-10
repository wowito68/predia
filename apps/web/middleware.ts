// middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Importar función de verificación JWT
// Nota: No se puede usar verifyToken directamente en middleware por limitaciones de Next.js
// Se usará validación básica

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const origin = request.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  if (pathname.startsWith("/api") && request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders })
  }

  const withCors = (response: NextResponse) => {
    if (pathname.startsWith("/api")) {
      Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value))
    }
    return response
  }

  // Rutas públicas (sin protección)
  const publicRoutes = ["/login", "/", "/api/auth/login", "/api/auth/login-paciente", "/api/auth/logout"]

  if (publicRoutes.some(route => pathname === route)) {
    return withCors(NextResponse.next())
  }

  // Para rutas protegidas de frontend
  if (!pathname.startsWith("/api")) {
    const token = request.cookies.get("auth-token")?.value || request.headers.get("x-token") // localStorage is not available in middleware

    if (!token && !publicRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  // Para rutas API protegidas
  if (pathname.startsWith("/api")) {
    const authHeader = request.headers.get("authorization")

    // Excepciones: auth públicas
    if (["/api/auth/login", "/api/auth/login-paciente", "/api/auth/logout"].includes(pathname)) {
      return NextResponse.next()
    }

    // Verificar que hay token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return withCors(NextResponse.json(
        { error: "No autorizado - token faltante" },
        { status: 401 }
      ))
    }
  }

  return withCors(NextResponse.next())
}

function getCorsHeaders(origin: string | null) {
  const allowedOrigin =
    origin && /^(http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?)$/.test(origin)
      ? origin
      : "http://localhost:8082"

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  }
}

export const config = {
  matcher: [
    // Proteger: todas excepto static assets, PWA files y favicon
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|sw\\.js|workbox-.*|manifest\\.json|public/).*)",
  ],
}
