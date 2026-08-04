// app/api/pacientes/[id]/dashboard/route.ts
// Resumen de salud del paciente para la app móvil (RF02).
import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { requirePacienteSelf } from "@/lib/auth"

export const GET = requirePacienteSelf(async (_request: NextRequest, { params }) => {
  const id = parseInt(params?.id, 10)
  if (!id || isNaN(id)) return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 })

  try {
    // Consultas independientes en paralelo (antes 4 round-trips secuenciales).
    const [ultimaPred, proximaCita, recetas, glucosa] = await Promise.all([
      queryOne<{ nivel_riesgo: string; probabilidad_diabetes: number; fecha_prediccion: string }>(
        `SELECT nivel_riesgo, probabilidad_diabetes, fecha_prediccion
         FROM prediccion WHERE id_paciente = ? ORDER BY fecha_prediccion DESC LIMIT 1`,
        [id],
      ),
      queryOne<{ proxima_cita: string; motivo_consulta: string }>(
        `SELECT fecha_cita AS proxima_cita, motivo AS motivo_consulta
         FROM cita
         WHERE id_paciente = ?
           AND estado IN ('PROGRAMADA', 'EN_CURSO')
           AND (estado = 'EN_CURSO' OR fecha_cita >= CURDATE())
         ORDER BY CASE WHEN estado = 'EN_CURSO' THEN 0 ELSE 1 END, fecha_cita ASC
         LIMIT 1`,
        [id],
      ),
      queryOne<{ total: number }>(
        `SELECT COUNT(*) as total FROM receta WHERE id_paciente = ? AND estado = 'Activa'`,
        [id],
      ),
      query<{ valor: number; fecha_registro: string }>(
        `SELECT valor, fecha_registro FROM automonitoreo
         WHERE id_paciente = ? AND tipo = 'glucosa' ORDER BY fecha_registro DESC LIMIT 7`,
        [id],
      ),
    ])

    return NextResponse.json({
      success: true,
      data: {
        nivel_riesgo: ultimaPred?.nivel_riesgo ?? null,
        probabilidad_diabetes: ultimaPred?.probabilidad_diabetes ?? null,
        fecha_prediccion: ultimaPred?.fecha_prediccion ?? null,
        proxima_cita: proximaCita
          ? { fecha: proximaCita.proxima_cita, motivo: proximaCita.motivo_consulta }
          : null,
        recetas_activas: Number(recetas?.total ?? 0),
        // En orden cronológico ascendente para graficar
        glucosa: glucosa.map((g) => ({ valor: g.valor, fecha: g.fecha_registro })).reverse(),
      },
    })
  } catch (error) {
    console.error("Error dashboard paciente:", error)
    return NextResponse.json({ success: false, error: "Error al obtener dashboard" }, { status: 500 })
  }
})
