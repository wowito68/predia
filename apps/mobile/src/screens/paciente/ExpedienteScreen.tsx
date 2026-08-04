import { useMemo, useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import { Header } from '@/components/Header'
import { QueryState } from '@/components/QueryState'
import { EmptyState } from '@/components/ui'
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
      <Header title="Mi expediente" subtitle="Historia clínica personal" showBack />
      <QueryState isLoading={q.isLoading} isError={q.isError} error={q.error} onRetry={q.refetch}>
        <ScrollView stickyHeaderIndices={[0]} showsVerticalScrollIndicator={false}>
          <View style={s.tabsWrap}>
            <View style={s.tabs}>
            {TABS.map((t) => (
              <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: tab === t }} key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabActive]}>
                <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
            </View>
          </View>

          <View style={s.content}>
            <View style={s.patientCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.patientName}>{paciente?.nombre_completo ?? user?.nombre}</Text>
                <Text style={s.patientCurp}>CURP: {user?.curp ?? '—'}</Text>
                {paciente?.tipo_sangre ? <Text style={s.patientCurp}>Tipo de sangre: {paciente.tipo_sangre}</Text> : null}
              </View>
            </View>

            {filtered.length === 0 ? (
              <EmptyState icon="folder-open-outline" title="Sin registros" subtitle="No hay información clínica registrada en esta categoría." />
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
  tabsWrap: { backgroundColor: colors.background, paddingHorizontal: spacing.md, paddingVertical: 10 },
  tabs: { flexDirection: 'row', gap: 4 },
  tab: { flex: 1, minHeight: 44, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
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
  item: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  itemTipo: { ...typography.overline, color: colors.textSecondary, marginBottom: 4 },
  itemLabel: { ...typography.caption, color: colors.textPrimary },
  itemFecha: { ...typography.overline, color: colors.textSecondary },
})
