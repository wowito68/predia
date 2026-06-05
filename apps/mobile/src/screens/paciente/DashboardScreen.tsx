import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import { Card } from '@/components/Card'
import { QueryState } from '@/components/QueryState'
import { colors, spacing, radius, fontSize, riskColor } from '@/theme'

const fmtShort = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

export function DashboardScreen() {
  const user = useAuthStore((s) => s.user)
  const id = user?.id_paciente
  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const q = useQuery({
    queryKey: ['dashboard', id],
    queryFn: () => api.paciente.dashboard(id!),
    enabled: !!id,
  })

  const d = q.data
  const risk = riskColor(d?.nivel_riesgo ?? 'BAJO')
  const glucosa = d?.glucosa ?? []
  const maxG = Math.max(160, ...glucosa.map((g) => g.valor))

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.greeting}>Hola, {user?.nombre?.split(' ')[0] ?? ''}</Text>
        <Text style={s.date}>{today.charAt(0).toUpperCase() + today.slice(1)}</Text>
      </View>
      <QueryState isLoading={q.isLoading} isError={q.isError} error={q.error} onRetry={q.refetch}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Card>
            <Text style={s.cardLabel}>Riesgo de Diabetes (IA)</Text>
            <View style={s.riskRow}>
              <View style={[s.dot, { backgroundColor: colors.success }]} />
              <View style={[s.dot, { backgroundColor: colors.warning }]} />
              <View style={[s.dot, { backgroundColor: colors.error }]} />
              <Text style={[s.riskText, { color: risk.text }]}>Riesgo {risk.label}</Text>
            </View>
            {d?.probabilidad_diabetes != null && (
              <Text style={s.prob}>Probabilidad estimada: {Math.round(d.probabilidad_diabetes * 100)}%</Text>
            )}
          </Card>

          <View style={s.row}>
            <Card style={s.miniCard}>
              <Text style={s.miniLabel}>Próxima Cita</Text>
              <Text style={s.miniValue}>{d?.proxima_cita ? fmtShort(d.proxima_cita.fecha) : '—'}</Text>
            </Card>
            <Card style={s.miniCard}>
              <Text style={s.miniLabel}>Medicamentos</Text>
              <Text style={s.miniValue}>{d?.recetas_activas ?? 0}</Text>
            </Card>
          </View>

          <Text style={s.sectionTitle}>Glucosa — últimos {glucosa.length || ''} registros</Text>
          <Card style={{ paddingBottom: 12 }}>
            <View style={s.chartMeta}>
              <Text style={s.chartRefLabel}>Normal ≤ 125</Text>
            </View>
            {glucosa.length === 0 ? (
              <Text style={s.noData}>Aún no hay registros de glucosa</Text>
            ) : (
              <View style={s.bars}>
                {glucosa.map((g, i) => (
                  <View key={i} style={s.barWrap}>
                    <View
                      style={[s.bar, {
                        height: (g.valor / maxG) * 80,
                        backgroundColor: g.valor > 125 ? colors.primaryLight : colors.primary,
                      }]}
                    />
                  </View>
                ))}
              </View>
            )}
          </Card>
        </ScrollView>
      </QueryState>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingTop: 52, paddingBottom: spacing.xxl, paddingHorizontal: spacing.xl },
  greeting: { color: '#fff', fontSize: fontSize.xl, fontWeight: '700' },
  date: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm, marginTop: 2 },
  content: { padding: spacing.lg, paddingBottom: 32 },
  cardLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 10 },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 18, height: 18, borderRadius: 9 },
  riskText: { fontSize: fontSize.lg, fontWeight: '700', marginLeft: 4 },
  prob: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 10 },
  row: { flexDirection: 'row', gap: spacing.md },
  miniCard: { flex: 1 },
  miniLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 6 },
  miniValue: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm, marginTop: 4 },
  chartMeta: { alignItems: 'flex-end', marginBottom: 4 },
  chartRefLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 4 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '80%', borderRadius: 3, minHeight: 6 },
  noData: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
})
