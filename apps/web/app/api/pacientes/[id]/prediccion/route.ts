// app/api/pacientes/[id]/prediccion/route.ts
// Predicción de IA del paciente en lenguaje simplificado (RF03).
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
      `SELECT id_prediccion, fecha_prediccion, nivel_riesgo, resultado,
              probabilidad_diabetes, probabilidad_no_diabetes,
              recomendaciones, factores_riesgo, validado, diagnostico_confirmado
       FROM prediccion WHERE id_paciente = ? ORDER BY fecha_prediccion DESC LIMIT 20`,
      [id],
    )

    const historico = rows.map((r) => ({
      id_prediccion: r.id_prediccion,
      fecha: r.fecha_prediccion,
      nivel_riesgo: r.nivel_riesgo,
      resultado: r.resultado,
      probabilidad_diabetes: r.probabilidad_diabetes,
      probabilidad_no_diabetes: r.probabilidad_no_diabetes,
      recomendaciones: parseMaybeJson(r.recomendaciones),
      factores_riesgo: parseMaybeJson(r.factores_riesgo),
      validado: !!r.validado,
      diagnostico_confirmado: r.diagnostico_confirmado,
    }))

    return NextResponse.json({ success: true, data: { ultima: historico[0] ?? null, historico } })
  } catch (error) {
    console.error("Error predicción paciente:", error)
    return NextResponse.json({ success: false, error: "Error al obtener predicción" }, { status: 500 })
  }
})
