import { ReactNode } from 'react'
import { View, Text, StyleSheet, StatusBar, RefreshControl, ScrollView, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@/components/icons'
import { spacing, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  right,
}: {
  title: string
  subtitle?: string
  eyebrow?: string
  onBack?: () => void
  right?: ReactNode
}) {
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <View style={[s.header, { paddingTop: insets.top + spacing.md }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={s.headerRow}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack} hitSlop={12} style={({ pressed }) => [s.backBtn, pressed && s.pressed]}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
        ) : null}
        <View style={s.headerCopy}>
          {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
          <Text style={s.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>{title}</Text>
          {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={s.right}>{right}</View> : null}
      </View>
    </View>
  )
}

export function Screen({
  children,
  scroll = false,
  refreshing,
  onRefresh,
  padded = true,
}: {
  children: ReactNode
  scroll?: boolean
  refreshing?: boolean
  onRefresh?: () => void
  padded?: boolean
}) {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  if (scroll) {
    return (
      <ScrollView
        style={s.root}
        contentContainerStyle={[padded && s.padded, { paddingBottom: insets.bottom + spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    )
  }
  return <View style={[s.root, padded && s.padded, { paddingBottom: insets.bottom + spacing.md }]}>{children}</View>
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  header: {
    backgroundColor: colors.background,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerCopy: { flex: 1 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.72 },
  eyebrow: {
    ...typography.overline,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  title: { ...typography.headline, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  right: { marginLeft: spacing.xs },
})
