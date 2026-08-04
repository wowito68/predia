// app/api/pacientes/[id]/evolucion/route.ts
// Sistema Matemático de Evolución Clínica: arma las series temporales del
// paciente desde el EHR y ejecuta el motor (lib/evolution).
import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requirePacienteSelf } from "@/lib/auth"
import { analyzePatient, type Point } from "@/lib/evolution"

interface Row { f: string | Date; v: number | null }

function build(rows: Row[]): { points: Point[]; raw: { fecha: string; valor: number }[] } {
  const clean = rows
    .map((r) => ({ fecha: new Date(r.f), x: Number(r.v) }))
    .filter((r) => !isNaN(r.fecha.getTime()) && Number.isFinite(r.x))
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
  if (clean.length === 0) return { points: [], raw: [] }
  const t0 = clean[0].fecha.getTime()
  return {
    points: clean.map((c) => ({ t: (c.fecha.getTime() - t0) / 86400000, x: c.x })),
    raw: clean.map((c) => ({ fecha: c.fecha.toISOString(), valor: c.x })),
  }
}

export const GET = requirePacienteSelf(async (_request: NextRequest, { params }) => {
  const id = parseInt(params?.id, 10)
  if (!id || isNaN(id)) return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 })

  try {
    // Cada serie fusiona sus fuentes (automonitoreo / mediciones / laboratorio)
    const [glucosa, imc, pas, pad, peso, hba1c] = await Promise.all([
      query<Row>(
        `SELECT valor AS v, fecha_registro AS f FROM automonitoreo WHERE id_paciente=? AND tipo='glucosa'
         UNION ALL
         SELECT glucosa_ayunas AS v, fecha_estudio AS f FROM estudio_laboratorio WHERE id_paciente=? AND glucosa_ayunas IS NOT NULL`,
        [id, id],
      ),
      query<Row>(`SELECT imc AS v, fecha_medicion AS f FROM medicion_antropometrica WHERE id_paciente=? AND imc IS NOT NULL AND activo=TRUE`, [id]),
      query<Row>(
        `SELECT presion_sistolica AS v, fecha_medicion AS f FROM medicion_antropometrica WHERE id_paciente=? AND presion_sistolica IS NOT NULL AND activo=TRUE
         UNION ALL
         SELECT valor AS v, fecha_registro AS f FROM automonitoreo WHERE id_paciente=? AND tipo='presion'`,
        [id, id],
      ),
      query<Row>(
        `SELECT presion_diastolica AS v, fecha_medicion AS f FROM medicion_antropometrica WHERE id_paciente=? AND presion_diastolica IS NOT NULL AND activo=TRUE
         UNION ALL
         SELECT valor_secundario AS v, fecha_registro AS f FROM automonitoreo WHERE id_paciente=? AND tipo='presion' AND valor_secundario IS NOT NULL`,
        [id, id],
      ),
      query<Row>(
        `SELECT peso AS v, fecha_medicion AS f FROM medicion_antropometrica WHERE id_paciente=? AND peso IS NOT NULL AND activo=TRUE
         UNION ALL
         SELECT valor AS v, fecha_registro AS f FROM automonitoreo WHERE id_paciente=? AND tipo='peso'`,
        [id, id],
      ),
      query<Row>(`SELECT hba1c AS v, fecha_estudio AS f FROM estudio_laboratorio WHERE id_paciente=? AND hba1c IS NOT NULL`, [id]),
    ])

    const built = {
      glucosa: build(glucosa), imc: build(imc), pas: build(pas),
      pad: build(pad), peso: build(peso), hba1c: build(hba1c),
    }
    const seriesByKey: Record<string, Point[]> = Object.fromEntries(
      Object.entries(built).map(([k, b]) => [k, b.points]),
    )

    const evolution = analyzePatient(seriesByKey)
    const series = Object.fromEntries(Object.entries(built).map(([k, b]) => [k, b.raw]))

    return NextResponse.json({ success: true, data: { ...evolution, series } })
  } catch (error) {
    console.error("Error en evolución clínica:", error)
    return NextResponse.json({ success: false, error: "Error al calcular la evolución clínica" }, { status: 500 })
  }
})
