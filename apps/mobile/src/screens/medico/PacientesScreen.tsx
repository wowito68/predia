import { useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useInfiniteQuery } from '@tanstack/react-query'
import { api, type PacienteListItem } from '@/services/api'
import { Screen, ScreenHeader } from '@/components/Screen'
import { Avatar, RiskPill, EmptyState, CardSkeleton, Ionicons } from '@/components/ui'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

const FILTROS = [
  { key: 'todos', label: 'Todos' },
  { key: 'riesgo', label: 'Alto riesgo' },
  { key: 'recientes', label: 'Recientes' },
] as const
type FiltroKey = (typeof FILTROS)[number]['key']
const ALTO = ['ALTO', 'MUY_ALTO', 'MUY ALTO']

export function PacientesScreen() {
  const nav = useNavigation<any>()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [filtro, setFiltro] = useState<FiltroKey>('todos')
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q.trim()), 350)
    return () => clearTimeout(timer)
  }, [q])

  const query = useInfiniteQuery({
    queryKey: ['pacientes', debounced],
    queryFn: ({ pageParam }) => api.medico.pacientes(debounced || undefined, pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => lastPage.length === 20 ? pages.length + 1 : undefined,
    staleTime: 45_000,
  })

  const data = useMemo(() => {
    let list = query.data?.pages.flat() ?? []
    if (filtro === 'riesgo') list = list.filter((p) => ALTO.includes((p.nivel_riesgo || '').toUpperCase()))
    if (filtro === 'recientes') {
      list = [...list].sort((a, b) => (new Date(b.ultima_consulta ?? 0).getTime()) - (new Date(a.ultima_consulta ?? 0).getTime()))
    }
    return list
  }, [query.data, filtro])

  const renderItem = ({ item, index }: { item: PacienteListItem; index: number }) => {
    const nombre = `${item.nombre} ${item.apellido_paterno}`
    const ultima = item.ultima_consulta ? new Date(item.ultima_consulta).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin consultas'
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`Abrir expediente de ${nombre}`} style={({ pressed }) => [s.row, index === 0 && s.rowFirst, index === data.length - 1 && s.rowLast, index > 0 && s.rowDivider, pressed && s.pressed]} onPress={() => nav.navigate('PacienteDetalle', { idPaciente: item.id_paciente, nombre })}>
        <Avatar nombre={item.nombre} apellido={item.apellido_paterno} />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{nombre}</Text>
          <Text style={s.meta} numberOfLines={1}>
            {item.edad ? `${item.edad} a` : ''}{item.genero ? ` · ${item.genero === 'M' ? 'M' : 'F'}` : ''} · Últ. consulta: {ultima}
          </Text>
        </View>
        <View style={s.rowRight}>
          {item.nivel_riesgo ? <RiskPill nivel={item.nivel_riesgo} /> : null}
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Pressable>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Pacientes" subtitle={`${data.length} cargados`} />

      <View style={s.searchWrap}>
        <View style={s.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={s.input}
            placeholder="Buscar por nombre o cédula…"
            placeholderTextColor={colors.textMuted}
            value={q}
            onChangeText={setQ}
            autoCorrect={false}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <View style={s.chips}>
          {FILTROS.map((f) => (
            <Pressable accessibilityRole="button" accessibilityState={{ selected: filtro === f.key }} key={f.key} style={[s.chip, filtro === f.key && s.chipActive]} onPress={() => setFiltro(f.key)}>
              <Text style={[s.chipText, filtro === f.key && s.chipTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {query.isLoading ? (
        <View style={{ padding: spacing.lg }}><CardSkeleton /><CardSkeleton /><CardSkeleton /></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => String(i.id_paciente)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshing={query.isFetching}
          onRefresh={query.refetch}
          onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage() }}
          onEndReachedThreshold={0.4}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={{ padding: spacing.lg }} color={colors.primary} /> : null}
          ListEmptyComponent={
            query.isError ? (
              <EmptyState icon="cloud-offline-outline" title="No se pudieron cargar los pacientes" subtitle={(query.error as Error)?.message} actionLabel="Reintentar" onAction={query.refetch} />
            ) : (
              <EmptyState icon="search-outline" title="Sin resultados" subtitle="Prueba con otro nombre, cédula o filtro." />
            )
          }
        />
      )}
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  searchWrap: { backgroundColor: colors.background, paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radius.sm, paddingHorizontal: spacing.sm, height: 48, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  input: { flex: 1, ...typography.body, color: colors.textPrimary, paddingVertical: 0 },
  chips: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  chip: { minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.surfaceMuted, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  chipText: { ...typography.overline, color: colors.textSecondary },
  chipTextActive: { color: colors.surface },
  list: { padding: spacing.md, paddingBottom: 40 },
  row: { backgroundColor: colors.surface, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  rowFirst: { borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm },
  rowLast: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: radius.sm, borderBottomRightRadius: radius.sm },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  pressed: { opacity: 0.72 },
  name: { ...typography.bodyMedium, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
})
