import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import type { AuthUser } from '@predia/shared'

// RNF: la sesión expira tras 15 min de inactividad.
export const SESSION_TIMEOUT_MS = 15 * 60 * 1000

interface AuthState {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  lastActivity: number
  // Sesión persistida pendiente de desbloqueo biométrico (al reabrir la app).
  pendingUser: AuthUser | null
  hasStoredSession: boolean

  login: (user: AuthUser, token: string) => Promise<void>
  unlockWithStored: () => Promise<boolean>
  logout: () => Promise<void>
  restore: () => Promise<void>
  touch: () => void
}

async function persist(user: AuthUser, token: string) {
  await SecureStore.setItemAsync('token', token)
  await SecureStore.setItemAsync('user', JSON.stringify(user))
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  lastActivity: Date.now(),
  pendingUser: null,
  hasStoredSession: false,

  // Login con credenciales (CURP+PIN o usuario+contraseña).
  login: async (user, token) => {
    await persist(user, token)
    set({ user, token, pendingUser: null, hasStoredSession: false, lastActivity: Date.now() })
  },

  // Tras biometría correcta: activa la sesión guardada.
  unlockWithStored: async () => {
    try {
      const token = await SecureStore.getItemAsync('token')
      const userStr = await SecureStore.getItemAsync('user')
      if (token && userStr) {
        set({
          user: JSON.parse(userStr) as AuthUser,
          token,
          pendingUser: null,
          hasStoredSession: false,
          lastActivity: Date.now(),
        })
        return true
      }
    } catch {
      /* ignore */
    }
    return false
  },

  // Cierra sesión por completo (borra credenciales almacenadas).
  logout: async () => {
    await SecureStore.deleteItemAsync('token')
    await SecureStore.deleteItemAsync('user')
    set({ user: null, token: null, pendingUser: null, hasStoredSession: false })
  },

  // Al abrir la app: si hay sesión guardada, queda BLOQUEADA hasta desbloqueo biométrico.
  restore: async () => {
    try {
      const token = await SecureStore.getItemAsync('token')
      const userStr = await SecureStore.getItemAsync('user')
      if (token && userStr) {
        set({ pendingUser: JSON.parse(userStr) as AuthUser, hasStoredSession: true })
      }
    } finally {
      set({ isLoading: false })
    }
  },

  touch: () => set({ lastActivity: Date.now() }),
}))
