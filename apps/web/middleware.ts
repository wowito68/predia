// middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Importar función de verificación JWT
// Nota: No se puede usar verifyToken directamente en middleware por limitaciones de Next.js
// Se usará validación básica

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rutas públicas (sin protección)
  const publicRoutes = ["/login", "/", "/api/auth/login", "/api/auth/login-paciente", "/api/auth/logout"]

  if (publicRoutes.some(route => pathname === route)) {
    return NextResponse.next()
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
      return NextResponse.json(
        { error: "No autorizado - token faltante" },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Proteger: todas excepto static assets, PWA files y favicon
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|sw\\.js|workbox-.*|manifest\\.json|public/).*)",
  ],
}

