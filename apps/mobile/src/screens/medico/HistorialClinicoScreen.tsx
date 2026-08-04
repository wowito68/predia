import { View, Text, FlatList, StyleSheet } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import { api, type ClinicalTimelineItem } from '@/services/api'
import { ScreenHeader } from '@/components/Screen'
import { EmptyState, CardSkeleton, Ionicons, type IconName } from '@/components/ui'
import { spacing, radius, fontSize, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

const icons: Record<string, IconName> = {
  Consulta: 'medkit-outline',
  Signos: 'fitness-outline',
  Receta: 'document-text-outline',
  Documento: 'folder-outline',
  Automonitoreo: 'pulse-outline',
}

export function HistorialClinicoScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<any>()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const id: number = route.params?.idPaciente
  const name: string = route.params?.nombre ?? ''
  const q = useQuery({
    queryKey: ['clinical-snapshot', id],
    queryFn: () => api.medico.snapshot(id),
    enabled: !!id,
    staleTime: 45_000,
  })

  const renderItem = ({ item, index }: { item: ClinicalTimelineItem; index: number }) => (
    <View style={s.row}>
      <View style={s.rail}>
        <View style={s.icon}><Ionicons name={icons[item.kind] ?? 'ellipse-outline'} size={18} color={colors.primary} /></View>
        {index < (q.data?.timeline.length ?? 0) - 1 ? <View style={s.line} /> : null}
      </View>
      <View style={s.content}>
        <View style={s.top}>
          <Text style={s.kind}>{item.kind}</Text>
          <Text style={s.date}>{new Date(item.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
        </View>
        <Text style={s.title}>{item.title}</Text>
        <Text style={s.detail}>{item.detail}</Text>
      </View>
    </View>
  )

  return (
    <View style={s.root}>
      <ScreenHeader title="Historial clínico" subtitle={name} onBack={() => navigation.goBack()} />
      {q.isLoading ? (
        <View style={{ padding: spacing.lg }}><CardSkeleton /><CardSkeleton /><CardSkeleton /></View>
      ) : (
        <FlatList
          data={q.data?.timeline ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshing={q.isFetching}
          onRefresh={q.refetch}
          initialNumToRender={10}
          ListEmptyComponent={
            q.isError
              ? <EmptyState icon="cloud-offline-outline" title="No se pudo cargar el historial" subtitle={(q.error as Error)?.message} actionLabel="Reintentar" onAction={q.refetch} />
              : <EmptyState icon="time-outline" title="Sin eventos clínicos" subtitle="No hay consultas, mediciones, recetas o documentos registrados." />
          }
        />
      )}
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: 40 },
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { width: 42, alignItems: 'center' },
  icon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.infoBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  line: { width: 1, flex: 1, minHeight: 24, backgroundColor: colors.border },
  content: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  kind: { fontSize: fontSize.xs, fontWeight: '800', color: colors.primary },
  date: { fontSize: fontSize.xs, color: colors.textMuted },
  title: { fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary, marginTop: 6 },
  detail: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19, marginTop: 3 },
})
