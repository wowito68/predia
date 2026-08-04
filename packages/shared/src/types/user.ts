export type UserRole = 'ADMIN' | 'MEDICO' | 'ENFERMERO' | 'PACIENTE'

export interface AuthUser {
  id: number
  nombre: string
  email: string
  rol: UserRole
  /** Presente solo para usuarios con rol PACIENTE (app móvil). */
  id_paciente?: number
  curp?: string
}

export interface LoginResponse {
  user: AuthUser
  token: string
}
