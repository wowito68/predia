import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ActivityIndicator, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFonts } from 'expo-font'
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium'
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold'
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold'
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold'
import { RootNavigator } from './src/navigation'
import { ThemeProvider, useColors } from './src/theme/context'
import { installWebAlertSupport } from './src/utils/webAlerts'

installWebAlertSupport()

// Defaults pensados para móvil: evitan refetches redundantes (datos clínicos que
// cambian poco) y reducen renders/consumo de red al navegar entre pantallas.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // datos "frescos" 1 min → sin refetch al re-montar
      gcTime: 10 * 60 * 1000, // cache en memoria 10 min
      retry: 1, // 1 reintento (evita esperas largas ante fallo)
      refetchOnReconnect: true,
    },
  },
})

function AppContent() {
  const colors = useColors()
  const [fontsReady] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  })

  if (!fontsReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
