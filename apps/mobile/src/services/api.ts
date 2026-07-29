// Cliente HTTP de PREDIA móvil.
// - Adjunta el token (Bearer) desde el authStore.
// - Desempaqueta el envelope { success, data } del backend.
// - Cierra sesión automáticamente ante un 401.
import { useAuthStore } from '@/store/authStore'
import type {
  AuthUser,
  PacienteDashboard,
  PrediccionResponse,
  RecetaResumen,
  CitaResumen,
  AutomonitoreoRegistro,
  AutomonitoreoInput,
  ExpedienteResumen,
  AgendaItem,
  PacienteDetalle,
  ValidarPrediccionInput,
} from '@predia/shared'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api'

export interface LoginResult {
  token: string
  refreshToken?: string
  user: AuthUser
}

// Paciente tal como lo devuelve la lista del médico (/api/pacientes)
export interface PacienteListItem {
  id_paciente: number
  cedula: string
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
  genero: string
  edad: number | null
  telefono: string | null
  tipo_sangre: string | null
  nivel_riesgo: string | null
  probabilidad_diabetes: number | null
  ultima_consulta: string | null
}

// Predicción tal como la devuelve la lista del médico (/api/predicciones)
export interface PrediccionListItem {
  id_prediccion: number
  id_paciente: number
  fecha_prediccion: string
  nivel_riesgo: string
  resultado: string
  probabilidad_diabetes: number
  validado: boolean
  diagnostico_confirmado: string
  paciente_nombre: string
}

// Entrada para captura de signos vitales del médico (/api/mediciones POST)
export interface SignosVitalesInput {
  id_paciente: number
  peso?: number
  altura?: number
  presion_sistolica?: number
  presion_diastolica?: number
  circunferencia_cintura?: number
  circunferencia_cadera?: number
  observaciones?: string
}

// Medición clínica (/api/mediciones), capturada por el personal
export interface MedicionClinica {
  id_medicion: number
  fecha_medicion: string
  peso: number | null
  altura: number | null
  imc: number | null
  presion_sistolica: number | null
  presion_diastolica: number | null
}

// Entrada para crear receta (/api/recetas POST)
export interface RecetaInput {
  id_paciente: number
  medicamentos: { nombre: string; dosis?: string; frecuencia?: string; duracion?: string }[]
  instrucciones?: string
}

export interface ConsultaInput {
  id_paciente: number
  motivo_consulta: string
  sintomas?: string
  exploracion_fisica?: string
  diagnostico?: string
  tratamiento?: string
  receta?: string
  proxima_cita?: string
  observaciones?: string
}

export interface ClinicalAlert {
  id: string
  type: 'risk' | 'allergy' | 'blood_pressure' | 'glucose' | 'overdue_appointment' | 'follow_up' | 'prescription'
  priority: 'Crítica' | 'Alta' | 'Media'
  patientId: number
  patientName: string
  title: string
  reason: string
  suggestedAction: string
  date: string | null
}

export interface ClinicalTimelineItem {
  id: string
  kind: string
  title: string
  detail: string
  date: string
}

export interface ClinicalSnapshot {
  paciente: PacienteDetalle & { nombre_completo: string }
  risk: null | {
    nivel: string
    titulo: string
    descripcion: string
    accionClinica: string
    fecha: string
    validado: boolean
    recomendaciones?: { seguimiento: string; acciones: string[] }
    explanation?: { contribuyen: { factor: string }[]; protegen: { factor: string }[] }
  }
  alerts: { type: string; severity: 'critical' | 'warning' | 'info'; title: string; detail: string }[]
  summary: {
    proximaCita: { proxima_cita: string; motivo_consulta: string } | null
    ultimaConsulta: any | null
    ultimaMedicion: MedicionClinica | null
    ultimaGlucosa: { valor: number; unidad?: string; fecha_registro: string } | null
    recetasActivas: RecetaResumen[]
    documentosRecientes: any[]
    alergias: { id_alergia: number; alergeno: string; severidad?: string; reaccion?: string }[]
    alergiasCriticas: { id_alergia: number; alergeno: string; severidad?: string; reaccion?: string }[]
    patologias: any[]
  }
  timeline: ClinicalTimelineItem[]
}

interface RequestOpts {
  auth?: boolean
  multipart?: boolean
}

async function refreshAccessToken() {
  const { refreshToken, login, logout } = useAuthStore.getState()
  if (!refreshToken) return false

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.token || !json?.user) {
      await logout()
      return false
    }
    await login(json.user, json.token, json.refreshToken)
    return true
  } catch {
    await logout()
    return false
  }
}

