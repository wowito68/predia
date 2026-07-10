import { useMemo, useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import { Header } from '@/components/Header'
import { QueryState } from '@/components/QueryState'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

type Categoria = 'Todo' | 'Alergias' | 'Patologías' | 'Consultas'
const TABS: Categoria[] = ['Todo', 'Alergias', 'Patologías', 'Consultas']

interface Item { tipo: Categoria; label: string; fecha: string; bg: string }
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

export function ExpedienteScreen() {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const user = useAuthStore((st) => st.user)
  const id = user?.id_paciente
  const [tab, setTab] = useState<Categoria>('Todo')

  const q = useQuery({
    queryKey: ['expediente', id],
    queryFn: () => api.paciente.expediente(id!),
    enabled: !!id,
  })

  const items: Item[] = useMemo(() => {
    const d = q.data
    if (!d) return []
    return [
      ...d.alergias.map((a) => ({
        tipo: 'Alergias' as const,
        label: `${a.alergeno}${a.severidad ? ` — ${a.severidad}` : ''}${a.reaccion ? ` (${a.reaccion})` : ''}`,
        fecha: '',
        bg: colors.errorBg,
      })),
      ...d.patologias.map((p) => ({
        tipo: 'Patologías' as const,
        label: `${p.patologia} · ${p.estado}`,
        fecha: fmt(p.fecha_diagnostico),
        bg: colors.infoBg,
      })),
      ...d.consultas.map((c) => ({
        tipo: 'Consultas' as const,
        label: `${c.motivo_consulta}${c.diagnostico ? ` — ${c.diagnostico}` : ''}`,
        fecha: fmt(c.fecha_consulta),
        bg: colors.surfaceMuted,
      })),
    ]
  }, [q.data, colors])

  const filtered = tab === 'Todo' ? items : items.filter((i) => i.tipo === tab)
  const paciente = q.data?.paciente

  return (
    <View style={s.root}>
      <Header title="Mi Expediente Clínico" showBack />
      <QueryState isLoading={q.isLoading} isError={q.isError} error={q.error} onRetry={q.refetch}>
        <ScrollView stickyHeaderIndices={[0]} showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsWrap} contentContainerStyle={s.tabs}>
            {TABS.map((t) => (
              <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabActive]}>
                <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.content}>
            <View style={s.patientCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.patientName}>{paciente?.nombre_completo ?? user?.nombre}</Text>
                <Text style={s.patientCurp}>CURP: {user?.curp ?? '—'}</Text>
                {paciente?.tipo_sangre ? <Text style={s.patientCurp}>Tipo de sangre: {paciente.tipo_sangre}</Text> : null}
              </View>
            </View>

            {filtered.length === 0 ? (
              <Text style={s.empty}>Sin registros en esta categoría.</Text>
            ) : (
              filtered.map((item, i) => (
                <View key={i} style={[s.item, { backgroundColor: item.bg }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemTipo}>{item.tipo}</Text>
                    <Text style={s.itemLabel}>{item.label}</Text>
                  </View>
                  {item.fecha ? <Text style={s.itemFecha}>{item.fecha}</Text> : null}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </QueryState>
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  tabsWrap: { backgroundColor: colors.background },
  tabs: { paddingHorizontal: spacing.md, paddingVertical: 10, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typography.caption, color: colors.textSecondary },
  tabTextActive: { color: colors.surface },
  content: { padding: spacing.md, paddingBottom: 32 },
  patientCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  patientName: { ...typography.bodyMedium, color: colors.textPrimary },
  patientCurp: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  empty: { ...typography.caption, color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
  item: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  itemTipo: { ...typography.overline, color: colors.textSecondary, marginBottom: 4 },
  itemLabel: { ...typography.caption, color: colors.textPrimary },
  itemFecha: { ...typography.overline, color: colors.textSecondary },
})
