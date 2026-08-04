import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { explainFactors } from "@/lib/risk"
import { getRecommendations } from "@/lib/risk"
import { stratifyRisk, type RiskLevel } from "@/lib/risk"
import { parseIdParam } from "@/lib/validation"
import type { DynamicRouteContext } from "@/types/route-context"

function safeJson(value: unknown) {
  if (!value) return null
  if (typeof value !== "string") return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function daysSince(value?: string | Date | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.floor((Date.now() - date.getTime()) / 86_400_000)
}

function normalizeLevel(level?: string | null, score?: number | null): RiskLevel | null {
  if (level === "Bajo" || level === "Moderado" || level === "Alto" || level === "Muy Alto") return level
  if (score == null) return null
  return stratifyRisk(score).nivel
}

function medicationSummary(value: unknown) {
  const parsed = safeJson(value)
  if (Array.isArray(parsed)) {
    return parsed.map((item: any) => item?.nombre ?? item?.medicamento ?? String(item)).join(", ")
  }
  return typeof value === "string" ? value : "Medicamentos registrados"
}

export const GET = requireAuth(async (_request: NextRequest, { params }: DynamicRouteContext) => {
  const { id, error, status } = parseIdParam(params, "id")
  if (error) return NextResponse.json({ success: false, error }, { status })

  try {
    const paciente = await queryOne<any>(
      `SELECT id_paciente, cedula, nombre, apellido_paterno, apellido_materno, genero,
              fecha_nacimiento, edad, tipo_sangre, telefono, email,
              contacto_emergencia_nombre, contacto_emergencia_telefono
       FROM paciente
       WHERE id_paciente = ? AND activo = TRUE`,
      [id],
    )

    if (!paciente) {
      return NextResponse.json({ success: false, error: "Paciente no encontrado" }, { status: 404 })
    }

    const [
      prediccion,
      alergias,
      consultas,
      mediciones,
      automonitoreo,
      recetas,
      documentos,
      patologias,
      proximaCita,
    ] = await Promise.all([
      queryOne<any>(
        `SELECT id_prediccion, fecha_prediccion, nivel_riesgo, probabilidad_diabetes,
                score_riesgo, factores_riesgo, recomendaciones, recomendaciones_generadas,
                datos_entrada, validado, diagnostico_confirmado
         FROM prediccion
         WHERE id_paciente = ?
         ORDER BY fecha_prediccion DESC
         LIMIT 1`,
        [id],
      ),
      query<any>(
        `SELECT id_alergia, tipo_alergia, alergeno, severidad, reaccion, fecha_deteccion
         FROM alergia
         WHERE id_paciente = ? AND activa = TRUE
         ORDER BY FIELD(severidad, 'Severa', 'Grave', 'Moderada', 'Alta', 'Leve'), fecha_registro DESC`,
        [id],
      ),
      query<any>(
        `SELECT id_consulta, fecha_consulta, motivo_consulta, sintomas, diagnostico,
                tratamiento, observaciones, proxima_cita
         FROM consulta_medica
         WHERE id_paciente = ?
         ORDER BY fecha_consulta DESC
         LIMIT 8`,
        [id],
      ),
      query<any>(
        `SELECT id_medicion, fecha_medicion, peso, altura, imc, presion_sistolica,
                presion_diastolica, observaciones
         FROM medicion_antropometrica
         WHERE id_paciente = ? AND activo = TRUE
         ORDER BY fecha_medicion DESC
         LIMIT 8`,
        [id],
      ),
      query<any>(
        `SELECT id_automonitoreo, tipo, valor, valor_secundario, unidad, notas, fecha_registro
         FROM automonitoreo
         WHERE id_paciente = ?
         ORDER BY fecha_registro DESC
         LIMIT 12`,
        [id],
      ),
      query<any>(
        `SELECT id_receta, fecha_emicion, medicamentos, instrucciones, estado
         FROM receta
         WHERE id_paciente = ?
         ORDER BY fecha_emicion DESC
         LIMIT 5`,
        [id],
      ),
      query<any>(
        `SELECT id_documento, tipo_documento, nombre_archivo, tipo_archivo, descripcion, fecha_subida
         FROM documento_adjunto
         WHERE id_paciente = ?
         ORDER BY fecha_subida DESC
         LIMIT 5`,
        [id],
      ),
      query<any>(
        `SELECT pp.id_diagnostico, cp.nombre AS patologia, cp.codigo_cie10,
                pp.estado, pp.severidad, pp.fecha_diagnostico
         FROM patologia_paciente pp
         INNER JOIN catalogo_patologia cp ON pp.id_patologia = cp.id_patologia
         WHERE pp.id_paciente = ? AND pp.estado <> 'Resuelta'
         ORDER BY pp.fecha_diagnostico DESC`,
        [id],
      ),
      queryOne<any>(
        `SELECT COALESCE(id_consulta, id_cita) AS id_consulta,
                fecha_cita AS proxima_cita,
                motivo AS motivo_consulta
         FROM cita
         WHERE id_paciente = ?
           AND estado IN ('PROGRAMADA', 'EN_CURSO')
           AND (estado = 'EN_CURSO' OR fecha_cita >= CURDATE())
         ORDER BY CASE WHEN estado = 'EN_CURSO' THEN 0 ELSE 1 END, fecha_cita ASC
         LIMIT 1`,
        [id],
      ),
    ])

    const score = Number(prediccion?.score_riesgo ?? prediccion?.probabilidad_diabetes)
    const riskLevel = normalizeLevel(prediccion?.nivel_riesgo, Number.isFinite(score) ? score : null)
    const band = riskLevel ? stratifyRisk(Number.isFinite(score) ? score : 0) : null
    const datosEntrada = safeJson(prediccion?.datos_entrada) ?? {}
    const recomendaciones = riskLevel ? getRecommendations(riskLevel) : null
    const explanation = Object.keys(datosEntrada as Record<string, unknown>).length
      ? explainFactors(datosEntrada as Record<string, unknown>, 4)
      : { contribuyen: [], protegen: [] }

    const latestMedicion = mediciones[0] ?? null
    const latestGlucose = automonitoreo.find((m: any) => m.tipo === "glucosa") ?? null
    const latestPressure = automonitoreo.find((m: any) => m.tipo === "presion") ?? null
    const latestConsulta = consultas[0] ?? null
    const criticalAllergies = alergias.filter((a: any) =>
      ["grave", "severa", "alta", "moderada"].includes(String(a.severidad || "").toLowerCase()),
    )

    const alerts: Array<{ type: string; severity: "critical" | "warning" | "info"; title: string; detail: string }> = []
    if (criticalAllergies.length) {
      alerts.push({
        type: "allergy",
        severity: "critical",
        title: "Alergia relevante",
        detail: criticalAllergies.map((a: any) => a.alergeno).join(", "),
      })
    }
    if (riskLevel === "Alto" || riskLevel === "Muy Alto") {
      alerts.push({
        type: "risk",
        severity: riskLevel === "Muy Alto" ? "critical" : "warning",
        title: `Riesgo ${riskLevel}`,
        detail: recomendaciones?.seguimiento ?? "Requiere revisión clínica.",
      })
    }
    if (prediccion && !prediccion.validado) {
      alerts.push({
        type: "validation",
        severity: "warning",
        title: "IA pendiente de validación",
        detail: "El resultado debe ser revisado y firmado por el médico.",
      })
    }
    const systolic = Number(latestMedicion?.presion_sistolica ?? latestPressure?.valor)
    const diastolic = Number(latestMedicion?.presion_diastolica ?? latestPressure?.valor_secundario)
    if ((Number.isFinite(systolic) && systolic >= 140) || (Number.isFinite(diastolic) && diastolic >= 90)) {
      alerts.push({
        type: "blood_pressure",
        severity: "warning",
        title: "Presión arterial elevada",
        detail: `${Number.isFinite(systolic) ? systolic : "?"}/${Number.isFinite(diastolic) ? diastolic : "?"} mmHg`,
      })
    }
    if (latestGlucose && Number(latestGlucose.valor) >= 180) {
      alerts.push({
        type: "glucose",
        severity: "warning",
        title: "Glucosa elevada",
        detail: `${latestGlucose.valor} ${latestGlucose.unidad ?? "mg/dL"}`,
      })
    }
    const daysWithoutVisit = daysSince(latestConsulta?.fecha_consulta)
    if (daysWithoutVisit == null || daysWithoutVisit > 90) {
      alerts.push({
        type: "follow_up",
        severity: "info",
        title: "Seguimiento vencido",
        detail: daysWithoutVisit == null ? "Sin consulta registrada" : `Última consulta hace ${daysWithoutVisit} días`,
      })
    }

    const timeline = [
      ...consultas.map((item: any) => ({
        id: `consulta-${item.id_consulta}`,
        kind: "Consulta",
        title: item.motivo_consulta || "Consulta médica",
        detail: item.diagnostico || item.observaciones || item.tratamiento || "Sin diagnóstico registrado",
        date: item.fecha_consulta,
      })),
      ...mediciones.map((item: any) => ({
        id: `medicion-${item.id_medicion}`,
        kind: "Signos",
        title: "Signos vitales",
        detail: [
          item.peso ? `Peso ${item.peso} kg` : null,
          item.imc ? `IMC ${item.imc}` : null,
          item.presion_sistolica ? `PA ${item.presion_sistolica}/${item.presion_diastolica ?? "?"}` : null,
        ].filter(Boolean).join(" · ") || "Medición registrada",
        date: item.fecha_medicion,
      })),
      ...recetas.map((item: any) => ({
        id: `receta-${item.id_receta}`,
        kind: "Receta",
        title: "Receta emitida",
        detail: medicationSummary(item.medicamentos),
        date: item.fecha_emicion,
      })),
      ...documentos.map((item: any) => ({
        id: `documento-${item.id_documento}`,
        kind: "Documento",
        title: item.tipo_documento,
        detail: item.descripcion || item.nombre_archivo,
        date: item.fecha_subida,
      })),
      ...automonitoreo.map((item: any) => ({
        id: `automonitoreo-${item.id_automonitoreo}`,
        kind: "Automonitoreo",
        title: item.tipo,
        detail: item.valor_secundario
          ? `${item.valor}/${item.valor_secundario} ${item.unidad ?? ""}`.trim()
          : `${item.valor} ${item.unidad ?? ""}`.trim(),
        date: item.fecha_registro,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12)

    return NextResponse.json({
      success: true,
      data: {
        paciente: {
          ...paciente,
          nombre_completo: [paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno].filter(Boolean).join(" "),
        },
        risk: prediccion ? {
          id_prediccion: prediccion.id_prediccion,
          nivel: riskLevel,
          titulo: band?.titulo ?? `Riesgo ${riskLevel}`,
          descripcion: band?.descripcion ?? "Sin estratificación disponible.",
          accionClinica: band?.accionClinica ?? recomendaciones?.seguimiento,
          fecha: prediccion.fecha_prediccion,
          validado: Boolean(prediccion.validado),
          diagnostico_confirmado: prediccion.diagnostico_confirmado,
          factores: safeJson(prediccion.factores_riesgo) ?? [],
          recomendaciones,
          explanation,
        } : null,
        alerts,
        summary: {
          proximaCita,
          ultimaConsulta: latestConsulta,
          ultimaMedicion: latestMedicion,
          ultimaGlucosa: latestGlucose,
          recetasActivas: recetas.filter((r: any) => r.estado === "Activa"),
          documentosRecientes: documentos,
          alergias,
          alergiasCriticas: criticalAllergies,
          patologias,
        },
        timeline,
      },
    })
  } catch (err) {
    console.error("clinical snapshot error:", err)
    return NextResponse.json({ success: false, error: "Error al construir resumen clínico" }, { status: 500 })
  }
})
