import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { queryOne } from "@/lib/db"
import { scoreEnsanutScreening } from "@/lib/ensanut-screening"


const screeningSchema = z.object({
  id_paciente: z.number().int().positive(),
  age: z.number().min(20).max(110),
  female: z.union([z.literal(0), z.literal(1)]),
  parent_diabetes: z.union([z.literal(0), z.literal(1), z.null()]),
  diagnosed_hypertension: z.union([z.literal(0), z.literal(1), z.null()]),
  bmi: z.number().min(10).max(80),
  waist_cm: z.number().min(40).max(220),
})


export const POST = requireRole(["Administrador", "Médico"])(async (request: NextRequest) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "El cuerpo de la solicitud debe ser JSON válido" },
      { status: 400 },
    )
  }
  try {
    const parsed = screeningSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Datos de tamizaje inválidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { id_paciente, ...input } = parsed.data
    const patient = await queryOne<{ id_paciente: number }>(
      "SELECT id_paciente FROM paciente WHERE id_paciente = ? AND activo = TRUE",
      [id_paciente],
    )
    if (!patient) {
      return NextResponse.json({ success: false, error: "Paciente no encontrado" }, { status: 404 })
    }

    const result = scoreEnsanutScreening(input)
    return NextResponse.json({
      success: true,
      data: {
        patientId: id_paciente,
        evaluatedAt: new Date().toISOString(),
        persisted: false,
        ...result,
      },
    })
  } catch (error) {
    console.error("ENSANUT screening error:", error)
    return NextResponse.json(
      { success: false, error: "No se pudo calcular el tamizaje" },
      { status: 500 },
    )
  }
})
