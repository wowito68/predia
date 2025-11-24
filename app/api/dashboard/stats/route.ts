// app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    // Total pacientes activos
    const totalPacientesResult = await query<{ total: number }>(
      "SELECT COUNT(*) as total FROM paciente WHERE activo = TRUE"
    )
    const totalPacientes = totalPacientesResult[0]?.total || 0

    // Predicciones de hoy
    const prediccionesHoyResult = await query<{ total: number }>(
      "SELECT COUNT(*) as total FROM prediccion WHERE DATE(fecha_prediccion) = CURDATE()"
    )
    const prediccionesHoy = prediccionesHoyResult[0]?.total || 0

    // Pacientes con riesgo alto/muy alto
    const riesgoAltoResult = await query<{ total: number }>(
      `SELECT COUNT(DISTINCT id_paciente) as total 
       FROM prediccion 
       WHERE nivel_riesgo IN ('Muy Alto', 'Alto') 
       AND id_prediccion IN (
         SELECT MAX(id_prediccion) 
         FROM prediccion 
         GROUP BY id_paciente
       )`
    )
    const riesgoAlto = riesgoAltoResult[0]?.total || 0

    // Obtener accuracy del modelo desde la tabla modelo_ia
    const modeloResult = await query<{ accuracy: number }>(
      "SELECT accuracy FROM modelo_ia WHERE activo = TRUE LIMIT 1"
    )
   const precision = modeloResult[0]?.accuracy || 97.89

    // Alertas recientes (últimas 5 predicciones de alto riesgo)
    const alertasResult = await query<any>(
      `SELECT 
        p.id_prediccion,
        p.id_paciente,
        CONCAT(pa.nombre, ' ', pa.apellido_paterno) as paciente_nombre,
        pa.cedula,
        p.nivel_riesgo,
        p.probabilidad_diabetes,
        p.fecha_prediccion
       FROM prediccion p
       INNER JOIN paciente pa ON p.id_paciente = pa.id_paciente
       WHERE p.nivel_riesgo IN ('Muy Alto', 'Alto')
       ORDER BY p.fecha_prediccion DESC
       LIMIT 5`
    )

    const alertas = alertasResult.map((alerta: any) => ({
      id: alerta.id_prediccion,
      paciente: alerta.paciente_nombre,
      cedula: alerta.cedula,
      nivel_riesgo: alerta.nivel_riesgo,
      probabilidad: alerta.probabilidad_diabetes,
      fecha: alerta.fecha_prediccion,
      tiempo_relativo: calcularTiempoRelativo(new Date(alerta.fecha_prediccion))
    }))

    return NextResponse.json({
      success: true,
      data: {
        totalPacientes,
        prediccionesHoy,
        riesgoAlto,
        precision: Math.round(precision * 10) / 10,
        alertas
      }
    })
  } catch (error) {
    console.error("Error al obtener estadísticas del dashboard:", error)
    return NextResponse.json(
      { success: false, error: "Error al obtener estadísticas" },
      { status: 500 }
    )
  }
})

function calcularTiempoRelativo(fecha: Date): string {
  const ahora = new Date()
  const diferencia = ahora.getTime() - fecha.getTime()

  const minutos = Math.floor(diferencia / 60000)
  const horas = Math.floor(diferencia / 3600000)
  const dias = Math.floor(diferencia / 86400000)

  if (minutos < 1) return "Hace un momento"
  if (minutos < 60) return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`
  if (horas < 24) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`
  return `Hace ${dias} día${dias > 1 ? 's' : ''}`
}
