// app/api/pacientes/[id]/asistente/route.ts
// FASE 3 — Asistente Clínico (CDSS). Arma el snapshot del paciente desde el EHR,
// reutilizando el motor de evolución (lib/evolution) y la estratificación de riesgo
// (lib/risk), y devuelve la evaluación del CDSS (lib/cdss): prioridad, alertas,
// "¿por qué?" y recomendaciones. Todo explicable y auditable.
import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { requirePacienteSelf } from "@/lib/auth"
import { analyzePatient, type Point } from "@/lib/evolution"
import { stratifyRisk } from "@/lib/risk"
import { assessPatient, buildSnapshot } from "@/lib/cdss"

interface Row { f: string | Date; v: number | null }

function points(rows: Row[]): Point[] {
  const clean = rows
    .map((r) => ({ fecha: new Date(r.f), x: Number(r.v) }))
    .filter((r) => !isNaN(r.fecha.getTime()) && Number.isFinite(r.x))
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
  if (clean.length === 0) return []
  const t0 = clean[0].fecha.getTime()
  return clean.map((c) => ({ t: (c.fecha.getTime() - t0) / 86400000, x: c.x }))
}

function toStrings(v: unknown): string[] {
  if (v == null) return []
  let parsed: unknown = v
  if (typeof v === "string") {
    try { parsed = JSON.parse(v) } catch { return [v] }
  }
  if (!Array.isArray(parsed)) return []
  return parsed
    .map((item) => {
      if (typeof item === "string") return item
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>
        return String(o.descripcion ?? o.factor ?? o.nombre ?? o.variable ?? "").trim()
      }
      return ""
    })
    .filter(Boolean)
}

export const GET = requirePacienteSelf(async (_request: NextRequest, { params }) => {
  const id = parseInt(params?.id, 10)
  if (!id || isNaN(id)) {
    return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 })
  }

  try {
    // 1) Series temporales (mismas fuentes que la ruta de evolución)
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

    const evolution = analyzePatient({
      glucosa: points(glucosa), imc: points(imc), pas: points(pas),
      pad: points(pad), peso: points(peso), hba1c: points(hba1c),
    })

    // 2) Último riesgo
    const pred = await queryOne<any>(
      `SELECT probabilidad_diabetes, nivel_riesgo, factores_riesgo
       FROM prediccion WHERE id_paciente=? ORDER BY fecha_prediccion DESC LIMIT 1`,
      [id],
    )
    const riesgo = pred?.probabilidad_diabetes != null ? Number(pred.probabilidad_diabetes) : null
    const nivelRiesgo = pred?.nivel_riesgo ?? (riesgo != null ? stratifyRisk(riesgo).nivel : null)
    const factoresRiesgo = toStrings(pred?.factores_riesgo)

    // 3) Comorbilidades activas
    const patologias = await query<any>(
      `SELECT cp.nombre AS patologia FROM patologia_paciente pp
       INNER JOIN catalogo_patologia cp ON pp.id_patologia = cp.id_patologia
       WHERE pp.id_paciente=? AND pp.estado='Activa'`,
      [id],
    )
    const comorbilidades = patologias.map((p) => p.patologia).filter(Boolean)

    // 4) Medicación activa
    const recetas = await query<any>(
      `SELECT medicamentos FROM receta WHERE id_paciente=? AND estado='Activa' ORDER BY fecha_emicion DESC LIMIT 5`,
      [id],
    )
    const medicacion = Array.from(
      new Set(recetas.flatMap((r) => toStrings(r.medicamentos))),
    )

    // 5) Días desde la última consulta
    const ultimaConsulta = await queryOne<any>(
      `SELECT MAX(fecha_consulta) AS f FROM consulta_medica WHERE id_paciente=?`,
      [id],
    )
    const diasSinConsulta = ultimaConsulta?.f
      ? Math.round((Date.now() - new Date(ultimaConsulta.f).getTime()) / 86400000)
      : null

    const snapshot = buildSnapshot({
      evolution, riesgo, nivelRiesgo, factoresRiesgo, comorbilidades, medicacion, diasSinConsulta,
    })
    const assessment = assessPatient(snapshot)

    return NextResponse.json({ success: true, data: { ...assessment, snapshot } })
  } catch (error) {
    console.error("Error asistente clínico:", error)
    return NextResponse.json({ success: false, error: "Error al generar el asistente clínico" }, { status: 500 })
  }
})
