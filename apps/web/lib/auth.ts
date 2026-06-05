// lib/auth.ts
// Utilidades de autenticación, JWT y bcrypt

import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { NextRequest } from "next/server"
import { query, queryOne } from "./db"
import type { Usuario } from "@/types/database"

// Fallback seguro temporal para entornos de desarrollo si falta JWT_SECRET en .env
const JWT_SECRET: string = process.env.JWT_SECRET || "SUPER_SECRET_AND_SECURE_KEY_FOR_TESTING_123456789"
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "7d"

if (!process.env.JWT_SECRET) {
  console.warn("⚠️ ADVERTENCIA: JWT_SECRET no configurado en .env. Se está utilizando una clave temporal insegura. NO UTILIZAR EN PRODUCCIÓN.")
}
if (!process.env.JWT_EXPIRES_IN) {
  console.warn("⚠️ ADVERTENCIA: JWT_EXPIRES_IN no configurado en .env. Usando 7d por defecto.")
}

// Tipos
export interface JWTPayload {
  id_usuario: number
  username: string
  email: string
  rol: string
  nombre_completo: string
}

export interface AuthResult {
  success: boolean
  user?: JWTPayload
  token?: string
  message?: string
}

// Hash de contraseña
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

// Verificar contraseña
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Generar JWT
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: JWT_EXPIRES_IN as string,
  } as any)
}

// Verificar JWT
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET as string) as JWTPayload
  } catch (error) {
    console.error("Token verification failed:", error)
    return null
  }
}

// Autenticar usuario
export async function authenticateUser(username: string, password: string): Promise<AuthResult> {
  try {
    // Buscar usuario con rol
    const user = await queryOne<Usuario & { nombre_rol: string }>(
      `
      SELECT u.*, r.nombre_rol 
      FROM usuario u
      INNER JOIN rol r ON u.id_rol = r.id_rol
      WHERE u.username = ? AND u.activo = TRUE
    `,
      [username],
    )

    if (!user) {
      return {
        success: false,
        message: "Usuario no encontrado",
      }
    }

    // Verificar contraseña
    const isValid = await verifyPassword(password, user.password_hash)
    if (!isValid) {
      return {
        success: false,
        message: "Contraseña incorrecta",
      }
    }

    // Actualizar último acceso
    await query("UPDATE usuario SET ultimo_acceso = NOW() WHERE id_usuario = ?", [user.id_usuario])

    // Crear payload del token
    const payload: JWTPayload = {
      id_usuario: user.id_usuario,
      username: user.username,
      email: user.email,
      rol: user.nombre_rol,
      nombre_completo: `${user.nombre} ${user.apellido_paterno}`,
    }

    // Generar token
    const token = generateToken(payload)

    return {
      success: true,
      user: payload,
      token,
    }
  } catch (error) {
    console.error("Authentication error:", error)
    return {
      success: false,
      message: "Error al autenticar usuario",
    }
  }
}

// Obtener usuario desde el request
export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.substring(7)
    return verifyToken(token)
  } catch (error) {
    console.error("Error getting user from request:", error)
    return null
  }
}

