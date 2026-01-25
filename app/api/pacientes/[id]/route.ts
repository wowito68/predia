// ============================================
// app/api/pacientes/[id]/route.ts
// ============================================
// CORREGIDO para Next.js 15:
// - params es Promise (await requerido)
// - Firmas consistentes en todos los handlers
// - PUT implementado correctamente
// - Validación robusta de tipos

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { query, QueryBuilder, transaction } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import type { Paciente } from "@/types/database"
import { logger } from "@/lib/logger"
import { ApiResponse } from "@/types/api"
import { DynamicRouteContext } from "@/types/route-context"
import { parseIdParam } from "@/lib/validation"

// ============================================
// ESQUEMAS DE VALIDACIÓN
// ============================================

// Esquema para PUT (reemplaza todos los campos)
const putPacienteSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  apellido_paterno: z.string().min(2, "El apellido paterno es requerido"),
  apellido_materno: z.string().nullable().optional(),
  genero: z.enum(["M", "F", "Otro"], {
    errorMap: () => ({ message: "Género debe ser M, F u Otro" }),
  }),
  fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  telefono: z.string().nullable().optional(),
  email: z.string().email("Email inválido").nullable().optional(),
  // Campos Fase 2
  tipo_sangre: z.string().nullable().optional(),
  seguro_medico: z.string().nullable().optional(),
  poliza_seguro: z.string().nullable().optional(),
  contacto_emergencia_nombre: z.string().nullable().optional(),
  contacto_emergencia_telefono: z.string().nullable().optional(),
})

// Esquema para PATCH (actualización parcial)
const patchPacienteSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
  apellido_paterno: z.string().min(2, "El apellido paterno es requerido").optional(),
  apellido_materno: z.string().nullable().optional(),
  genero: z.enum(["M", "F", "Otro"], {
    errorMap: () => ({ message: "Género debe ser M, F u Otro" }),
  }).optional(),
  fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)").optional(),
  telefono: z.string().nullable().optional(),
  email: z.string().email("Email inválido").nullable().optional(),
  // Campos Fase 2
  tipo_sangre: z.string().nullable().optional(),
  seguro_medico: z.string().nullable().optional(),
  poliza_seguro: z.string().nullable().optional(),
  contacto_emergencia_nombre: z.string().nullable().optional(),
  contacto_emergencia_telefono: z.string().nullable().optional(),
})

// Normalizar string vacío a null
const normalizeEmptyString = (value: string | null | undefined): string | null | undefined => {
  return value === "" ? null : value
}

// ============================================
// HELPER: Validar rol admin
// ============================================
const isAdmin = (user: any): boolean => {
  return user?.id_rol === 1 || user?.rol === "Administrador"
}

