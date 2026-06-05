import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors, radius, fontSize } from '@/theme'

type Variant = 'success' | 'warning' | 'error' | 'info' | 'default'

interface Props {
  label: string
  variant?: Variant
  style?: ViewStyle
}

const variantStyles: Record<Variant, { bg: string; text: string }> = {
  success: { bg: colors.successBg, text: colors.successText },
  warning: { bg: colors.warningBg, text: colors.warningText },
  error:   { bg: colors.errorBg,   text: colors.errorText },
  info:    { bg: colors.infoBg,    text: colors.infoText },
  default: { bg: colors.border,    text: colors.textSecondary },
}

export function Badge({ label, variant = 'default', style }: Props) {
  const v = variantStyles[variant]
  return (
    <View style={[s.badge, { backgroundColor: v.bg }, style]}>
      <Text style={[s.text, { color: v.text }]}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: { fontSize: fontSize.xs, fontWeight: '600' },
})
