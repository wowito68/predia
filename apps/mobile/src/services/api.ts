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
  user: AuthUser
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

interface RequestOpts {
  auth?: boolean
  multipart?: boolean
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
    // Token inválido o expirado: cerrar sesión.
    useAuthStore.getState().logout()
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
    paciente: (id: number) => request<PacienteDetalle>(`/pacientes/${id}`),
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

    // multipart/form-data → el caller construye el FormData (archivo: {uri,name,type})
    subirImagen: (form: FormData) =>
      request<{ id_imagen: number }>('/imagenes', { method: 'POST', body: form }, { multipart: true }),

    transcribir: (form: FormData) =>
      request<{ text: string; isMock?: boolean }>('/voice/transcribe', { method: 'POST', body: form }, { multipart: true }),
  },
}
