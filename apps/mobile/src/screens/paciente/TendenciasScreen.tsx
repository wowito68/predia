import { useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import type { AutomonitoreoRegistro, TipoAutomonitoreo } from '@predia/shared'
import { Screen, ScreenHeader } from '@/components/Screen'
import { CardSkeleton, EmptyState, Ionicons, type IconName } from '@/components/ui'
import { TrendChart, type TrendPoint } from '@/components/charts'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

const PERIODS = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
] as const

function stats(values: number[]) {
  if (!values.length) return { min: 0, max: 0, average: 0 }
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    average: Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10,
  }
}

function series(rows: AutomonitoreoRegistro[], type: TipoAutomonitoreo): TrendPoint[] {
  return rows
    .filter((item) => item.tipo === type)
    .sort((a, b) => new Date(a.fecha_registro).getTime() - new Date(b.fecha_registro).getTime())
    .map((item) => ({
      value: item.valor,
      secondary: item.valor_secundario,
      label: new Date(item.fecha_registro).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
    }))
}

export function TendenciasScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const id = useAuthStore((state) => state.user?.id_paciente)
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[1])

  const query = useQuery({
    queryKey: ['automonitoreo', id, period.days],
    queryFn: () => api.paciente.automonitoreo(id!, undefined, period.days),
    enabled: !!id,
    staleTime: 45_000,
  })

  const rows = query.data ?? []
  const charts = useMemo(() => ({
    glucose: series(rows, 'glucosa'),
    weight: series(rows, 'peso'),
    pressure: series(rows, 'presion'),
  }), [rows])
  const glucoseStats = stats(charts.glucose.map((point) => point.value))
  const weightStats = stats(charts.weight.map((point) => point.value))
  const pressureStats = stats(charts.pressure.map((point) => point.value))

  return (
    <View style={s.root}>
      <ScreenHeader title="Tendencias" subtitle="Evolución de tus indicadores" onBack={() => navigation.goBack()} />
      <Screen scroll padded refreshing={query.isFetching} onRefresh={query.refetch}>
        <View style={s.periodControl}>
          {PERIODS.map((item) => {
            const active = period.days === item.days
            return (
              <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={item.days} style={[s.periodButton, active && s.periodButtonActive]} onPress={() => setPeriod(item)}>
                <Text style={[s.periodText, active && s.periodTextActive]}>{item.label}</Text>
              </Pressable>
            )
          })}
        </View>

        {query.isLoading ? (
          <><CardSkeleton /><CardSkeleton /><CardSkeleton /></>
        ) : query.isError ? (
          <EmptyState icon="cloud-offline-outline" title="No se pudieron cargar las tendencias" subtitle={(query.error as Error)?.message} actionLabel="Reintentar" onAction={query.refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon="bar-chart-2" title="Sin datos en este periodo" subtitle="Cambia el intervalo o registra una nueva medición." />
        ) : (
          <>
            <MetricChart
              title="Glucosa capilar"
              unit="mg/dL"
              icon="droplet"
              color={colors.accent}
              latest={charts.glucose.at(-1)?.value}
              data={charts.glucose}
              reference={125}
              stats={glucoseStats}
            />
            <MetricChart
              title="Peso corporal"
              unit="kg"
              icon="activity"
              color={colors.indigo}
              latest={charts.weight.at(-1)?.value}
              data={charts.weight}
              stats={weightStats}
            />
            <MetricChart
              title="Presión arterial"
              unit="mmHg"
              icon="heart"
              color={colors.coral}
              secondaryColor={colors.info}
              latest={charts.pressure.at(-1)?.value}
              secondaryLatest={charts.pressure.at(-1)?.secondary ?? undefined}
              data={charts.pressure}
              stats={pressureStats}
            />
            <View style={s.disclaimer}>
              <Ionicons name="info" size={17} color={colors.infoText} />
              <Text style={s.disclaimerText}>Las tendencias apoyan tu seguimiento; cualquier cambio de tratamiento debe revisarlo tu equipo médico.</Text>
            </View>
          </>
        )}
      </Screen>
    </View>
  )
}

function MetricChart({
  title,
  unit,
  icon,
  color,
  secondaryColor,
  latest,
  secondaryLatest,
  data,
  reference,
  stats: summary,
}: {
  title: string
  unit: string
  icon: IconName
  color: string
  secondaryColor?: string
  latest?: number
  secondaryLatest?: number
  data: TrendPoint[]
  reference?: number
  stats: { min: number; max: number; average: number }
}) {
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.chartCard}>
      <View style={s.chartHeader}>
        <View style={[s.chartIcon, { backgroundColor: `${color}15` }]}><Ionicons name={icon} size={19} color={color} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.chartTitle}>{title}</Text>
          <Text style={s.chartRecords}>{data.length} mediciones</Text>
        </View>
        <View style={s.latestWrap}>
          <Text style={s.latestValue}>{latest == null ? '—' : secondaryLatest == null ? latest : `${latest}/${secondaryLatest}`}</Text>
          <Text style={s.latestUnit}>{unit}</Text>
        </View>
      </View>

      {data.length > 1 ? (
        <TrendChart data={data} color={color} secondaryColor={secondaryColor} reference={reference} />
      ) : (
        <View style={s.singlePoint}><Text style={s.singlePointText}>Registra otra medición para generar una tendencia.</Text></View>
      )}

      <View style={s.statsRow}>
        <Stat label="Mínimo" value={summary.min} />
        <View style={s.statDivider} />
        <Stat label="Promedio" value={summary.average} emphasis />
        <View style={s.statDivider} />
        <Stat label="Máximo" value={summary.max} />
      </View>
    </View>
  )
}

function Stat({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, emphasis && s.statValueStrong]}>{value}</Text>
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  periodControl: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, padding: 4, marginBottom: spacing.sm },
  periodButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.xs },
  periodButtonActive: { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  periodText: { ...typography.caption, color: colors.textSecondary },
  periodTextActive: { color: colors.textPrimary, fontFamily: typography.family.semibold },
  chartCard: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  chartIcon: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  chartTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  chartRecords: { ...typography.overline, color: colors.textMuted, marginTop: 2 },
  latestWrap: { alignItems: 'flex-end' },
  latestValue: { ...typography.title, color: colors.textPrimary },
  latestUnit: { ...typography.overline, color: colors.textMuted, marginTop: -2 },
  singlePoint: { height: 130, alignItems: 'center', justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  singlePointText: { ...typography.caption, color: colors.textMuted, textAlign: 'center', maxWidth: 230 },
  statsRow: { flexDirection: 'row', alignItems: 'stretch', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  statLabel: { ...typography.overline, color: colors.textMuted },
  statValue: { ...typography.bodyMedium, color: colors.textSecondary, marginTop: 2 },
  statValueStrong: { color: colors.textPrimary, fontFamily: typography.family.bold },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.infoBg, borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.xs },
  disclaimerText: { flex: 1, ...typography.caption, color: colors.infoText },
})
