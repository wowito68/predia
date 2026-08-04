import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireRole } from "@/lib/auth"

type Priority = "Crítica" | "Alta" | "Media"

interface ClinicalAlert {
  id: string
  type: "risk" | "allergy" | "blood_pressure" | "glucose" | "overdue_appointment" | "follow_up" | "prescription"
  priority: Priority
  patientId: number
  patientName: string
  title: string
  reason: string
  suggestedAction: string
  date: string | null
}

const rank: Record<Priority, number> = { "Crítica": 0, "Alta": 1, "Media": 2 }

export const GET = requireRole(["Administrador", "Médico", "Enfermero"])(async (_request: NextRequest) => {
  try {
    const [riskRows, allergyRows, pressureRows, glucoseRows, overdueRows, followUpRows, prescriptionRows] = await Promise.all([
      query<any>(
        `SELECT pr.id_prediccion, pr.id_paciente, pr.nivel_riesgo, pr.factores_riesgo,
                pr.fecha_prediccion, pr.validado,
                CONCAT(p.nombre, ' ', p.apellido_paterno) AS paciente
         FROM prediccion pr
         INNER JOIN paciente p ON p.id_paciente = pr.id_paciente
         INNER JOIN (
           SELECT id_paciente, MAX(id_prediccion) AS latest_id
           FROM prediccion GROUP BY id_paciente
         ) latest ON latest.latest_id = pr.id_prediccion
         WHERE p.activo = TRUE AND pr.nivel_riesgo IN ('Alto', 'Muy Alto')`,
      ),
      query<any>(
        `SELECT a.id_alergia, a.id_paciente, a.alergeno, a.severidad, a.reaccion,
                COALESCE(a.fecha_deteccion, a.fecha_registro) AS fecha,
                CONCAT(p.nombre, ' ', p.apellido_paterno) AS paciente
         FROM alergia a
         INNER JOIN paciente p ON p.id_paciente = a.id_paciente
         WHERE p.activo = TRUE AND a.activa = TRUE
           AND LOWER(COALESCE(a.severidad, '')) IN ('grave', 'severa', 'alta', 'moderada')`,
      ),
      query<any>(
        `SELECT m.id_medicion, m.id_paciente, m.presion_sistolica, m.presion_diastolica,
                m.fecha_medicion, CONCAT(p.nombre, ' ', p.apellido_paterno) AS paciente
         FROM medicion_antropometrica m
         INNER JOIN paciente p ON p.id_paciente = m.id_paciente
         INNER JOIN (
           SELECT id_paciente, MAX(id_medicion) AS latest_id
           FROM medicion_antropometrica WHERE activo = TRUE GROUP BY id_paciente
         ) latest ON latest.latest_id = m.id_medicion
         WHERE p.activo = TRUE AND m.activo = TRUE
           AND (m.presion_sistolica >= 140 OR m.presion_diastolica >= 90)`,
      ),
      query<any>(
        `SELECT a.id_automonitoreo, a.id_paciente, a.valor, a.unidad, a.fecha_registro,
                CONCAT(p.nombre, ' ', p.apellido_paterno) AS paciente
         FROM automonitoreo a
         INNER JOIN paciente p ON p.id_paciente = a.id_paciente
         INNER JOIN (
           SELECT id_paciente, MAX(id_automonitoreo) AS latest_id
           FROM automonitoreo WHERE tipo = 'glucosa' GROUP BY id_paciente
         ) latest ON latest.latest_id = a.id_automonitoreo
         WHERE p.activo = TRUE AND a.tipo = 'glucosa' AND a.valor >= 180`,
      ),
      query<any>(
        `SELECT c.id_consulta, c.id_paciente, c.proxima_cita, c.motivo_consulta,
                CONCAT(p.nombre, ' ', p.apellido_paterno) AS paciente
         FROM consulta_medica c
         INNER JOIN paciente p ON p.id_paciente = c.id_paciente
         WHERE p.activo = TRUE AND c.proxima_cita IS NOT NULL
           AND c.proxima_cita < NOW() AND c.proxima_cita >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         ORDER BY c.proxima_cita DESC LIMIT 30`,
      ),
      query<any>(
        `SELECT p.id_paciente, CONCAT(p.nombre, ' ', p.apellido_paterno) AS paciente,
                MAX(c.fecha_consulta) AS ultima_consulta
         FROM paciente p
         LEFT JOIN consulta_medica c ON c.id_paciente = p.id_paciente
         WHERE p.activo = TRUE
         GROUP BY p.id_paciente, p.nombre, p.apellido_paterno
         HAVING ultima_consulta IS NULL OR ultima_consulta < DATE_SUB(NOW(), INTERVAL 90 DAY)
         ORDER BY ultima_consulta ASC LIMIT 30`,
      ),
      query<any>(
        `SELECT r.id_receta, r.id_paciente, r.fecha_emicion,
                CONCAT(p.nombre, ' ', p.apellido_paterno) AS paciente
         FROM receta r
         INNER JOIN paciente p ON p.id_paciente = r.id_paciente
         WHERE p.activo = TRUE AND r.estado = 'Activa'
           AND r.fecha_emicion < DATE_SUB(NOW(), INTERVAL 30 DAY)
         ORDER BY r.fecha_emicion ASC LIMIT 30`,
      ),
    ])

    const alerts: ClinicalAlert[] = [
      ...riskRows.map((row: any) => ({
        id: `risk-${row.id_prediccion}`,
        type: "risk" as const,
        priority: row.nivel_riesgo === "Muy Alto" ? "Crítica" as const : "Alta" as const,
        patientId: row.id_paciente,
        patientName: row.paciente,
        title: `Riesgo ${String(row.nivel_riesgo).toLowerCase()}`,
        reason: readableFactors(row.factores_riesgo) || (row.validado ? "Riesgo validado que requiere seguimiento." : "Resultado pendiente de validación médica."),
        suggestedAction: row.validado ? "Revisar plan de seguimiento" : "Validar evaluación y programar revisión",
        date: row.fecha_prediccion,
      })),
      ...allergyRows.map((row: any) => ({
        id: `allergy-${row.id_alergia}`,
        type: "allergy" as const,
        priority: "Crítica" as const,
        patientId: row.id_paciente,
        patientName: row.paciente,
        title: `Alergia a ${row.alergeno}`,
        reason: [row.severidad, row.reaccion].filter(Boolean).join(" · ") || "Alergia clínicamente relevante.",
        suggestedAction: "Verificar antes de prescribir",
        date: row.fecha,
      })),
      ...pressureRows.map((row: any) => ({
        id: `pressure-${row.id_medicion}`,
        type: "blood_pressure" as const,
        priority: row.presion_sistolica >= 180 || row.presion_diastolica >= 120 ? "Crítica" as const : "Alta" as const,
        patientId: row.id_paciente,
        patientName: row.paciente,
        title: "Presión arterial elevada",
        reason: `${row.presion_sistolica}/${row.presion_diastolica ?? "?"} mmHg en la última medición.`,
        suggestedAction: "Repetir medición y valorar al paciente",
        date: row.fecha_medicion,
      })),
      ...glucoseRows.map((row: any) => ({
        id: `glucose-${row.id_automonitoreo}`,
        type: "glucose" as const,
        priority: row.valor >= 250 ? "Crítica" as const : "Alta" as const,
        patientId: row.id_paciente,
        patientName: row.paciente,
        title: "Glucosa elevada",
        reason: `${row.valor} ${row.unidad || "mg/dL"} en el último automonitoreo.`,
        suggestedAction: "Contactar y confirmar síntomas",
        date: row.fecha_registro,
      })),
      ...overdueRows.map((row: any) => ({
        id: `appointment-${row.id_consulta}`,
        type: "overdue_appointment" as const,
        priority: "Alta" as const,
        patientId: row.id_paciente,
        patientName: row.paciente,
        title: "Cita vencida",
        reason: `${row.motivo_consulta || "Seguimiento"} no se completó en la fecha programada.`,
        suggestedAction: "Reprogramar cita",
        date: row.proxima_cita,
      })),
      ...followUpRows.map((row: any) => ({
        id: `follow-up-${row.id_paciente}`,
        type: "follow_up" as const,
        priority: "Media" as const,
        patientId: row.id_paciente,
        patientName: row.paciente,
        title: "Paciente sin seguimiento",
        reason: row.ultima_consulta ? `Última consulta hace más de 90 días.` : "No tiene consultas registradas.",
        suggestedAction: "Programar control",
        date: row.ultima_consulta,
      })),
      ...prescriptionRows.map((row: any) => ({
        id: `prescription-${row.id_receta}`,
        type: "prescription" as const,
        priority: "Media" as const,
        patientId: row.id_paciente,
        patientName: row.paciente,
        title: "Receta activa por revisar",
        reason: "La receta permanece activa después de 30 días.",
        suggestedAction: "Confirmar vigencia del tratamiento",
        date: row.fecha_emicion,
      })),
    ]

    alerts.sort((a, b) => rank[a.priority] - rank[b.priority] || new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    return NextResponse.json({ success: true, data: alerts.slice(0, 100) })
  } catch (error) {
    console.error("mobile clinical alerts error:", error)
    return NextResponse.json({ success: false, error: "No se pudieron generar las alertas clínicas" }, { status: 500 })
  }
})

function readableFactors(value: unknown): string {
  if (!value) return ""
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value
    if (Array.isArray(parsed)) return parsed.slice(0, 3).map((item) => typeof item === "string" ? item : item?.factor || item?.nombre).filter(Boolean).join(" + ")
  } catch {
    return String(value).split(/[;,]/).slice(0, 3).join(" + ")
  }
  return ""
}
