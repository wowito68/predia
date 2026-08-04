// app/api/pacientes/[id]/recetas/route.ts
// Recetas y medicamentos del paciente (RF05).
import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requirePacienteSelf } from "@/lib/auth"

const parseMaybeJson = (v: string | null) => {
  if (v == null) return null
  try {
    return JSON.parse(v)
  } catch {
    return v
  }
}

export const GET = requirePacienteSelf(async (_request: NextRequest, { params }) => {
  const id = parseInt(params?.id, 10)
  if (!id || isNaN(id)) return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 })

  try {
    const rows = await query<any>(
      `SELECT r.id_receta, r.fecha_emicion, r.medicamentos, r.instrucciones, r.estado,
              CONCAT(u.nombre, ' ', u.apellido_paterno) AS medico
       FROM receta r INNER JOIN usuario u ON r.id_usuario = u.id_usuario
       WHERE r.id_paciente = ? ORDER BY r.fecha_emicion DESC`,
      [id],
    )

    const data = rows.map((r) => ({
      id_receta: r.id_receta,
      fecha_emision: r.fecha_emicion,
      medicamentos: parseMaybeJson(r.medicamentos),
      instrucciones: r.instrucciones,
      estado: r.estado,
      medico: r.medico,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error recetas paciente:", error)
    return NextResponse.json({ success: false, error: "Error al obtener recetas" }, { status: 500 })
  }
})
