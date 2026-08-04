import { useMemo, useState } from 'react'
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import { api, type ClinicalAlert } from '@/services/api'
import { ScreenHeader } from '@/components/Screen'
import { Avatar, EmptyState, CardSkeleton, Ionicons, StatusBadge, type IconName } from '@/components/ui'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

const FILTERS = ['Todas', 'Crítica', 'Alta', 'Media'] as const
type Filter = (typeof FILTERS)[number]

const typeIcon: Record<ClinicalAlert['type'], IconName> = {
  risk: 'pulse',
  allergy: 'warning',
  blood_pressure: 'heart',
  glucose: 'water',
  overdue_appointment: 'calendar',
  follow_up: 'time',
  prescription: 'document-text',
}

const priorityStyle = (priority: ClinicalAlert['priority'], colors: AppColors) => {
  if (priority === 'Crítica') return { color: colors.error, tone: 'danger' as const }
  if (priority === 'Alta') return { color: colors.warning, tone: 'warning' as const }
  return { color: colors.info, tone: 'info' as const }
}

export function AlertasScreen() {
  const nav = useNavigation<any>()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const [filter, setFilter] = useState<Filter>('Todas')
  const q = useQuery({
    queryKey: ['clinical-alerts'],
    queryFn: () => api.medico.alertasClinicas(),
    staleTime: 45_000,
  })

  const alerts = useMemo(() => {
    const rows = q.data ?? []
    return filter === 'Todas' ? rows : rows.filter((item) => item.priority === filter)
  }, [q.data, filter])
  const critical = (q.data ?? []).filter((item) => item.priority === 'Crítica').length

  const renderItem = ({ item }: { item: ClinicalAlert }) => {
    const palette = priorityStyle(item.priority, colors)
    return (
      <Pressable
        style={({ pressed }) => [s.card, pressed && s.pressed]}
        onPress={() => nav.navigate('PacienteDetalle', { idPaciente: item.patientId, nombre: item.patientName })}
      >
        <View style={s.rowTop}>
          <Avatar nombre={item.patientName} apellido={item.patientName.split(' ')[1]} size={44} color={palette.color} />
          <View style={{ flex: 1 }}>
            <Text style={s.patient}>{item.patientName}</Text>
            <Text style={s.title}>{item.title}</Text>
          </View>
          <StatusBadge label={item.priority} tone={palette.tone} />
        </View>

        <View style={s.reasonRow}>
          <View style={[s.typeIcon, { backgroundColor: `${palette.color}12` }]}>
            <Ionicons name={typeIcon[item.type]} size={16} color={palette.color} />
          </View>
          <Text style={s.reason}>{item.reason}</Text>
        </View>
        <View style={s.actionRow}>
          <Text style={s.actionLabel}>Acción sugerida</Text>
          <Text style={s.action}>{item.suggestedAction}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      </Pressable>
    )
  }

  return (
    <View style={s.root}>
      <ScreenHeader
        title="Alertas clínicas"
        subtitle={critical ? `${critical} requieren atención inmediata` : 'Cola de seguimiento clínico'}
      />
      <View style={s.filters}>
        {FILTERS.map((item) => (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === item }} key={item} style={[s.filter, filter === item && s.filterActive]} onPress={() => setFilter(item)}>
            <Text style={[s.filterText, filter === item && s.filterTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      {q.isLoading ? (
        <View style={{ padding: spacing.lg }}><CardSkeleton /><CardSkeleton /><CardSkeleton /></View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshing={q.isFetching}
          onRefresh={q.refetch}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          ListEmptyComponent={
            q.isError ? (
              <EmptyState icon="cloud-offline-outline" title="No se pudieron cargar las alertas" subtitle={(q.error as Error)?.message} actionLabel="Reintentar" onAction={q.refetch} />
            ) : (
              <EmptyState icon="shield-checkmark-outline" title="Sin alertas en esta prioridad" subtitle="No hay pacientes pendientes para este filtro." />
            )
          }
        />
      )}
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  filters: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.background },
  filter: { flex: 1, minHeight: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...typography.overline, color: colors.textSecondary },
  filterTextActive: { color: colors.surface },
  content: { padding: spacing.md, paddingBottom: 40 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.72 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  patient: { ...typography.bodyMedium, color: colors.textPrimary },
  title: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.md, paddingVertical: spacing.xs },
  typeIcon: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  reason: { flex: 1, ...typography.caption, color: colors.textSecondary },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  actionLabel: { ...typography.overline, color: colors.textMuted },
  action: { flex: 1, ...typography.caption, color: colors.primary },
})
