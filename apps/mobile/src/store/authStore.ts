import { create } from 'zustand'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import type { AuthUser } from '@predia/shared'

// RNF: la sesión expira tras 15 min de inactividad.
export const SESSION_TIMEOUT_MS = 15 * 60 * 1000

interface AuthState {
  user: AuthUser | null
  token: string | null
  refreshToken: string | null
  isLoading: boolean
  lastActivity: number
  // Sesión persistida pendiente de desbloqueo biométrico (al reabrir la app).
  pendingUser: AuthUser | null
  hasStoredSession: boolean

  login: (user: AuthUser, token: string, refreshToken?: string) => Promise<void>
  unlockWithStored: () => Promise<boolean>
  logout: () => Promise<void>
  restore: () => Promise<void>
  touch: () => void
}

async function persist(user: AuthUser, token: string, refreshToken?: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem('token', token)
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(user))
    return
  }
  await SecureStore.setItemAsync('token', token)
  if (refreshToken) await SecureStore.setItemAsync('refreshToken', refreshToken)
  await SecureStore.setItemAsync('user', JSON.stringify(user))
}

async function getStoredSession() {
  if (Platform.OS === 'web') {
    return {
      token: localStorage.getItem('token'),
      refreshToken: localStorage.getItem('refreshToken'),
      userStr: localStorage.getItem('user'),
    }
  }
  return {
    token: await SecureStore.getItemAsync('token'),
    refreshToken: await SecureStore.getItemAsync('refreshToken'),
    userStr: await SecureStore.getItemAsync('user'),
  }
}

async function clearStoredSession() {
  if (Platform.OS === 'web') {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    return
  }
  await SecureStore.deleteItemAsync('token')
  await SecureStore.deleteItemAsync('refreshToken')
  await SecureStore.deleteItemAsync('user')
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  lastActivity: Date.now(),
  pendingUser: null,
  hasStoredSession: false,

  // Login con credenciales (CURP+PIN o usuario+contraseña).
  login: async (user, token, refreshToken) => {
    await persist(user, token, refreshToken)
    set({ user, token, refreshToken: refreshToken ?? null, pendingUser: null, hasStoredSession: false, lastActivity: Date.now() })
  },

  // Tras biometría correcta: activa la sesión guardada.
  unlockWithStored: async () => {
    try {
      const { token, refreshToken, userStr } = await getStoredSession()
      if (token && userStr) {
        set({
          user: JSON.parse(userStr) as AuthUser,
          token,
          refreshToken: refreshToken ?? null,
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
    await clearStoredSession()
    set({ user: null, token: null, refreshToken: null, pendingUser: null, hasStoredSession: false })
  },

  // Al abrir la app: si hay sesión guardada, queda BLOQUEADA hasta desbloqueo biométrico.
  restore: async () => {
    try {
      const { token, refreshToken, userStr } = await getStoredSession()
      if (token && userStr) {
        if (Platform.OS === 'web') {
          set({ user: JSON.parse(userStr) as AuthUser, token, refreshToken: refreshToken ?? null, lastActivity: Date.now() })
        } else {
          set({ pendingUser: JSON.parse(userStr) as AuthUser, hasStoredSession: true })
        }
      }
    } finally {
      set({ isLoading: false })
    }
  },

  touch: () => set({ lastActivity: Date.now() }),
}))
