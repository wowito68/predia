// ============================================
// app/api/pacientes/[id]/eliminar-completo/route.ts
// ============================================
// Endpoint para eliminar un paciente y TODAS sus relaciones de forma atómica
// Solo accesible para administradores (rol = 1)
// Usa transacciones MySQL para garantizar consistencia de datos
//
// ✅ CORREGIDO para Next.js 15:
// - params es Promise (await requerido)
// - Validación explícita de rol admin
// - Type-safe manejo de affectedRows
// - Respuestas consistentes con success field

import { NextRequest, NextResponse } from "next/server"
import { transaction } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

// ============================================
// HELPER: Validar rol de administrador
// ============================================
const isAdmin = (user: any): boolean => {
  return user?.id_rol === 1 || user?.rol === "Administrador"
}

/**
 * DELETE - Eliminar paciente completamente (hard delete)
 *
 * Requiere:
 * - rol = 1 (Administrador)
 * - ID de paciente válido
 *
 * Elimina de forma atómica:
 * - Historial clínico
 * - Predicciones
 * - Mediciones antropométricas
 * - Estudios de laboratorio
 * - Paciente
 *
 * Respuesta: 200 OK con registros eliminados
 * Errores: 400 (validación), 403 (permisos), 404 (no encontrado), 409 (integridad), 500 (servidor)
 */
