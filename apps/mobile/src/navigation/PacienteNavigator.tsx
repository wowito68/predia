import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons, type IconName } from '@/components/icons'
import { DashboardScreen } from '../screens/paciente/DashboardScreen'
import { IndicadoresScreen } from '../screens/paciente/IndicadoresScreen'
import { RecomendacionesScreen } from '../screens/paciente/RecomendacionesScreen'
import { ResultadosScreen } from '../screens/paciente/ResultadosScreen'
import { ExpedienteScreen } from '../screens/paciente/ExpedienteScreen'
import { RecetasScreen } from '../screens/paciente/RecetasScreen'
import { CitasScreen } from '../screens/paciente/CitasScreen'
import { AutomonitoreoScreen } from '../screens/paciente/AutomonitoreoScreen'
import { TendenciasScreen } from '../screens/paciente/TendenciasScreen'
import { useColors } from '../theme/context'
import { View } from 'react-native'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

const icons: Record<string, [IconName, IconName]> = {
  Inicio: ['home', 'home-outline'],
  Indicadores: ['stats-chart', 'stats-chart-outline'],
  Recetas: ['document-text', 'document-text-outline'],
  Recomendaciones: ['heart', 'heart-outline'],
}

function PatientTabs() {
  const colors = useColors()
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border, borderTopWidth: 0.5, backgroundColor: colors.surface, paddingTop: 7, height: 72, paddingBottom: 9 },
        tabBarLabelStyle: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
        tabBarIcon: ({ color, focused }) => {
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline']
          return (
            <View style={{ width: 38, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? colors.accentSoft : 'transparent' }}>
              <Ionicons name={focused ? active : inactive} size={21} color={color} />
            </View>
          )
        },
      })}
    >
      <Tab.Screen name="Inicio" component={DashboardScreen} />
      <Tab.Screen name="Indicadores" component={IndicadoresScreen} />
      <Tab.Screen name="Recetas" component={RecetasScreen} />
      <Tab.Screen name="Recomendaciones" component={RecomendacionesScreen} options={{ tabBarLabel: 'Consejos' }} />
    </Tab.Navigator>
  )
}

export function PacienteNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={PatientTabs} />
      <Stack.Screen name="Citas" component={CitasScreen} />
      <Stack.Screen name="Expediente" component={ExpedienteScreen} />
      <Stack.Screen name="Automonitoreo" component={AutomonitoreoScreen} />
      <Stack.Screen name="Tendencias" component={TendenciasScreen} />
      <Stack.Screen name="Resultados" component={ResultadosScreen} />
    </Stack.Navigator>
  )
}
