import { useEffect } from 'react'
import { View, ActivityIndicator, AppState } from 'react-native'
import { NavigationContainer, DefaultTheme, DarkTheme, type Theme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuthStore, SESSION_TIMEOUT_MS } from '../store/authStore'
import { LoginScreen } from '../screens/LoginScreen'
import { PacienteNavigator } from './PacienteNavigator'
import { MedicoNavigator } from './MedicoNavigator'
import { EnfermeroNavigator } from './EnfermeroNavigator'
import { useTheme } from '../theme/context'

const Stack = createNativeStackNavigator()

export function RootNavigator() {
  const { user, isLoading, restore, logout, touch } = useAuthStore()
  const { colors, isDark } = useTheme()
  const base = isDark ? DarkTheme : DefaultTheme
  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.error,
    },
  }

  useEffect(() => {
    restore()
  }, [])

  // RNF: cerrar sesión por inactividad (15 min).
  useEffect(() => {
    const checkIdle = () => {
      const { token, lastActivity } = useAuthStore.getState()
      if (token && Date.now() - lastActivity > SESSION_TIMEOUT_MS) logout()
    }
    const interval = setInterval(checkIdle, 30 * 1000)
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') checkIdle()
    })
    return () => {
      clearInterval(interval)
      sub.remove()
    }
  }, [logout])

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  const isPaciente = user?.rol === 'PACIENTE'
  const isMedico = user?.rol === 'MEDICO' || user?.rol === 'ADMIN'
  const isEnfermero = user?.rol === 'ENFERMERO'

  return (
    <NavigationContainer theme={navTheme} onStateChange={touch}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : isPaciente ? (
          <Stack.Screen name="Paciente" component={PacienteNavigator} />
        ) : isMedico ? (
          <Stack.Screen name="Medico" component={MedicoNavigator} />
        ) : isEnfermero ? (
          <Stack.Screen name="Enfermero" component={EnfermeroNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
