// app/api/pacientes/[id]/automonitoreo/route.ts
// Automonitoreo del paciente (RF07 captura / RF08 tendencias): glucosa, peso, presión.
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { query } from "@/lib/db"
import { requirePacienteSelf } from "@/lib/auth"
import { decryptSensitiveFieldIfNeeded, encryptSensitiveField } from "@/lib/crypto"

type AutomonitoreoRow = {
  id_automonitoreo: number
  tipo: string
  valor: number
  valor_secundario: number | null
  unidad: string | null
  notas: string | null
  fecha_registro: Date | string
}

function decryptAutomonitoreo(row: AutomonitoreoRow): AutomonitoreoRow {
  return {
    ...row,
    notas: row.notas ? decryptSensitiveFieldIfNeeded(row.notas) : null,
  }
}

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

    const rows = await query<AutomonitoreoRow>(sql, p)
    return NextResponse.json({ success: true, data: rows.map(decryptAutomonitoreo) })
  } catch (error) {
    console.error("Error automonitoreo GET:", error)
    return NextResponse.json({ success: false, error: "Error al obtener automonitoreo" }, { status: 500 })
  }
})

const createSchema = z.object({
  tipo: z.enum(["glucosa", "peso", "presion"]),
  valor: z.coerce.number().positive(),
  valor_secundario: z.coerce.number().positive().optional(),
  unidad: z.string().trim().max(20).optional(),
  notas: z.string().trim().max(1000).optional(),
}).strict().superRefine((data, ctx) => {
  if (data.tipo === "glucosa" && (data.valor < 20 || data.valor > 600)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: "Glucosa fuera de rango clínico esperado (20-600)" })
  }
  if (data.tipo === "peso" && (data.valor < 1 || data.valor > 500)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: "Peso fuera de rango esperado (1-500 kg)" })
  }
  if (data.tipo === "presion") {
    if (data.valor < 50 || data.valor > 260) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: "Presión sistólica fuera de rango (50-260)" })
    }
    if (data.valor_secundario == null || data.valor_secundario < 30 || data.valor_secundario > 180) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor_secundario"], message: "Presión diastólica fuera de rango (30-180)" })
    }
  }
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
    const encryptedNotes = notas ? encryptSensitiveField(notas) : null

    const result = await query(
      `INSERT INTO automonitoreo (id_paciente, tipo, valor, valor_secundario, unidad, notas)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, tipo, valor, valor_secundario ?? null, unidad ?? null, encryptedNotes],
    )
    const id_automonitoreo = (result as any).insertId

    const [created] = await query<AutomonitoreoRow>(
      `SELECT id_automonitoreo, tipo, valor, valor_secundario, unidad, notas, fecha_registro
       FROM automonitoreo WHERE id_automonitoreo = ?`,
      [id_automonitoreo],
    )

    return NextResponse.json(
      { success: true, message: "Medición registrada", data: decryptAutomonitoreo(created) },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error automonitoreo POST:", error)
    return NextResponse.json({ success: false, error: "Error al registrar medición" }, { status: 500 })
  }
})
