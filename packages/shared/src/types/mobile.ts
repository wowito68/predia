// Tipos compartidos para la app móvil PREDIA.
// Reflejan EXACTAMENTE la forma del campo `data` que devuelven los endpoints
// (apps/web/app/api/...), tras desempaquetar el envelope { success, data }.

import type { AuthUser } from "./user"

export type NivelRiesgo = "ALTO" | "MEDIO" | "BAJO" | string

// ---- Autenticación ----
export interface LoginResult {
  token: string
  user: AuthUser
}

// ---- PACIENTE: Dashboard (RF02) ----
export interface GlucosaPunto {
  valor: number
  fecha: string
}
export interface ProximaCita {
  fecha: string
  motivo: string
}
export interface PacienteDashboard {
  nivel_riesgo: NivelRiesgo | null
  probabilidad_diabetes: number | null
  fecha_prediccion: string | null
  proxima_cita: ProximaCita | null
  recetas_activas: number
  glucosa: GlucosaPunto[]
}

// ---- PACIENTE: Predicción IA (RF03) ----
export interface PrediccionResumen {
  id_prediccion: number
  fecha: string
  nivel_riesgo: NivelRiesgo
  resultado: string
  probabilidad_diabetes: number
  probabilidad_no_diabetes: number
  recomendaciones: string[] | string | null
  factores_riesgo: string[] | string | null
  validado: boolean
  diagnostico_confirmado: string
}
export interface PrediccionResponse {
  ultima: PrediccionResumen | null
  historico: PrediccionResumen[]
}

// ---- PACIENTE: Recetas (RF05) ----
export interface Medicamento {
  nombre: string
  dosis?: string
  frecuencia?: string
  duracion?: string
}
export interface RecetaResumen {
  id_receta: number
  fecha_emision: string
  medicamentos: Medicamento[] | string | null
  instrucciones: string | null
  estado: string
  medico: string
}

// ---- PACIENTE: Citas (RF06) ----
export interface CitaResumen {
  id_consulta: number
  fecha: string
  motivo: string
  medico: string
}

// ---- PACIENTE: Automonitoreo / Tendencias (RF07/RF08) ----
export type TipoAutomonitoreo = "glucosa" | "peso" | "presion"
export interface AutomonitoreoRegistro {
  id_automonitoreo: number
  tipo: TipoAutomonitoreo
  valor: number
  valor_secundario: number | null
  unidad: string | null
  notas: string | null
  fecha_registro: string
}
export interface AutomonitoreoInput {
  tipo: TipoAutomonitoreo
  valor: number
  valor_secundario?: number
  unidad?: string
  notas?: string
}

// ---- PACIENTE: Expediente read-only (RF04) ----
export interface ExpedienteAlergia {
  id_alergia: number
  tipo_alergia: string
  alergeno: string
  severidad: string | null
  reaccion: string | null
}
export interface ExpedientePatologia {
  id_diagnostico: number
  patologia: string
  codigo_cie10: string | null
  estado: string
  severidad: string | null
  fecha_diagnostico: string
}
export interface ExpedienteConsulta {
  id_consulta: number
  fecha_consulta: string
  motivo_consulta: string
  diagnostico: string | null
}
export interface ExpedienteResumen {
  paciente: {
    id_paciente: number
    cedula: string
    nombre: string
    apellido_paterno: string
    apellido_materno: string | null
    nombre_completo: string
    genero: string
    fecha_nacimiento: string
    edad: number | null
    tipo_sangre: string | null
    telefono: string | null
    email: string | null
  }
  alergias: ExpedienteAlergia[]
  patologias: ExpedientePatologia[]
  consultas: ExpedienteConsulta[]
}

// ---- MÉDICO: Agenda (RF10) — forma del endpoint /api/agenda (Prisma) ----
export interface AgendaItem {
  id_consulta: number
  proxima_cita: string
  motivo_consulta: string
  paciente: {
    id_paciente: number
    nombre: string
    apellido_paterno: string
    telefono: string | null
  }
  usuario: {
    nombre: string
    apellido_paterno: string
  }
}

// ---- MÉDICO: Expediente del paciente (/api/pacientes/[id]) ----
export interface PacienteDetalle {
  id_paciente: number
  cedula: string
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
  genero: string
  fecha_nacimiento: string
  edad: number | null
  telefono: string | null
  email: string | null
  tipo_sangre: string | null
}

// ---- MÉDICO: Validación de predicción (RF15) ----
export interface ValidarPrediccionInput {
  diagnostico_confirmado?: string
  notas_medicas?: string
  validado?: boolean
}