// Middleware de autenticación para API routes
export function requireAuth(
  handler: (request: NextRequest, context: any) => Promise<Response>
) {
  return async (request: NextRequest, context: any): Promise<Response> => {
    const user = getUserFromRequest(request)

    if (!user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    // En Next.js 15, params es una Promise que debe ser awaited
    const resolvedParams = context?.params ? await Promise.resolve(context.params) : undefined

    return handler(request, { params: resolvedParams, user })
  }
}

// Middleware para verificar rol
export function requireRole(roles: string[]) {
  return (handler: (request: NextRequest, context: { params?: any; user: JWTPayload }) => Promise<Response>) => {
    return async (request: NextRequest, context: any): Promise<Response> => {
      const user = getUserFromRequest(request)

      if (!user) {
        return new Response(JSON.stringify({ error: "No autorizado" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      }

      if (!roles.includes(user.rol)) {
        return new Response(JSON.stringify({ error: "Acceso denegado - Rol insuficiente" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      }

      // En Next.js 15, params es una Promise que debe ser awaited
      const resolvedParams = context?.params ? await Promise.resolve(context.params) : undefined

      return handler(request, { params: resolvedParams, user })
    }
  }
}

// Crear usuario (para registro)
export async function createUser(data: {
  username: string
  password: string
  email: string
  nombre: string
  apellido_paterno: string
  apellido_materno?: string
  id_rol: number
  cedula_profesional?: string
  especialidad?: string
}): Promise<{ success: boolean; id_usuario?: number; message?: string }> {
  try {
    // Verificar si el usuario ya existe
    const existingUser = await queryOne("SELECT id_usuario FROM usuario WHERE username = ? OR email = ?", [
      data.username,
      data.email,
    ])

    if (existingUser) {
      return {
        success: false,
        message: "El usuario o email ya existe",
      }
    }

    // Hash de la contraseña
    const passwordHash = await hashPassword(data.password)

    // Insertar usuario
    const result = await query<any>(
      `
      INSERT INTO usuario (
        username, password_hash, email, nombre, apellido_paterno, 
        apellido_materno, id_rol, cedula_profesional, especialidad
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        data.username,
        passwordHash,
        data.email,
        data.nombre,
        data.apellido_paterno,
        data.apellido_materno || null,
        data.id_rol,
        data.cedula_profesional || null,
        data.especialidad || null,
      ],
    )

    return {
      success: true,
      id_usuario: (result as any).insertId,
    }
  } catch (error) {
    console.error("Create user error:", error)
    return {
      success: false,
      message: "Error al crear usuario",
    }
  }
}

/**
 * Verifica si un usuario tiene permisos para realizar una acción
 * Basado en su rol (Administrador, Médico, Enfermero)
 */
export function verificarPermiso(rol: string, accion: string): boolean {
  const permisos: Record<string, string[]> = {
    Administrador: [
      "crear_usuario",
      "editar_usuario",
      "eliminar_usuario",
      "listar_usuarios",
      "crear_paciente",
      "editar_paciente",
      "eliminar_paciente",
      "listar_pacientes",
      "crear_prediccion",
      "ver_prediccion",
      "ver_dashboard",
      "exportar_datos",
      "ver_auditoría",
    ],
    Médico: [
      "crear_paciente",
      "editar_paciente",
      "listar_pacientes",
      "crear_prediccion",
      "ver_prediccion",
      "ver_dashboard",
      "exportar_datos",
    ],
    Enfermero: [
      "listar_pacientes",
      "ver_prediccion",
      "ver_dashboard", // Solo lectura
    ],
  }

  const rolesPermitidos = permisos[rol] || []
  return rolesPermitidos.includes(accion)
}

/**
 * Middleware para verificar permisos
 * Uso: aplicar en endpoints que requieren permisos específicos
 */
export function requirePermission(
  requiredPermission: string,
) {
  return (handler: (req: NextRequest, context: { params?: any; user: JWTPayload }) => Promise<Response>) => {
    return requireAuth(async (req: NextRequest, context: { params?: any; user: JWTPayload }) => {
      if (!verificarPermiso(context.user.rol, requiredPermission)) {
        return new Response(
          JSON.stringify({
            error: "Permiso denegado",
            message: `Se requiere permiso: ${requiredPermission}`,
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      return handler(req, context)
    })
  }
}

/**
 * Registra acciones de auditoria en la base de datos
 */
export async function registrarAuditoria(
  id_usuario: number,
  accion: string,
  detalles: string,
  resultado: "exitoso" | "fallido",
): Promise<void> {
  try {
    await query(
      `
      INSERT INTO auditoria (
        id_usuario, accion, detalles, resultado, fecha_registro
      ) VALUES (?, ?, ?, ?, NOW())
    `,
      [id_usuario, accion, detalles, resultado],
    )
  } catch (error) {
    // Silenciar error si la tabla no existe - es opcional para auditoría
    if ((error as any)?.code !== "ER_NO_SUCH_TABLE") {
      console.error("Error al registrar auditoria:", error)
    }
  }
}

// ============================================
// AUTENTICACIÓN DE PACIENTE (app móvil — login CURP + PIN)
// ============================================
// Los pacientes NO son filas en la tabla `usuario`; se autentican contra
// la tabla `paciente` usando su CURP y un PIN (hash bcrypt en `pin_hash`).
// El token resultante lleva `tipo: "paciente"` para distinguirlo del de usuario.

export interface PacienteJWTPayload {
  tipo: "paciente"
  id_paciente: number
  curp: string
  nombre_completo: string
  rol: "PACIENTE"
}

export interface PacienteAuthResult {
  success: boolean
  token?: string
  user?: {
    id: number
    id_paciente: number
    nombre: string
    email: string
    rol: "PACIENTE"
    curp: string
  }
  message?: string
}

// Generar JWT para un paciente
export function generatePacienteToken(payload: PacienteJWTPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: JWT_EXPIRES_IN as string,
  } as any)
}

// Autenticar paciente por CURP + PIN
export async function authenticatePaciente(curp: string, pin: string): Promise<PacienteAuthResult> {
  try {
    const paciente = await queryOne<{
      id_paciente: number
      curp: string | null
      pin_hash: string | null
      nombre: string
      apellido_paterno: string
      apellido_materno: string | null
    }>(
      `SELECT id_paciente, curp, pin_hash, nombre, apellido_paterno, apellido_materno
       FROM paciente
       WHERE curp = ? AND activo = TRUE`,
      [curp],
    )

    if (!paciente || !paciente.pin_hash) {
      return { success: false, message: "CURP o PIN incorrectos" }
    }

    const isValid = await verifyPassword(pin, paciente.pin_hash)
    if (!isValid) {
      return { success: false, message: "CURP o PIN incorrectos" }
    }

    const nombre_completo = [paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno]
      .filter(Boolean)
      .join(" ")

    const payload: PacienteJWTPayload = {
      tipo: "paciente",
      id_paciente: paciente.id_paciente,
      curp: paciente.curp as string,
      nombre_completo,
      rol: "PACIENTE",
    }

    return {
      success: true,
      token: generatePacienteToken(payload),
      user: {
        id: paciente.id_paciente,
        id_paciente: paciente.id_paciente,
        nombre: nombre_completo,
        email: "",
        rol: "PACIENTE",
        curp: paciente.curp as string,
      },
    }
  } catch (error) {
    console.error("Patient authentication error:", error)
    return { success: false, message: "Error al autenticar paciente" }
  }
}

// Decodifica un token que puede ser de usuario o de paciente
export function getAnyTokenFromRequest(
  request: NextRequest,
): JWTPayload | PacienteJWTPayload | null {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null
  try {
    return jwt.verify(authHeader.substring(7), JWT_SECRET as string) as
      | JWTPayload
      | PacienteJWTPayload
  } catch {
    return null
  }
}

export function isPacienteToken(
  token: JWTPayload | PacienteJWTPayload,
): token is PacienteJWTPayload {
  return (token as PacienteJWTPayload).tipo === "paciente"
}

// Middleware para rutas /pacientes/[id]/* accesibles por:
//  - el propio paciente (token de paciente cuyo id_paciente === [id])
//  - cualquier usuario del personal (médico/admin/enfermero)
export function requirePacienteSelf(
  handler: (
    request: NextRequest,
    context: { params: any; auth: JWTPayload | PacienteJWTPayload },
  ) => Promise<Response>,
) {
  return async (request: NextRequest, context: any): Promise<Response> => {
    const decoded = getAnyTokenFromRequest(request)
    if (!decoded) {
      return new Response(JSON.stringify({ success: false, error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const resolvedParams = context?.params ? await Promise.resolve(context.params) : undefined
    const routeId = parseInt(resolvedParams?.id, 10)

    if (isPacienteToken(decoded) && decoded.id_paciente !== routeId) {
      return new Response(JSON.stringify({ success: false, error: "Acceso denegado" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    return handler(request, { params: resolvedParams, auth: decoded })
  }
}
