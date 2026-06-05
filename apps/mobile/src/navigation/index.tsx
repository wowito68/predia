import { useEffect } from 'react'
import { View, ActivityIndicator, AppState } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuthStore, SESSION_TIMEOUT_MS } from '../store/authStore'
import { LoginScreen } from '../screens/LoginScreen'
import { PacienteNavigator } from './PacienteNavigator'
import { MedicoNavigator } from './MedicoNavigator'
import { colors } from '../theme'

const Stack = createNativeStackNavigator()

export function RootNavigator() {
  const { user, isLoading, restore, logout, touch } = useAuthStore()

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  const isPaciente = user?.rol === 'PACIENTE'
  const isMedico = user?.rol === 'MEDICO' || user?.rol === 'ADMIN' || user?.rol === 'ENFERMERO'

  return (
    <NavigationContainer onStateChange={touch}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : isPaciente ? (
          <Stack.Screen name="Paciente" component={PacienteNavigator} />
        ) : isMedico ? (
          <Stack.Screen name="Medico" component={MedicoNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
