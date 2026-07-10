import { ReactNode, useEffect, useRef } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextInput,
  TextInputProps,
  Animated,
  Easing,
  Platform,
} from 'react-native'
import { Ionicons } from '@/components/icons'
import type { IconName } from '@/components/icons'
import { radius, spacing, fontSize, typography, riskColor, shadows, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

export function Avatar({
  nombre,
  apellido,
  size = 46,
  color,
  image,
}: {
  nombre?: string
  apellido?: string
  size?: number
  color?: string
  image?: string | null
}) {
  const { colors } = useTheme()
  const tint = color ?? colors.primary
  const initials = `${nombre?.[0] ?? ''}${apellido?.[0] ?? ''}`.toUpperCase() || '?'
  return (
    <View style={[s.avatarBase, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${tint}14` }]}>
      <Text style={{ fontFamily: typography.family.bold, color: tint, fontSize: Math.max(14, size * 0.36) }}>{initials}</Text>
    </View>
  )
}

export function RiskPill({ nivel, pct }: { nivel?: string | null; pct?: number }) {
  const { colors } = useTheme()
  const r = riskColor(nivel ?? 'BAJO', colors)
  return (
    <View style={[s.pillBase, { backgroundColor: r.bg }]}>
      <View style={[s.dotBase, { backgroundColor: r.text }]} />
      <Text style={[s.pillTextBase, { color: r.text }]}>{pct != null ? `${r.label} · ${Math.round(pct)}%` : r.label}</Text>
    </View>
  )
}

export function StatusBadge({
  label,
  tone = 'neutral',
  style,
}: {
  label: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
  style?: ViewStyle
}) {
  const { colors } = useTheme()
  const palette = {
    neutral: { bg: colors.surfaceMuted, text: colors.textSecondary },
    success: { bg: colors.successBg, text: colors.successText },
    warning: { bg: colors.warningBg, text: colors.warningText },
    danger: { bg: colors.errorBg, text: colors.errorText },
    info: { bg: colors.infoBg, text: colors.infoText },
  }[tone]
  return (
    <View style={[s.pillBase, { backgroundColor: palette.bg }, style]}>
      <Text style={[s.pillTextBase, { color: palette.text }]}>{label}</Text>
    </View>
  )
}

export function SectionTitle({ children, action, onAction }: { children: ReactNode; action?: string; onAction?: () => void }) {
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{children}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} style={({ pressed }) => pressed && s.pressed}>
          <Text style={s.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function PremiumCard({ children, style, elevated = false }: { children: ReactNode; style?: ViewStyle; elevated?: boolean }) {
  const s = useThemedStyles(makeStyles)
  return <View style={[s.card, elevated && shadows.sm, style]}>{children}</View>
}

export function StatTile({
  icon,
  value,
  label,
  tint,
  onPress,
}: {
  icon: IconName
  value: string | number
  label: string
  tint?: string
  onPress?: () => void
}) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const color = tint ?? colors.primary
  const content = (
    <>
      <View style={[s.statIcon, { backgroundColor: `${color}12` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
    </>
  )
  if (!onPress) return <View style={s.stat}>{content}</View>
  return <Pressable style={({ pressed }) => [s.stat, pressed && s.pressed]} onPress={onPress}>{content}</Pressable>
}

export function QuickAction({ icon, label, tint, onPress }: { icon: IconName; label: string; tint?: string; onPress?: () => void }) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const color = tint ?? colors.primary
  return (
    <Pressable style={({ pressed }) => [s.qa, pressed && s.pressed]} onPress={onPress}>
      <View style={[s.qaIcon, { backgroundColor: `${color}12` }]}>
        <Ionicons name={icon} size={21} color={color} />
      </View>
      <Text style={s.qaLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  )
}

export function ListRow({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: ViewStyle }) {
  const s = useThemedStyles(makeStyles)
  if (!onPress) return <View style={[s.row, style]}>{children}</View>
  return (
    <Pressable style={({ pressed }) => [s.row, style, pressed && s.pressed]} onPress={onPress}>
      {children}
    </Pressable>
  )
}

export function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  tint,
}: {
  icon: IconName
  title: string
  subtitle?: string
  onPress?: () => void
  tint?: string
}) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const color = tint ?? colors.primary
  return (
    <ListRow onPress={onPress}>
      <View style={[s.actionIcon, { backgroundColor: `${color}12` }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.actionTitle}>{title}</Text>
        {subtitle ? <Text style={s.actionSub}>{subtitle}</Text> : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={17} color={colors.textMuted} /> : null}
    </ListRow>
  )
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon?: IconName
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
}) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}><Ionicons name={icon} size={28} color={colors.textSecondary} /></View>
      <Text style={s.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={s.emptySub}>{subtitle}</Text> : null}
      {actionLabel ? <PrimaryButton label={actionLabel} onPress={onAction} variant="secondary" style={{ marginTop: spacing.md }} /> : null}
    </View>
  )
}

export function Skeleton({ width = '100%', height = 16, style }: { width?: number | string; height?: number; style?: ViewStyle }) {
  const { colors } = useTheme()
  const op = useRef(new Animated.Value(0.45)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.9, duration: 760, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(op, { toValue: 0.45, duration: 760, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [op])
  return <Animated.View style={[{ width: width as any, height, borderRadius: radius.md, backgroundColor: colors.border, opacity: op }, style]} />
}

export function CardSkeleton() {
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.skelCard}>
      <Skeleton width={'48%'} height={14} />
      <Skeleton width={'86%'} height={12} style={{ marginTop: 12 }} />
      <Skeleton width={'58%'} height={12} style={{ marginTop: 8 }} />
    </View>
  )
}

export function PrimaryButton({
  label,
  icon,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string
  icon?: IconName
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  disabled?: boolean
  style?: ViewStyle
}) {
  const { colors, isDark } = useTheme()
  const s = useThemedStyles(makeStyles)
  const palette = {
    primary: { bg: colors.primary, fg: isDark ? colors.background : '#FFFFFF', border: colors.primary },
    secondary: { bg: colors.surface, fg: colors.primary, border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.error, fg: '#FFFFFF', border: colors.error },
  }[variant]
  return (
    <Pressable
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.5 : pressed ? 0.78 : 1 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {icon ? <Ionicons name={icon} size={17} color={palette.fg} /> : null}
      <Text style={[s.btnText, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  )
}

export function SearchField({ style, ...props }: TextInputProps & { style?: ViewStyle }) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <View style={[s.search, style]}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        {...props}
        placeholderTextColor={colors.textMuted}
        style={s.searchInput}
      />
    </View>
  )
}

export function TextField({ style, inputStyle, ...props }: TextInputProps & { style?: ViewStyle; inputStyle?: TextInputProps['style'] }) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <View style={[s.fieldWrap, style]}>
      <TextInput
        {...props}
        placeholderTextColor={colors.textMuted}
        style={[s.fieldInput, inputStyle]}
      />
    </View>
  )
}

export { Ionicons }
export type { IconName }

// Estilos base no dependientes del tema (forma/espaciado de píldoras y avatar).
const s = StyleSheet.create({
  avatarBase: { alignItems: 'center', justifyContent: 'center' },
  pillBase: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, alignSelf: 'flex-start' },
  dotBase: { width: 6, height: 6, borderRadius: 3 },
  pillTextBase: { ...typography.overline },
})

const makeStyles = (colors: AppColors) => StyleSheet.create({
  pressed: { opacity: 0.72 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm, marginTop: spacing.xl },
  sectionTitle: { fontFamily: typography.family.semibold, fontSize: 18, lineHeight: 24, color: colors.textPrimary },
  sectionAction: { ...typography.caption, color: colors.accent },
  card: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.md, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, minHeight: 118 },
  statIcon: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  statValue: { ...typography.headline, color: colors.textPrimary },
  statLabel: { ...typography.overline, color: colors.textSecondary },
  qa: { flex: 1, alignItems: 'center', gap: 8, minHeight: 88, justifyContent: 'center' },
  qaIcon: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 16 },
  row: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  actionIcon: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  actionSub: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 44, paddingHorizontal: spacing.lg },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { ...typography.bodyMedium, color: colors.textPrimary, textAlign: 'center' },
  emptySub: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: 4, maxWidth: 260 },
  skelCard: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.xs, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  btn: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.sm, paddingVertical: 12, paddingHorizontal: 18, borderWidth: 1 },
  btnText: { ...typography.bodyMedium },
  search: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radius.sm, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, paddingVertical: 0 },
  fieldWrap: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  fieldInput: { ...typography.body, color: colors.textPrimary, minHeight: 48, paddingHorizontal: spacing.sm, paddingVertical: Platform.OS === 'ios' ? 12 : 8 },
})
