// app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    // Todas las consultas son independientes → se ejecutan en paralelo
    // (antes eran 9 round-trips secuenciales a MySQL).
    const [
      totalPacientesResult,
      consultasHoyResult,
      citasPendientesResult,
      riesgoAltoResult,
      distRows,
      tendRows,
      prediccionesHoyResult,
      modeloResult,
      alertasResult,
    ] = await Promise.all([
      query<{ total: number }>("SELECT COUNT(*) as total FROM paciente WHERE activo = TRUE"),
      query<{ total: number }>("SELECT COUNT(*) as total FROM consulta_medica WHERE DATE(fecha_consulta) = CURDATE()"),
      query<{ total: number }>("SELECT COUNT(*) as total FROM consulta_medica WHERE proxima_cita IS NOT NULL AND DATE(proxima_cita) >= CURDATE()"),
      query<{ total: number }>(
        `SELECT COUNT(DISTINCT id_paciente) as total
         FROM prediccion
         WHERE nivel_riesgo IN ('Muy Alto', 'Alto')
         AND id_prediccion IN (SELECT MAX(id_prediccion) FROM prediccion GROUP BY id_paciente)`
      ),
      query<{ nivel_riesgo: string; total: number }>(
        `SELECT nivel_riesgo, COUNT(*) AS total
         FROM prediccion
         WHERE id_prediccion IN (SELECT MAX(id_prediccion) FROM prediccion GROUP BY id_paciente)
         GROUP BY nivel_riesgo`
      ),
      query<{ aumentaron: number; disminuyeron: number; estables: number }>(
        `WITH ranked AS (
           SELECT id_paciente, COALESCE(score_riesgo, probabilidad_diabetes) AS sc,
                  ROW_NUMBER() OVER (PARTITION BY id_paciente ORDER BY id_prediccion DESC) rn
           FROM prediccion
         )
         SELECT
           CAST(SUM(cur.sc > prev.sc) AS UNSIGNED) AS aumentaron,
           CAST(SUM(cur.sc < prev.sc) AS UNSIGNED) AS disminuyeron,
           CAST(SUM(cur.sc = prev.sc) AS UNSIGNED) AS estables
         FROM (SELECT id_paciente, sc FROM ranked WHERE rn = 1) cur
         JOIN (SELECT id_paciente, sc FROM ranked WHERE rn = 2) prev USING (id_paciente)`
      ),
      query<{ total: number }>("SELECT COUNT(*) as total FROM prediccion WHERE DATE(fecha_prediccion) = CURDATE()"),
      query<{ accuracy: number }>("SELECT accuracy FROM modelo_ia WHERE activo = TRUE LIMIT 1"),
      query<any>(
        `SELECT
          p.id_prediccion, p.id_paciente,
          CONCAT(pa.nombre, ' ', pa.apellido_paterno) as paciente_nombre,
          pa.cedula, p.nivel_riesgo, p.probabilidad_diabetes, p.fecha_prediccion
         FROM prediccion p
         INNER JOIN paciente pa ON p.id_paciente = pa.id_paciente
         WHERE p.nivel_riesgo IN ('Muy Alto', 'Alto')
         ORDER BY p.fecha_prediccion DESC
         LIMIT 5`
      ),
    ])

    const totalPacientes = totalPacientesResult[0]?.total || 0
    const consultasHoy = consultasHoyResult[0]?.total || 0
    const citasPendientes = citasPendientesResult[0]?.total || 0
    const alertasActivas = riesgoAltoResult[0]?.total || 0

    const distribucionRiesgo: Record<string, number> = { "Bajo": 0, "Moderado": 0, "Alto": 0, "Muy Alto": 0 }
    for (const r of distRows) {
      if (r.nivel_riesgo in distribucionRiesgo) distribucionRiesgo[r.nivel_riesgo] = Number(r.total)
    }

    const tendenciaRiesgo = {
      aumentaron: Number(tendRows[0]?.aumentaron || 0),
      disminuyeron: Number(tendRows[0]?.disminuyeron || 0),
      estables: Number(tendRows[0]?.estables || 0),
    }

    const prediccionesHoy = prediccionesHoyResult[0]?.total || 0
    const precision = modeloResult[0]?.accuracy || 97.89

    const alertas = alertasResult.map((alerta: any) => ({
      id: alerta.id_prediccion,
      id_paciente: alerta.id_paciente,
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
        consultasHoy,
        alertasActivas,
        citasPendientes,
        distribucionRiesgo,
        tendenciaRiesgo,
        alertas,
        // Backwards compatibility
        prediccionesHoy,
        riesgoAlto: alertasActivas,
        precision: Math.round(precision * 10) / 10,
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
