// app/api/dashboard/recent/route.ts
import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

// GET - Eventos recientes para el dashboard
export const GET = requireAuth(async (request: NextRequest, { user }) => {
  try {
    // Últimas predicciones
    const ultimasPredicciones = await query<any>(
      `
      SELECT 'Predicción' as tipo, 
             p.id_prediccion as id,
             p.fecha_prediccion as fecha,
             CONCAT(pa.nombre, ' ', pa.apellido_paterno) as paciente_nombre,
             p.resultado,
             p.nivel_riesgo
      FROM prediccion p
      INNER JOIN paciente pa ON p.id_paciente = pa.id_paciente
      ORDER BY p.fecha_prediccion DESC
      LIMIT 5
    `,
    )

    // Últimos estudios
    const ultimosEstudios = await query<any>(
      `
      SELECT 'Estudio' as tipo,
             e.id_estudio as id,
             e.fecha_estudio as fecha,
             CONCAT(pa.nombre, ' ', pa.apellido_paterno) as paciente_nombre
      FROM estudio_laboratorio e
      INNER JOIN paciente pa ON e.id_paciente = pa.id_paciente
      ORDER BY e.fecha_estudio DESC
      LIMIT 5
    `,
    )

    // Últimas mediciones
    const ultimasMediciones = await query<any>(
      `
      SELECT 'Medición' as tipo,
             m.id_medicion as id,
             m.fecha_medicion as fecha,
             CONCAT(pa.nombre, ' ', pa.apellido_paterno) as paciente_nombre,
             m.imc
      FROM medicion_antropometrica m
      INNER JOIN paciente pa ON m.id_paciente = pa.id_paciente
      ORDER BY m.fecha_medicion DESC
      LIMIT 5
    `,
    )

    // Combinar y ordenar por fecha
    const eventos = [
      ...ultimasPredicciones.map((p: any) => ({
        ...p,
        fecha: new Date(p.fecha),
      })),
      ...ultimosEstudios.map((e: any) => ({
        ...e,
        fecha: new Date(e.fecha),
      })),
      ...ultimasMediciones.map((m: any) => ({
        ...m,
        fecha: new Date(m.fecha),
      })),
    ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime())

    return NextResponse.json({
      success: true,
      data: eventos.slice(0, 10),
    })
  } catch (error) {
    console.error("Error al obtener eventos recientes:", error)
    return NextResponse.json({ error: "Error al obtener eventos" }, { status: 500 })
  }
})
