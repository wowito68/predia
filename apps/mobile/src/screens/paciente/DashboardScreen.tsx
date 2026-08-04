import { View, Text, StyleSheet, Pressable, Alert, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import { Screen, ScreenHeader } from '@/components/Screen'
import { EmptyState, CardSkeleton, Ionicons, SectionTitle, StatusBadge, type IconName } from '@/components/ui'
import { RiskRing, Sparkline } from '@/components/charts'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

function dateLabel(value?: string | null) {
  if (!value) return 'Sin fecha'
  return new Date(value).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long' })
}

function percentage(value?: number | null) {
  if (value == null) return 0
  return value <= 1 ? value * 100 : value
}

export function DashboardScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const id = user?.id_paciente
  const dashboardQ = useQuery({ queryKey: ['dashboard', id], queryFn: () => api.paciente.dashboard(id!), enabled: !!id, staleTime: 45_000 })
  const predictionQ = useQuery({ queryKey: ['prediccion', id], queryFn: () => api.paciente.prediccion(id!), enabled: !!id, staleTime: 60_000 })
  const recipesQ = useQuery({ queryKey: ['recetas', id], queryFn: () => api.paciente.recetas(id!), enabled: !!id, staleTime: 60_000 })

  const dashboard = dashboardQ.data
  const prediction = predictionQ.data?.ultima
  const activeRecipes = (recipesQ.data ?? []).filter((item) => item.estado === 'Activa')
  const loading = dashboardQ.isLoading || predictionQ.isLoading || recipesQ.isLoading
  const glucose = dashboard?.glucosa ?? []
  const lastGlucose = glucose[glucose.length - 1]
  const risk = percentage(dashboard?.probabilidad_diabetes ?? prediction?.probabilidad_diabetes)
  const reminders = [
    dashboard?.proxima_cita ? { icon: 'calendar' as IconName, title: 'Próxima cita', detail: `${dateLabel(dashboard.proxima_cita.fecha)} · ${dashboard.proxima_cita.motivo}`, action: () => navigation.navigate('Citas') } : null,
    activeRecipes.length ? { icon: 'clipboard' as IconName, title: 'Tratamiento activo', detail: `${activeRecipes.length} ${activeRecipes.length === 1 ? 'receta requiere' : 'recetas requieren'} seguimiento`, action: () => navigation.navigate('Recetas') } : null,
    prediction && !prediction.validado ? { icon: 'shield' as IconName, title: 'Resultado en revisión', detail: 'Tu médico aún debe validar la evaluación de riesgo.', action: () => navigation.navigate('Resultados') } : null,
  ].filter(Boolean) as { icon: IconName; title: string; detail: string; action: () => void }[]

  const confirmLogout = () =>
    Alert.alert('Cerrar sesión', '¿Seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => logout() },
    ])

  const refresh = () => {
    dashboardQ.refetch()
    predictionQ.refetch()
    recipesQ.refetch()
  }

  return (
    <View style={s.root}>
      <ScreenHeader
        eyebrow="TU ESPACIO DE SALUD"
        title={`Hola, ${user?.nombre?.split(' ')[0] ?? ''}`}
        subtitle={new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        right={
          <TouchableOpacity onPress={confirmLogout} activeOpacity={0.75} style={s.logoutBtn} hitSlop={8}>
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        }
      />
      <Screen scroll padded refreshing={dashboardQ.isFetching} onRefresh={refresh}>
        {loading ? (
          <><CardSkeleton /><CardSkeleton /><CardSkeleton /></>
        ) : dashboardQ.isError ? (
          <EmptyState icon="cloud-offline-outline" title="No pudimos cargar tu resumen" subtitle={(dashboardQ.error as Error)?.message} actionLabel="Reintentar" onAction={refresh} />
        ) : (
          <>
            <View style={s.hero}>
              <View style={s.heroTop}>
                <View style={{ flex: 1 }}>
                  <View style={s.statusLine}>
                    <View style={s.statusDot} />
                    <Text style={s.heroOverline}>{prediction?.validado ? 'REVISADO POR TU MÉDICO' : 'SEGUIMIENTO ACTIVO'}</Text>
                  </View>
                  <Text style={s.heroTitle}>Tu panorama clínico</Text>
                  <Text style={s.heroCopy}>
                    {prediction?.validado
                      ? 'Tu evaluación ya fue revisada y forma parte de tu seguimiento.'
                      : 'Tu equipo clínico revisará cualquier cambio relevante.'}
                  </Text>
                </View>
                <RiskRing value={risk} label="riesgo" size={104} color={risk >= 75 ? colors.coral : risk >= 50 ? colors.warning : colors.accent} />
              </View>

              <Pressable style={({ pressed }) => [s.resultLink, pressed && s.pressed]} onPress={() => navigation.navigate('Resultados')}>
                <Text style={s.resultLinkText}>Entender mi resultado</Text>
                <Ionicons name="arrow-right" size={17} color={colors.primary} />
              </Pressable>
            </View>

            {glucose.length > 0 ? (
              <Pressable style={({ pressed }) => [s.glucoseCard, pressed && s.pressed]} onPress={() => navigation.navigate('Tendencias')}>
                <View style={s.glucoseHeader}>
                  <View>
                    <Text style={s.cardOverline}>GLUCOSA RECIENTE</Text>
                    <Text style={s.glucoseValue}>{lastGlucose?.valor ?? '—'} <Text style={s.unit}>mg/dL</Text></Text>
                  </View>
                  <StatusBadge label={`${glucose.length} registros`} tone="info" />
                </View>
                <Sparkline data={glucose.map((item) => item.valor)} color={colors.accent} height={72} />
                <View style={s.chartFooter}>
                  <Text style={s.chartCaption}>{dateLabel(glucose[0]?.fecha)}</Text>
                  <View style={s.chartAction}><Text style={s.chartActionText}>Ver tendencias</Text><Ionicons name="arrow-up-right" size={14} color={colors.accent} /></View>
                  <Text style={s.chartCaption}>{dateLabel(lastGlucose?.fecha)}</Text>
                </View>
              </Pressable>
            ) : null}

            <SectionTitle>Lo más importante</SectionTitle>
            <View style={s.overviewGrid}>
              <OverviewCard
                icon="calendar"
                label="Próxima cita"
                value={dashboard?.proxima_cita ? dateLabel(dashboard.proxima_cita.fecha) : 'Sin cita'}
                color={colors.indigo}
                onPress={() => navigation.navigate('Citas')}
              />
              <OverviewCard
                icon="file-text"
                label="Recetas activas"
                value={String(activeRecipes.length)}
                color={colors.success}
                onPress={() => navigation.navigate('Recetas')}
              />
            </View>

            <SectionTitle>Recordatorios</SectionTitle>
            {reminders.length ? (
              <View style={s.group}>
                {reminders.map((item, index) => (
                  <View key={item.title} style={index > 0 && s.divider}>
                    <ReminderRow icon={item.icon} title={item.title} detail={item.detail} onPress={item.action} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={s.calmState}>
                <View style={s.calmIcon}><Ionicons name="check" size={18} color={colors.success} /></View>
                <View><Text style={s.calmTitle}>Todo al día</Text><Text style={s.calmText}>No tienes recordatorios pendientes.</Text></View>
              </View>
            )}

            <SectionTitle>Explorar</SectionTitle>
            <View style={s.exploreGrid}>
              <ExploreAction icon="bar-chart-2" title="Indicadores" color={colors.accent} onPress={() => navigation.navigate('Indicadores')} />
              <ExploreAction icon="folder" title="Expediente" color={colors.indigo} onPress={() => navigation.navigate('Expediente')} />
              <ExploreAction icon="plus" title="Registrar" color={colors.coral} onPress={() => navigation.navigate('Automonitoreo')} />
            </View>
          </>
        )}
      </Screen>
    </View>
  )
}

function OverviewCard({ icon, label, value, color, onPress }: { icon: IconName; label: string; value: string; color: string; onPress: () => void }) {
  const s = useThemedStyles(makeStyles)
  return (
    <Pressable style={({ pressed }) => [s.overviewCard, pressed && s.pressed]} onPress={onPress}>
      <View style={[s.overviewAccent, { backgroundColor: color }]} />
      <View style={[s.overviewIcon, { backgroundColor: `${color}14` }]}><Ionicons name={icon} size={18} color={color} /></View>
      <Text style={s.overviewLabel}>{label}</Text>
      <Text style={s.overviewValue} numberOfLines={2}>{value}</Text>
    </Pressable>
  )
}

function ExploreAction({ icon, title, color, onPress }: { icon: IconName; title: string; color: string; onPress: () => void }) {
  const s = useThemedStyles(makeStyles)
  return (
    <Pressable style={({ pressed }) => [s.exploreAction, pressed && s.pressed]} onPress={onPress}>
      <View style={[s.exploreIcon, { backgroundColor: `${color}15` }]}><Ionicons name={icon} size={20} color={color} /></View>
      <Text style={s.exploreTitle}>{title}</Text>
    </Pressable>
  )
}

function ReminderRow({ icon, title, detail, onPress }: { icon: IconName; title: string; detail: string; onPress: () => void }) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <Pressable style={({ pressed }) => [s.reminderRow, pressed && s.pressed]} onPress={onPress}>
      <View style={s.reminderIcon}><Ionicons name={icon} size={18} color={colors.primary} /></View>
      <View style={{ flex: 1 }}><Text style={s.reminderTitle}>{title}</Text><Text style={s.reminderDetail} numberOfLines={2}>{detail}</Text></View>
      <Ionicons name="chevron-right" size={17} color={colors.textMuted} />
    </Pressable>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  heroOverline: { ...typography.overline, color: colors.textMuted, flexShrink: 1 },
  heroTitle: { ...typography.title, color: colors.textPrimary, marginTop: spacing.xs },
  heroCopy: { ...typography.caption, color: colors.textSecondary, marginTop: 5, maxWidth: 220 },
  resultLink: { minHeight: 44, marginTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultLinkText: { ...typography.bodyMedium, color: colors.primary },
  glucoseCard: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: spacing.md, marginTop: spacing.sm },
  glucoseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardOverline: { ...typography.overline, color: colors.textMuted },
  glucoseValue: { ...typography.headline, color: colors.textPrimary, marginTop: 2 },
  unit: { ...typography.caption, color: colors.textMuted },
  chartFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  chartCaption: { ...typography.overline, color: colors.textMuted, textTransform: 'capitalize', maxWidth: 90 },
  chartAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chartActionText: { ...typography.overline, color: colors.accent },
  overviewGrid: { flexDirection: 'row', gap: spacing.xs },
  overviewCard: { flex: 1, minHeight: 132, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: spacing.md, overflow: 'hidden' },
  overviewAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  overviewIcon: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  overviewLabel: { ...typography.overline, color: colors.textMuted, marginTop: spacing.md, textTransform: 'uppercase' },
  overviewValue: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: 3, textTransform: 'capitalize' },
  group: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, overflow: 'hidden' },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  reminderRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  reminderIcon: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  reminderTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  reminderDetail: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  calmState: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.successBg, borderRadius: radius.sm, padding: spacing.md },
  calmIcon: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  calmTitle: { ...typography.bodyMedium, color: colors.successText },
  calmText: { ...typography.caption, color: colors.successText, marginTop: 2 },
  exploreGrid: { flexDirection: 'row', gap: spacing.xs },
  exploreAction: { flex: 1, minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  exploreIcon: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  exploreTitle: { ...typography.overline, color: colors.textSecondary },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.errorBg },
  pressed: { opacity: 0.72 },
})
