import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text } from 'react-native'
import { AgendaScreen } from '../screens/medico/AgendaScreen'
import { ExpedienteRapidoScreen } from '../screens/medico/ExpedienteRapidoScreen'
import { SignosVitalesScreen } from '../screens/medico/SignosVitalesScreen'
import { DictadoNotasScreen } from '../screens/medico/DictadoNotasScreen'
import { CamaraClinicaScreen } from '../screens/medico/CamaraClinicaScreen'
import { ValidacionIAScreen } from '../screens/medico/ValidacionIAScreen'
import { AlertasScreen } from '../screens/medico/AlertasScreen'
import { FirmaScreen } from '../screens/medico/FirmaScreen'
import { colors } from '../theme'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function PacienteStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="IF-M04" component={ExpedienteRapidoScreen} />
      <Stack.Screen name="IF-M05" component={SignosVitalesScreen} />
      <Stack.Screen name="IF-M06" component={DictadoNotasScreen} />
      <Stack.Screen name="IF-M07" component={CamaraClinicaScreen} />
      <Stack.Screen name="IF-M10" component={FirmaScreen} />
    </Stack.Navigator>
  )
}

function MasStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AlertasRoot" component={AlertasScreen} />
      <Stack.Screen name="Firma" component={FirmaScreen} />
    </Stack.Navigator>
  )
}

const TAB_ICON: Record<string, string> = {
  Agenda: '⬤', 'Pacien.': '◈', IA: '◈', 'Más': '···',
}

export function MedicoNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border },
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 16, color }}>{TAB_ICON[route.name] ?? '·'}</Text>
        ),
      })}
    >
      <Tab.Screen name="Agenda"    component={AgendaScreen}      />
      <Tab.Screen name="Pacien."   component={PacienteStack}     />
      <Tab.Screen name="IA"        component={ValidacionIAScreen} />
      <Tab.Screen name="Más"       component={MasStack}          />
    </Tab.Navigator>
  )
}
