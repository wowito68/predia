import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text } from 'react-native'
import { DashboardScreen } from '../screens/paciente/DashboardScreen'
import { ResultadosScreen } from '../screens/paciente/ResultadosScreen'
import { ExpedienteScreen } from '../screens/paciente/ExpedienteScreen'
import { RecetasScreen } from '../screens/paciente/RecetasScreen'
import { CitasScreen } from '../screens/paciente/CitasScreen'
import { AutomonitoreoScreen } from '../screens/paciente/AutomonitoreoScreen'
import { TendenciasScreen } from '../screens/paciente/TendenciasScreen'
import { colors } from '../theme'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function MasStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CitasRoot" component={CitasScreen} />
      <Stack.Screen name="Automonitoreo" component={AutomonitoreoScreen} />
      <Stack.Screen name="Tendencias" component={TendenciasScreen} />
    </Stack.Navigator>
  )
}

const TAB_ICON: Record<string, string> = {
  Inicio: '⬤', Resul: '◈', Exped: '▣', Recetas: '◉', Más: '···',
}

export function PacienteNavigator() {
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
      <Tab.Screen name="Inicio"   component={DashboardScreen}  />
      <Tab.Screen name="Resul"    component={ResultadosScreen} options={{ title: 'Resul.' }} />
      <Tab.Screen name="Exped"    component={ExpedienteScreen} options={{ title: 'Exped.' }} />
      <Tab.Screen name="Recetas"  component={RecetasScreen}    />
      <Tab.Screen name="Más"      component={MasStack}         />
    </Tab.Navigator>
  )
}