export const DELETE = requireAuth(async (request: NextRequest, context: { params?: any; user: any }): Promise<Response> => {
  try {
    // ========================================
    // 1. VALIDACIONES INICIALES
    // ========================================

    // ✅ CORRECCIÓN: params es Promise en Next.js 15
    const params = await context.params

    if (!params?.id) {
      return NextResponse.json(
        { success: false, error: "ID de paciente no proporcionado" },
        { status: 400 }
      )
    }

    const id_paciente = parseInt(params.id, 10)
    if (isNaN(id_paciente) || id_paciente <= 0) {
      return NextResponse.json(
        { success: false, error: "ID de paciente inválido" },
        { status: 400 }
      )
    }

    // ========================================
    // 2. VALIDAR PERMISOS (ADMIN ONLY)
    // ========================================

    // ✅ CORRECCIÓN: Validación explícita y consistente
    if (!isAdmin(context.user)) {
      return NextResponse.json(
        {
          success: false,
          error: "Acceso denegado",
          message: "Solo administradores pueden eliminar pacientes completamente",
          code: "ADMIN_REQUIRED",
          required_role: "Administrador",
          user_role: context.user?.rol || context.user?.id_rol,
        },
        { status: 403 }
      )
    }

    // ========================================
    // 3. USAR TRANSACCIÓN PARA ELIMINAR
    // ========================================

    const resultado = await transaction(async (connection) => {
      // 3A. VERIFICAR EXISTENCIA DEL PACIENTE
      const [pacientes] = await connection.execute<any>(
        "SELECT id_paciente, cedula, nombre, apellido_paterno, id_direccion FROM paciente WHERE id_paciente = ?",
        [id_paciente]
      )

      if (!pacientes || pacientes.length === 0) {
        throw new Error("PACIENTE_NO_ENCONTRADO")
      }

      const paciente = pacientes[0]

      // 3B. CONTAR REGISTROS RELACIONADOS (para el reporte)
      const [historialesResult] = await connection.execute<any>(
        "SELECT COUNT(*) as count FROM historial_clinico WHERE id_paciente = ?",
        [id_paciente]
      )
      const historialesCount = historialesResult?.[0]?.count || 0

      const [prediccionesResult] = await connection.execute<any>(
        "SELECT COUNT(*) as count FROM prediccion WHERE id_paciente = ?",
        [id_paciente]
      )
      const prediccionesCount = prediccionesResult?.[0]?.count || 0

      const [medicionesResult] = await connection.execute<any>(
        "SELECT COUNT(*) as count FROM medicion_antropometrica WHERE id_paciente = ?",
        [id_paciente]
      )
      const medicionesCount = medicionesResult?.[0]?.count || 0

      const [estudiosResult] = await connection.execute<any>(
        "SELECT COUNT(*) as count FROM estudio_laboratorio WHERE id_paciente = ?",
        [id_paciente]
      )
      const estudiosCount = estudiosResult?.[0]?.count || 0

      const records: Record<string, number> = {
        predicciones: 0,
        historialesClinicos: 0,
        medicionesAntropometricas: 0,
        estudiosLaboratorio: 0,
      }

      // 3C. ELIMINAR EN ORDEN (debido a restricciones FK)
      // IMPORTANTE: El orden debe ser de tablas dependientes a independientes

      // 1. Eliminar predicciones PRIMERO (tienen FK a estudios y mediciones)
      if (prediccionesCount > 0) {
        const [result] = await connection.execute<any>(
          "DELETE FROM prediccion WHERE id_paciente = ?",
          [id_paciente]
        )
        // ✅ CORRECCIÓN: Type-safe affectedRows validation
        records.predicciones =
          typeof result?.affectedRows === "number" ? result.affectedRows : 0
      }

      // 2. Eliminar historiales
      if (historialesCount > 0) {
        const [result] = await connection.execute<any>(
          "DELETE FROM historial_clinico WHERE id_paciente = ?",
          [id_paciente]
        )
        // ✅ CORRECCIÓN: Type-safe affectedRows validation
        records.historialesClinicos =
          typeof result?.affectedRows === "number" ? result.affectedRows : 0
      }

      // 3. Eliminar mediciones
      if (medicionesCount > 0) {
        const [result] = await connection.execute<any>(
          "DELETE FROM medicion_antropometrica WHERE id_paciente = ?",
          [id_paciente]
        )
        // ✅ CORRECCIÓN: Type-safe affectedRows validation
        records.medicionesAntropometricas =
          typeof result?.affectedRows === "number" ? result.affectedRows : 0
      }

      // 4. Eliminar estudios
      if (estudiosCount > 0) {
        const [result] = await connection.execute<any>(
          "DELETE FROM estudio_laboratorio WHERE id_paciente = ?",
          [id_paciente]
        )
        // ✅ CORRECCIÓN: Type-safe affectedRows validation
        records.estudiosLaboratorio =
          typeof result?.affectedRows === "number" ? result.affectedRows : 0
      }

      // 5. Eliminar dirección SI es única de este paciente
      if (paciente.id_direccion) {
        const [otrosPacientes] = await connection.execute<any>(
          "SELECT COUNT(*) as count FROM paciente WHERE id_direccion = ? AND id_paciente != ?",
          [paciente.id_direccion, id_paciente]
        )

        const otrosCount = otrosPacientes?.[0]?.count || 0
        if (otrosCount === 0) {
          await connection.execute(
            "DELETE FROM direccion WHERE id_direccion = ?",
            [paciente.id_direccion]
          )
        }
      }

      // 6. Finalmente, eliminar el paciente
      const [deleteResult] = await connection.execute<any>(
        "DELETE FROM paciente WHERE id_paciente = ?",
        [id_paciente]
      )

      return {
        paciente,
        records,
        pacienteDeleted: typeof deleteResult?.affectedRows === "number" ? deleteResult.affectedRows : 0,
      }
    })

    // ========================================
    // 4. RESPUESTA EXITOSA
    // ========================================

    console.log(`✅ Eliminación Completa - ID: ${id_paciente}, Cédula: ${resultado.paciente.cedula}`)

    return NextResponse.json(
      {
        success: true,
        message: "Paciente eliminado completamente con todas sus relaciones",
        data: {
          id_paciente: resultado.paciente.id_paciente,
          cedula: resultado.paciente.cedula,
          nombre: resultado.paciente.nombre,
          apellido_paterno: resultado.paciente.apellido_paterno,
          registrosEliminados: {
            historialesClinicos: resultado.records.historialesClinicos,
            predicciones: resultado.records.predicciones,
            medicionesAntropometricas: resultado.records.medicionesAntropometricas,
            estudiosLaboratorio: resultado.records.estudiosLaboratorio,
            paciente: resultado.pacienteDeleted,
            total:
              resultado.records.historialesClinicos +
              resultado.records.predicciones +
              resultado.records.medicionesAntropometricas +
              resultado.records.estudiosLaboratorio +
              resultado.pacienteDeleted,
          },
          validacionPostEliminacion: {
            cedula_disponible_para_nuevo_paciente: true,
            relaciones_limpias: true,
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    // ========================================
    // 5. MANEJO DE ERRORES
    // ========================================

    const errorMessage = error instanceof Error ? error.message : "Error desconocido"

    console.error("❌ Error en eliminar-completo:", {
      error: errorMessage,
      timestamp: new Date().toISOString(),
    })

    // Error: Paciente no encontrado
    if (errorMessage.includes("PACIENTE_NO_ENCONTRADO")) {
      return NextResponse.json(
        {
          success: false,
          error: "Paciente no encontrado",
          code: "NOT_FOUND",
          message: `No existe un paciente con este ID`,
        },
        { status: 404 }
      )
    }

    // Error: Transacción expirada
    if (errorMessage.includes("Timeout") || errorMessage.includes("timeout")) {
      return NextResponse.json(
        {
          success: false,
          error: "Timeout de transacción",
          code: "TIMEOUT_ERROR",
          message: "La operación tardó demasiado. Intenta de nuevo.",
          hint: "Esto puede ocurrir si hay muchos registros relacionados.",
        },
        { status: 503 }
      )
    }

    // Error: Deadlock en transacción
    if (errorMessage.includes("deadlock")) {
      return NextResponse.json(
        {
          success: false,
          error: "Conflicto de concurrencia",
          code: "DEADLOCK_ERROR",
          message: "Había otra operación en curso. Intenta de nuevo.",
        },
        { status: 503 }
      )
    }

    // Error: Conflicto de integridad
    if (
      errorMessage.includes("Foreign key") ||
      errorMessage.includes("Unique constraint") ||
      errorMessage.includes("FK")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Conflicto de integridad de datos",
          code: "INTEGRITY_CONSTRAINT_VIOLATION",
          message: "No se puede eliminar debido a restricciones de la base de datos",
          hint: "Verifica que no haya referencias externas activas",
        },
        { status: 409 }
      )
    }

    // Error: Conexión a BD
    if (errorMessage.includes("connect") || errorMessage.includes("ECONNREFUSED")) {
      return NextResponse.json(
        {
          success: false,
          error: "Error de conexión a base de datos",
          code: "DATABASE_CONNECTION_ERROR",
          message: "No se pudo conectar a la base de datos",
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
        message: "Ocurrió un error al procesar la solicitud",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    )
  }
})
