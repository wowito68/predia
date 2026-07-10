// app/api/pacientes/[id]/expediente/route.ts
// Expediente clínico del paciente, solo lectura (RF04).
import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { requirePacienteSelf } from "@/lib/auth"

export const GET = requirePacienteSelf(async (_request: NextRequest, { params }) => {
  const id = parseInt(params?.id, 10)
  if (!id || isNaN(id)) return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 })

  try {
    const paciente = await queryOne<any>(
      `SELECT id_paciente, cedula, nombre, apellido_paterno, apellido_materno, genero,
              fecha_nacimiento, edad, tipo_sangre, telefono, email
       FROM paciente WHERE id_paciente = ? AND activo = TRUE`,
      [id],
    )
    if (!paciente) {
      return NextResponse.json({ success: false, error: "Paciente no encontrado" }, { status: 404 })
    }

    // Consultas independientes en paralelo (antes eran 3 round-trips secuenciales).
    const [alergias, patologias, consultas] = await Promise.all([
      query<any>(
        `SELECT id_alergia, tipo_alergia, alergeno, severidad, reaccion
         FROM alergia WHERE id_paciente = ? AND activa = TRUE`,
        [id],
      ),
      query<any>(
        `SELECT pp.id_diagnostico, cp.nombre AS patologia, cp.codigo_cie10,
                pp.estado, pp.severidad, pp.fecha_diagnostico
         FROM patologia_paciente pp
         INNER JOIN catalogo_patologia cp ON pp.id_patologia = cp.id_patologia
         WHERE pp.id_paciente = ? ORDER BY pp.fecha_diagnostico DESC`,
        [id],
      ),
      query<any>(
        `SELECT id_consulta, fecha_consulta, motivo_consulta, diagnostico
         FROM consulta_medica WHERE id_paciente = ? ORDER BY fecha_consulta DESC LIMIT 5`,
        [id],
      ),
    ])

    return NextResponse.json({
      success: true,
      data: {
        paciente: {
          ...paciente,
          nombre_completo: [paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno]
            .filter(Boolean)
            .join(" "),
        },
        alergias,
        patologias,
        consultas,
      },
    })
  } catch (error) {
    console.error("Error expediente paciente:", error)
    return NextResponse.json({ success: false, error: "Error al obtener expediente" }, { status: 500 })
  }
})
