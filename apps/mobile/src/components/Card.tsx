import { View, StyleSheet, ViewStyle } from 'react-native'
import { colors, radius, spacing } from '@/theme'

interface Props {
  children: React.ReactNode
  style?: ViewStyle
}

export function Card({ children, style }: Props) {
  return <View style={[s.card, style]}>{children}</View>
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
})
