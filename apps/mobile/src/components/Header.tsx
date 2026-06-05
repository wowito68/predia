import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { colors, spacing, fontSize } from '@/theme'

interface Props {
  title: string
  subtitle?: string
  showBack?: boolean
}

export function Header({ title, subtitle, showBack = false }: Props) {
  const nav = useNavigation()
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={s.row}>
        {showBack && (
          <TouchableOpacity onPress={() => nav.goBack()} style={s.back}>
            <Text style={s.backText}>←</Text>
          </TouchableOpacity>
        )}
        <View style={s.texts}>
          <Text style={s.title}>{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    paddingTop: 48,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  back: { marginRight: spacing.sm, marginTop: 2 },
  backText: { color: '#fff', fontSize: fontSize.xl, fontWeight: '300' },
  texts: { flex: 1 },
  title: { color: '#fff', fontSize: fontSize.xl, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm, marginTop: 2 },
})