// ============================================
// GET - Obtener paciente por ID
// ============================================
export const GET = requireAuth(async (request: NextRequest, { params, user }: DynamicRouteContext) => {
  try {
    const { id, error, status } = parseIdParam(params, "id")
    if (error) return NextResponse.json({ error }, { status })

    logger.debug("GET /api/pacientes/[id]", `Obteniendo paciente id=${id}`)

    const paciente = await query<Paciente>(
      "SELECT * FROM paciente WHERE id_paciente = ? AND activo = TRUE",
      [id]
    )

    if (!paciente || paciente.length === 0) {
      return NextResponse.json(
        { success: false, error: "Paciente no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: paciente[0],
    })
  } catch (error) {
    console.error("❌ GET paciente error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener paciente",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
})

// ============================================
// PUT - Reemplazar paciente (todos los campos)
// ============================================
// Requiere TODOS los campos obligatorios
// Campos opcionales no enviados = null
export const PUT = requireAuth(async (request: NextRequest, { params, user }: DynamicRouteContext) => {
  try {
    const { id, error, status } = parseIdParam(params, "id")
    if (error) return NextResponse.json({ error }, { status })

    const body = await request.json()

    // ✅ CORRECCIÓN: Validar que TODOS los campos obligatorios estén presentes
    const validation = putPacienteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Datos inválidos",
          details: validation.error.errors.map(e => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    // Verificar que el paciente existe
    const existing = await query<Paciente>(
      "SELECT id_paciente FROM paciente WHERE id_paciente = ? AND activo = TRUE",
      [id]
    )

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Paciente no encontrado" },
        { status: 404 }
      )
    }

    // ✅ CORRECCIÓN: Normalizar strings vacíos a null
    const data = validation.data
    const updateData: Record<string, any> = {
      nombre: data.nombre,
      apellido_paterno: data.apellido_paterno,
      apellido_materno: normalizeEmptyString(data.apellido_materno),
      genero: data.genero,
      fecha_nacimiento: data.fecha_nacimiento,
      telefono: normalizeEmptyString(data.telefono),
      email: normalizeEmptyString(data.email),
      // Fase 2
      tipo_sangre: normalizeEmptyString(data.tipo_sangre),
      seguro_medico: normalizeEmptyString(data.seguro_medico),
      poliza_seguro: normalizeEmptyString(data.poliza_seguro),
      contacto_emergencia_nombre: normalizeEmptyString(data.contacto_emergencia_nombre),
      contacto_emergencia_telefono: normalizeEmptyString(data.contacto_emergencia_telefono),
    }

    const { sql, params: queryParams } = QueryBuilder.update(
      "paciente",
      updateData,
      "id_paciente = ?",
      [id]
    )

    await query(sql, queryParams)

    // Obtener paciente actualizado
    const updated = await query<Paciente>(
      "SELECT * FROM paciente WHERE id_paciente = ?",
      [id]
    )

    return NextResponse.json({
      success: true,
      message: "Paciente reemplazado exitosamente",
      data: updated[0],
    })
  } catch (error) {
    console.error("❌ PUT paciente error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar paciente",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
})

// ============================================
// PATCH - Actualizar parcialmente
// ============================================
// Solo actualiza los campos enviados
// Otros campos mantienen su valor
export const PATCH = requireAuth(async (request: NextRequest, { params, user }: DynamicRouteContext) => {
  try {
    const { id, error, status } = parseIdParam(params, "id")
    if (error) return NextResponse.json({ error }, { status })

    const body = await request.json()

    // ✅ CORRECCIÓN: Usar schema de PATCH (todos opcionales)
    const validation = patchPacienteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Datos inválidos",
          details: validation.error.errors.map(e => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    // Verificar que el paciente existe
    const existing = await query<Paciente>(
      "SELECT id_paciente FROM paciente WHERE id_paciente = ? AND activo = TRUE",
      [id]
    )

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Paciente no encontrado" },
        { status: 404 }
      )
    }

    const data = validation.data

    // ✅ CORRECCIÓN: Solo incluir campos enviados, normalizar vacíos
    const updateData: Record<string, any> = {}
    if (data.nombre !== undefined) updateData.nombre = data.nombre
    if (data.apellido_paterno !== undefined) updateData.apellido_paterno = data.apellido_paterno
    if (data.apellido_materno !== undefined) updateData.apellido_materno = normalizeEmptyString(data.apellido_materno)
    if (data.genero !== undefined) updateData.genero = data.genero
    if (data.fecha_nacimiento !== undefined) updateData.fecha_nacimiento = data.fecha_nacimiento
    if (data.telefono !== undefined) updateData.telefono = normalizeEmptyString(data.telefono)
    if (data.email !== undefined) updateData.email = normalizeEmptyString(data.email)
    // Fase 2
    if (data.tipo_sangre !== undefined) updateData.tipo_sangre = normalizeEmptyString(data.tipo_sangre)
    if (data.seguro_medico !== undefined) updateData.seguro_medico = normalizeEmptyString(data.seguro_medico)
    if (data.poliza_seguro !== undefined) updateData.poliza_seguro = normalizeEmptyString(data.poliza_seguro)
    if (data.contacto_emergencia_nombre !== undefined) updateData.contacto_emergencia_nombre = normalizeEmptyString(data.contacto_emergencia_nombre)
    if (data.contacto_emergencia_telefono !== undefined) updateData.contacto_emergencia_telefono = normalizeEmptyString(data.contacto_emergencia_telefono)

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No hay campos para actualizar" },
        { status: 400 }
      )
    }

    const { sql, params: queryParams } = QueryBuilder.update(
      "paciente",
      updateData,
      "id_paciente = ?",
      [id]
    )

    await query(sql, queryParams)

    // Obtener paciente actualizado
    const updated = await query<Paciente>(
      "SELECT * FROM paciente WHERE id_paciente = ?",
      [id]
    )

    return NextResponse.json({
      success: true,
      message: "Paciente actualizado exitosamente",
      data: updated[0],
    })
  } catch (error) {
    console.error("❌ PATCH paciente error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar paciente",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
})

// ============================================
// DELETE - Hard delete con cascada
// ============================================
export const DELETE = requireAuth(async (request: NextRequest, { params, user }: DynamicRouteContext) => {
  try {
    const { id, error, status } = parseIdParam(params, "id")
    if (error) return NextResponse.json({ error }, { status })

    // Verificar que el paciente existe
    const pacienteRows = await query<{ id_paciente: number; cedula: string }>(
      "SELECT id_paciente, cedula FROM paciente WHERE id_paciente = ?",
      [id]
    )

    if (!pacienteRows || pacienteRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Paciente no encontrado",
          code: "NOT_FOUND",
        },
        { status: 404 }
      )
    }

    const paciente = pacienteRows[0]

    // ✅ TRANSACCIÓN: Usar transaction() para eliminar en cascada
    // Orden correcto: hijos → padre
    const deletedRecords = await transaction(async (connection) => {
      const records: Record<string, number> = {
        predicciones: 0,
        historiales_clinicos: 0,
        mediciones_antropometricas: 0,
        estudios_laboratorio: 0,
        paciente: 0,
      }

      try {
        // 1. Eliminar predicciones (pueden referenciar estudios/mediciones, pero con cascada está ok)
        const [predictionsResult] = await connection.execute(
          "DELETE FROM prediccion WHERE id_paciente = ?",
          [id]
        ) as any

        // ✅ CORRECCIÓN: Validar que affectedRows existe
        records.predicciones = typeof predictionsResult?.affectedRows === "number" ? predictionsResult.affectedRows : 0
        console.log(`✅ Predicciones eliminadas: ${records.predicciones}`)

        // 2. Eliminar historiales clínicos
        const [historialResult] = await connection.execute(
          "DELETE FROM historial_clinico WHERE id_paciente = ?",
          [id]
        ) as any
        records.historiales_clinicos = typeof historialResult?.affectedRows === "number" ? historialResult.affectedRows : 0
        console.log(`✅ Historiales clínicos eliminados: ${records.historiales_clinicos}`)

        // 3. Eliminar mediciones antropométricas
        const [medicionesResult] = await connection.execute(
          "DELETE FROM medicion_antropometrica WHERE id_paciente = ?",
          [id]
        ) as any
        records.mediciones_antropometricas = typeof medicionesResult?.affectedRows === "number" ? medicionesResult.affectedRows : 0
        console.log(`✅ Mediciones antropométricas eliminadas: ${records.mediciones_antropometricas}`)

        // 4. Eliminar estudios de laboratorio
        const [estudiosResult] = await connection.execute(
          "DELETE FROM estudio_laboratorio WHERE id_paciente = ?",
          [id]
        ) as any
        records.estudios_laboratorio = typeof estudiosResult?.affectedRows === "number" ? estudiosResult.affectedRows : 0
        console.log(`✅ Estudios de laboratorio eliminados: ${records.estudios_laboratorio}`)

        // 5. Finalmente, eliminar el paciente
        const [pacienteResult] = await connection.execute(
          "DELETE FROM paciente WHERE id_paciente = ?",
          [id]
        ) as any
        records.paciente = typeof pacienteResult?.affectedRows === "number" ? pacienteResult.affectedRows : 0
        console.log(`✅ Paciente eliminado: ${records.paciente}`)

        return records
      } catch (txError) {
        console.error("❌ Error durante transacción:", txError)
        throw txError
      }
    })

    const totalDeleted = Object.values(deletedRecords).reduce((a, b) => a + b, 0)

    console.log(`✅ Eliminación completa - ID: ${id}, Cédula: ${paciente.cedula}, Total: ${totalDeleted}`)

    return NextResponse.json(
      {
        success: true,
        message: "Paciente y todos sus datos asociados eliminados permanentemente",
        data: {
          deletedId: id,
          cedula: paciente.cedula,
          registrosEliminados: deletedRecords,
          totalRecordsDeleted: totalDeleted,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("❌ Error en DELETE paciente:", error)

    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    const errorCode = (error as any)?.code

    // Manejar errores específicos
    if (errorCode === "ER_NO_REFERENCED_KEY_CONSTRAINT" || errorMessage.includes("FOREIGN KEY")) {
      return NextResponse.json(
        {
          success: false,
          error: "Conflicto de integridad: no se puede eliminar",
          code: "FOREIGN_KEY_CONSTRAINT_ERROR",
          details: "Hay registros relacionados que aún se encuentran en la base de datos",
        },
        { status: 409 }
      )
    }

    if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
      return NextResponse.json(
        {
          success: false,
          error: "La operación tardó demasiado",
          code: "TIMEOUT_ERROR",
          details: "Intenta de nuevo o reduce la cantidad de datos",
        },
        { status: 503 }
      )
    }

    // Error genérico
    return NextResponse.json(
      {
        success: false,
        error: "Error al eliminar paciente",
        code: "DELETE_ERROR",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    )
  }
})