async function request<T>(path: string, options: RequestInit = {}, opts: RequestOpts = {}): Promise<T> {
  const { auth = true, multipart = false } = opts
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) }
  if (!multipart) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = useAuthStore.getState().token
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa tu conexión.')
  }

  let json: any = null
  try {
    json = await res.json()
  } catch {
    /* respuesta sin cuerpo JSON */
  }

  if (res.status === 401 && auth) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${useAuthStore.getState().token}` }
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers: retryHeaders })
      try {
        json = await res.json()
      } catch {
        json = null
      }
    } else {
      await useAuthStore.getState().logout()
    }
  }

  if (!res.ok) {
    throw new Error(json?.error ?? json?.message ?? `Error ${res.status}`)
  }

  // Endpoints estándar: { success, data }. Login/voz: objeto plano.
  return (json && json.data !== undefined ? json.data : json) as T
}

// El backend devuelve roles en español ("Médico"); la app usa el enum de @predia/shared.
function normalizeRol(rol: string): AuthUser['rol'] {
  const r = (rol || '').toUpperCase()
  if (r.startsWith('ADMIN')) return 'ADMIN'
  if (r.startsWith('MÉD') || r.startsWith('MED')) return 'MEDICO'
  if (r.startsWith('ENF')) return 'ENFERMERO'
  if (r.startsWith('PAC')) return 'PACIENTE'
  return 'MEDICO'
}

export const api = {
  auth: {
    loginPaciente: (curp: string, pin: string) =>
      request<LoginResult>('/auth/login-paciente', {
        method: 'POST',
        body: JSON.stringify({ curp, pin }),
      }, { auth: false }),

    loginMedico: async (username: string, password: string): Promise<LoginResult> => {
      // /auth/login devuelve user como JWTPayload (id_usuario, nombre_completo, rol en español)
      const raw = await request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }, { auth: false })
      const u = raw.user ?? {}
      const user: AuthUser = {
        id: u.id_usuario ?? u.id ?? 0,
        nombre: u.nombre_completo ?? u.nombre ?? u.username ?? 'Usuario',
        email: u.email ?? '',
        rol: normalizeRol(u.rol),
      }
      return { token: raw.token, user }
    },
  },

  paciente: {
    dashboard: (id: number) => request<PacienteDashboard>(`/pacientes/${id}/dashboard`),
    prediccion: (id: number) => request<PrediccionResponse>(`/pacientes/${id}/prediccion`),
    recetas: (id: number) => request<RecetaResumen[]>(`/pacientes/${id}/recetas`),
    citas: (id: number) => request<CitaResumen[]>(`/pacientes/${id}/citas`),
    expediente: (id: number) => request<ExpedienteResumen>(`/pacientes/${id}/expediente`),

    automonitoreo: (id: number, tipo?: AutomonitoreoRegistro['tipo'], dias = 90) =>
      request<AutomonitoreoRegistro[]>(
        `/pacientes/${id}/automonitoreo?dias=${dias}${tipo ? `&tipo=${tipo}` : ''}`,
      ),

    addAutomonitoreo: (id: number, input: AutomonitoreoInput) =>
      request<AutomonitoreoRegistro>(`/pacientes/${id}/automonitoreo`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  },

  medico: {
    agenda: () => request<AgendaItem[]>('/agenda'),
    crearCita: (input: { id_paciente: number; fecha: string; motivo: string }) =>
      request<AgendaItem>('/agenda', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    actualizarCita: (
      idCita: number,
      input: {
        action: 'INICIAR' | 'FINALIZAR' | 'EDITAR' | 'REAGENDAR' | 'CANCELAR'
        fecha?: string
        motivo?: string
        observaciones?: string
        diagnostico?: string
        tratamiento?: string
      },
    ) =>
      request<AgendaItem>(`/agenda/${idCita}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    alertasClinicas: () => request<ClinicalAlert[]>('/mobile/clinical-alerts'),
    // Lista de pacientes (con riesgo y última consulta). `q` filtra por nombre/cédula.
    pacientes: (q?: string, page = 1, limit = 20) =>
      request<PacienteListItem[]>(`/pacientes?page=${page}&limit=${limit}${q ? `&search=${encodeURIComponent(q)}` : ''}`),
    paciente: (id: number) => request<PacienteDetalle>(`/pacientes/${id}`),
    snapshot: (id: number) => request<ClinicalSnapshot>(`/pacientes/${id}/clinical-snapshot`),
    expediente: (id: number) => request<ExpedienteResumen>(`/pacientes/${id}/expediente`),
    recetas: (id: number) => request<RecetaResumen[]>(`/pacientes/${id}/recetas`),
    mediciones: (idPaciente: number) =>
      request<MedicionClinica[]>(`/mediciones?id_paciente=${idPaciente}&limit=10`),

    predicciones: (idPaciente?: number) =>
      request<PrediccionListItem[]>(
        `/predicciones${idPaciente ? `?id_paciente=${idPaciente}&limit=50` : '?limit=50'}`,
      ),

    validarPrediccion: (id: number, input: ValidarPrediccionInput) =>
      request<unknown>(`/predicciones/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),

    addSignos: (datos: SignosVitalesInput) =>
      request<unknown>('/mediciones', {
        method: 'POST',
        body: JSON.stringify(datos),
      }),

    crearReceta: (datos: RecetaInput) =>
      request<{ id_receta: number }>('/recetas', {
        method: 'POST',
        body: JSON.stringify({ ...datos, medicamentos: JSON.stringify(datos.medicamentos) }),
      }),

    crearConsulta: (datos: ConsultaInput) =>
      request<{ id_consulta: number }>('/consultas', {
        method: 'POST',
        body: JSON.stringify(datos),
      }),

    // multipart/form-data → el caller construye el FormData (archivo: {uri,name,type})
    subirImagen: (form: FormData) =>
      request<{ id_imagen: number }>('/imagenes', { method: 'POST', body: form }, { multipart: true }),

    transcribir: (form: FormData) =>
      request<{ text: string; isMock?: boolean }>('/voice/transcribe', { method: 'POST', body: form }, { multipart: true }),
  },
}
