import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import type { AutomonitoreoRegistro, TipoAutomonitoreo } from '@predia/shared'
import { Screen, ScreenHeader } from '@/components/Screen'
import { EmptyState, CardSkeleton, Ionicons, PrimaryButton, PremiumCard, type IconName } from '@/components/ui'
import { Sparkline } from '@/components/charts'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

const labels: Record<TipoAutomonitoreo, { title: string; icon: IconName; unit: string }> = {
  glucosa: { title: 'Glucosa', icon: 'water-outline', unit: 'mg/dL' },
  peso: { title: 'Peso', icon: 'barbell-outline', unit: 'kg' },
  presion: { title: 'Presión', icon: 'heart-outline', unit: 'mmHg' },
}

function last(rows: AutomonitoreoRegistro[], type: TipoAutomonitoreo) {
  return rows.filter((item) => item.tipo === type).sort((a, b) => new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime())[0]
}

function trend(rows: AutomonitoreoRegistro[], type: TipoAutomonitoreo, colors: AppColors) {
  const values = rows.filter((item) => item.tipo === type).sort((a, b) => new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime()).slice(0, 2)
  if (values.length < 2) return { icon: 'remove' as IconName, text: 'Sin tendencia', color: colors.textMuted }
  const delta = values[0].valor - values[1].valor
  if (Math.abs(delta) < 0.1) return { icon: 'remove' as IconName, text: 'Estable', color: colors.textSecondary }
  return delta > 0
    ? { icon: 'trending-up' as IconName, text: `Subió ${Math.abs(Math.round(delta * 10) / 10)}`, color: colors.warning }
    : { icon: 'trending-down' as IconName, text: `Bajó ${Math.abs(Math.round(delta * 10) / 10)}`, color: colors.success }
}

export function IndicadoresScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const id = useAuthStore((state) => state.user?.id_paciente)
  const q = useQuery({
    queryKey: ['automonitoreo', id, 90],
    queryFn: () => api.paciente.automonitoreo(id!, undefined, 90),
    enabled: !!id,
    staleTime: 45_000,
  })
  const rows = q.data ?? []
  const cards = useMemo(() => (['glucosa', 'peso', 'presion'] as TipoAutomonitoreo[]).map((type) => ({
    type,
    latest: last(rows, type),
    trend: trend(rows, type, colors),
    series: rows
      .filter((item) => item.tipo === type)
      .sort((a, b) => new Date(a.fecha_registro).getTime() - new Date(b.fecha_registro).getTime())
      .slice(-12)
      .map((item) => item.valor),
  })), [rows, colors])
  const complete = cards.filter((item) => item.latest).length

  return (
    <View style={s.root}>
      <ScreenHeader title="Mis indicadores" subtitle="Tus mediciones recientes" />
      <Screen scroll padded refreshing={q.isFetching} onRefresh={q.refetch}>
        {q.isLoading ? (
          <><CardSkeleton /><CardSkeleton /><CardSkeleton /></>
        ) : q.isError ? (
          <EmptyState icon="cloud-offline-outline" title="No se pudieron cargar tus indicadores" subtitle={(q.error as Error)?.message} actionLabel="Reintentar" onAction={q.refetch} />
        ) : (
          <>
            <View style={s.summary}>
              <View style={s.summaryIcon}><Ionicons name="activity" size={20} color={colors.accent} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.summaryOverline}>COBERTURA DE MONITOREO</Text>
                <Text style={s.summaryTitle}>{complete} de 3 indicadores con datos</Text>
              </View>
              <View style={s.summaryScore}><Text style={s.summaryScoreText}>{Math.round((complete / 3) * 100)}%</Text></View>
            </View>
            {rows.length === 0 ? (
              <EmptyState icon="stats-chart-outline" title="Aún no tienes mediciones" subtitle="Registra glucosa, peso o presión para comenzar a ver tu progreso." actionLabel="Registrar medición" onAction={() => navigation.navigate('Automonitoreo')} />
            ) : (
              <View style={s.grid}>
                {cards.map(({ type, latest, trend: itemTrend, series }) => {
                  const config = labels[type]
                  const chartColor = type === 'glucosa' ? colors.accent : type === 'peso' ? colors.indigo : colors.coral
                  const value = latest
                    ? type === 'presion' ? `${latest.valor}/${latest.valor_secundario ?? '—'}` : String(latest.valor)
                    : '—'
                  return (
                    <PremiumCard key={type} style={s.card}>
                      <View style={s.cardHeader}>
                        <View style={[s.icon, { backgroundColor: `${chartColor}15` }]}><Ionicons name={config.icon} size={20} color={chartColor} /></View>
                        <Text style={s.date}>{latest ? new Date(latest.fecha_registro).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Sin dato'}</Text>
                      </View>
                      <Text style={s.label}>{config.title}</Text>
                      <Text style={s.value}>{value} <Text style={s.unit}>{config.unit}</Text></Text>
                      <View style={s.trend}><Ionicons name={itemTrend.icon} size={15} color={itemTrend.color} /><Text style={[s.trendText, { color: itemTrend.color }]}>{itemTrend.text}</Text></View>
                      {series.length > 1 ? <View style={s.spark}><Sparkline data={series} color={chartColor} height={68} /></View> : null}
                    </PremiumCard>
                  )
                })}
              </View>
            )}

            <View style={s.actions}>
              <PrimaryButton label="Registrar medición" icon="add-circle-outline" onPress={() => navigation.navigate('Automonitoreo')} />
              <PrimaryButton label="Ver tendencias" icon="analytics-outline" variant="secondary" onPress={() => navigation.navigate('Tendencias')} />
            </View>

            <View style={s.note}>
              <Ionicons name="information-circle-outline" size={18} color={colors.infoText} />
              <Text style={s.noteText}>Tus indicadores ayudan al seguimiento, pero no sustituyen una valoración médica.</Text>
            </View>
          </>
        )}
      </Screen>
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  summary: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryDark, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm },
  summaryIcon: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: '#173F48', alignItems: 'center', justifyContent: 'center' },
  summaryOverline: { ...typography.overline, color: '#AFCBCC' },
  summaryTitle: { ...typography.bodyMedium, color: '#F5FAF9', marginTop: 2 },
  summaryScore: { minWidth: 44, height: 30, borderRadius: radius.full, backgroundColor: '#244D55', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  summaryScoreText: { ...typography.overline, color: '#C6E2E1' },
  grid: { gap: spacing.xs },
  card: { padding: spacing.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icon: { width: 38, height: 38, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  date: { ...typography.overline, color: colors.textMuted },
  label: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
  value: { ...typography.headline, color: colors.textPrimary, marginTop: 2 },
  unit: { ...typography.caption, color: colors.textMuted },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  trendText: { ...typography.overline },
  spark: { marginTop: spacing.xs },
  actions: { gap: spacing.xs, marginTop: spacing.lg },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.lg, backgroundColor: colors.infoBg, borderRadius: radius.sm, padding: spacing.md },
  noteText: { flex: 1, ...typography.caption, color: colors.infoText },
})
