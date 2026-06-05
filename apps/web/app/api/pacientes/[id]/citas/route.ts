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
      `SELECT c.id_consulta, c.proxima_cita, c.motivo_consulta,
              CONCAT(u.nombre, ' ', u.apellido_paterno) AS medico
       FROM consulta_medica c INNER JOIN usuario u ON c.id_usuario = u.id_usuario
       WHERE c.id_paciente = ? AND c.proxima_cita IS NOT NULL AND c.proxima_cita >= CURDATE()
       ORDER BY c.proxima_cita ASC`,
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
