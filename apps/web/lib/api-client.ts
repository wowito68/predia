// lib/api-client.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export class ApiClient {
  private token: string | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token')
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error en la petición')
    }

    return response.json()
  }

  // Auth
  async login(username: string, password: string) {
    const data = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    
    if (data.token) {
      this.token = data.token
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
    }
    
    return data
  }

  // Pacientes
  async getPacientes(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams(params as any).toString()
    return this.request<any>(`/pacientes?${query}`)
  }

  async createPaciente(data: any) {
    return this.request<any>('/pacientes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Predicciones
  async createPrediccion(data: any) {
    return this.request<any>('/predicciones/nueva', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

export const apiClient = new ApiClient()
