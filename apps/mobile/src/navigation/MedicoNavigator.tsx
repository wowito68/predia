import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons, type IconName } from '@/components/icons'
import { HomeScreen } from '../screens/medico/HomeScreen'
import { AgendaScreen } from '../screens/medico/AgendaScreen'
import { PacientesScreen } from '../screens/medico/PacientesScreen'
import { AlertasScreen } from '../screens/medico/AlertasScreen'
import { PerfilScreen } from '../screens/medico/PerfilScreen'
import { PacienteDetalleScreen } from '../screens/medico/PacienteDetalleScreen'
import { SignosVitalesScreen } from '../screens/medico/SignosVitalesScreen'
import { DictadoNotasScreen } from '../screens/medico/DictadoNotasScreen'
import { CamaraClinicaScreen } from '../screens/medico/CamaraClinicaScreen'
import { ValidacionIAScreen } from '../screens/medico/ValidacionIAScreen'
import { FirmaScreen } from '../screens/medico/FirmaScreen'
import { HistorialClinicoScreen } from '../screens/medico/HistorialClinicoScreen'
import { useColors } from '../theme/context'
import { View } from 'react-native'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

const ICONS: Record<string, [IconName, IconName]> = {
  Inicio: ['home', 'home-outline'],
  Agenda: ['calendar', 'calendar-outline'],
  Pacientes: ['people', 'people-outline'],
  Alertas: ['alert-circle', 'alert-circle-outline'],
  Perfil: ['person', 'person-outline'],
}

function Tabs() {
  const colors = useColors()
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border, borderTopWidth: 0.5, backgroundColor: colors.surface, paddingTop: 7, height: 72, paddingBottom: 9 },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
        tabBarIcon: ({ color, focused }) => {
          const [active, inactive] = ICONS[route.name] ?? (['ellipse', 'ellipse-outline'] as [IconName, IconName])
          return (
            <View style={{ width: 38, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? colors.accentSoft : 'transparent' }}>
              <Ionicons name={focused ? active : inactive} size={21} color={color} />
            </View>
          )
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Pacientes" component={PacientesScreen} />
      <Tab.Screen name="Alertas" component={AlertasScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  )
}

export function MedicoNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="PacienteDetalle" component={PacienteDetalleScreen} />
      <Stack.Screen name="SignosVitales" component={SignosVitalesScreen} />
      <Stack.Screen name="DictadoNotas" component={DictadoNotasScreen} />
      <Stack.Screen name="CamaraClinica" component={CamaraClinicaScreen} />
      <Stack.Screen name="ValidacionIA" component={ValidacionIAScreen} />
      <Stack.Screen name="Firma" component={FirmaScreen} />
      <Stack.Screen name="HistorialClinico" component={HistorialClinicoScreen} />
    </Stack.Navigator>
  )
}
