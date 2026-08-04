// app/api/pacientes/[id]/citas/route.ts
// Próximas citas del paciente (RF06).
import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requirePacienteSelf } from "@/lib/auth"

export const GET = requirePacienteSelf(async (_request: NextRequest, { params }) => {
  const id = parseInt(params?.id, 10)
  if (!id || isNaN(id)) return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 })

  try {
    const rows = await query<any>(
      `SELECT COALESCE(c.id_consulta, c.id_cita) AS id_consulta,
              c.fecha_cita AS proxima_cita,
              c.motivo AS motivo_consulta,
              CONCAT(u.nombre, ' ', u.apellido_paterno) AS medico
       FROM cita c INNER JOIN usuario u ON c.id_usuario = u.id_usuario
       WHERE c.id_paciente = ?
         AND c.estado IN ('PROGRAMADA', 'EN_CURSO')
         AND (c.estado = 'EN_CURSO' OR c.fecha_cita >= CURDATE())
       ORDER BY CASE WHEN c.estado = 'EN_CURSO' THEN 0 ELSE 1 END, c.fecha_cita ASC`,
      [id],
    )

    const data = rows.map((c) => ({
      id_consulta: c.id_consulta,
      fecha: c.proxima_cita,
      motivo: c.motivo_consulta,
      medico: c.medico,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error citas paciente:", error)
    return NextResponse.json({ success: false, error: "Error al obtener citas" }, { status: 500 })
  }
})
