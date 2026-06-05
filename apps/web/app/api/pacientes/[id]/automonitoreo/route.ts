// app/api/pacientes/[id]/automonitoreo/route.ts
// Automonitoreo del paciente (RF07 captura / RF08 tendencias): glucosa, peso, presión.
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { query } from "@/lib/db"
import { requirePacienteSelf } from "@/lib/auth"

// GET ?tipo=glucosa|peso|presion&dias=7|30|90
export const GET = requirePacienteSelf(async (request: NextRequest, { params }) => {
  const id = parseInt(params?.id, 10)
  if (!id || isNaN(id)) return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 })

  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get("tipo")
    let dias = parseInt(searchParams.get("dias") || "90", 10)
    if (isNaN(dias) || dias <= 0 || dias > 365) dias = 90

    let sql = `SELECT id_automonitoreo, tipo, valor, valor_secundario, unidad, notas, fecha_registro
               FROM automonitoreo
               WHERE id_paciente = ? AND fecha_registro >= DATE_SUB(NOW(), INTERVAL ${dias} DAY)`
    const p: any[] = [id]
    if (tipo && ["glucosa", "peso", "presion"].includes(tipo)) {
      sql += ` AND tipo = ?`
      p.push(tipo)
    }
    sql += ` ORDER BY fecha_registro ASC`

    const rows = await query<any>(sql, p)
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error("Error automonitoreo GET:", error)
    return NextResponse.json({ success: false, error: "Error al obtener automonitoreo" }, { status: 500 })
  }
})

const createSchema = z.object({
  tipo: z.enum(["glucosa", "peso", "presion"]),
  valor: z.number().positive(),
  valor_secundario: z.number().positive().optional(),
  unidad: z.string().max(20).optional(),
  notas: z.string().optional(),
})

// POST — el paciente registra una medición propia
export const POST = requirePacienteSelf(async (request: NextRequest, { params }) => {
  const id = parseInt(params?.id, 10)
  if (!id || isNaN(id)) return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 })

  try {
    const body = await request.json()
    const validation = createSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: validation.error.errors },
        { status: 400 },
      )
    }
    const { tipo, valor, valor_secundario, unidad, notas } = validation.data

    const result = await query(
      `INSERT INTO automonitoreo (id_paciente, tipo, valor, valor_secundario, unidad, notas)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, tipo, valor, valor_secundario ?? null, unidad ?? null, notas ?? null],
    )
    const id_automonitoreo = (result as any).insertId

    const [created] = await query<any>(
      `SELECT id_automonitoreo, tipo, valor, valor_secundario, unidad, notas, fecha_registro
       FROM automonitoreo WHERE id_automonitoreo = ?`,
      [id_automonitoreo],
    )

    return NextResponse.json({ success: true, message: "Medición registrada", data: created }, { status: 201 })
  } catch (error) {
    console.error("Error automonitoreo POST:", error)
    return NextResponse.json({ success: false, error: "Error al registrar medición" }, { status: 500 })
  }
})
