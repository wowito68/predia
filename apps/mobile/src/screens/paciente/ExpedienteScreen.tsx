import { useMemo, useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import { Header } from '@/components/Header'
import { QueryState } from '@/components/QueryState'
import { colors, spacing, radius, fontSize } from '@/theme'

type Categoria = 'Todo' | 'Alergias' | 'Patologías' | 'Consultas'
const TABS: Categoria[] = ['Todo', 'Alergias', 'Patologías', 'Consultas']

interface Item { tipo: Categoria; label: string; fecha: string; bg: string }
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

export function ExpedienteScreen() {
  const user = useAuthStore((s) => s.user)
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
        bg: '#FEF2F2',
      })),
      ...d.patologias.map((p) => ({
        tipo: 'Patologías' as const,
        label: `${p.patologia} · ${p.estado}`,
        fecha: fmt(p.fecha_diagnostico),
        bg: '#F0F9FF',
      })),
      ...d.consultas.map((c) => ({
        tipo: 'Consultas' as const,
        label: `${c.motivo_consulta}${c.diagnostico ? ` — ${c.diagnostico}` : ''}`,
        fecha: fmt(c.fecha_consulta),
        bg: '#FAFAFA',
      })),
    ]
  }, [q.data])

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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  tabsWrap: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabs: { paddingHorizontal: spacing.lg, paddingVertical: 10, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.background },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  content: { padding: spacing.lg, paddingBottom: 32 },
  patientCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  patientName: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  patientCurp: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  empty: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
  item: { borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  itemTipo: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  itemLabel: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '500' },
  itemFecha: { fontSize: fontSize.xs, color: colors.textSecondary },
})
