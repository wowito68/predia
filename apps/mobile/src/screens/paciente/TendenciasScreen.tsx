import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import type { AutomonitoreoRegistro } from '@predia/shared'
import { Header } from '@/components/Header'
import { Card } from '@/components/Card'
import { QueryState } from '@/components/QueryState'
import { colors, spacing, radius, fontSize } from '@/theme'

const PERIODS: { label: string; dias: number }[] = [
  { label: '7 días', dias: 7 },
  { label: '30 días', dias: 30 },
  { label: '90 días', dias: 90 },
]

function BarChart({ data, max, refLine, color }: { data: number[]; max: number; refLine?: number; color: string }) {
  return (
    <View style={{ height: 80, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
      {data.map((v, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={{ height: Math.max(4, (v / max) * 80), width: '70%', backgroundColor: color, borderRadius: 3 }} />
        </View>
      ))}
      {refLine !== undefined && (
        <View style={{ position: 'absolute', bottom: (refLine / max) * 80, left: 0, right: 0, height: 1, backgroundColor: colors.error }} />
      )}
    </View>
  )
}

const stats = (arr: number[]) =>
  arr.length === 0
    ? { min: 0, max: 0, prom: 0 }
    : { min: Math.min(...arr), max: Math.max(...arr), prom: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) }

export function TendenciasScreen() {
  const id = useAuthStore((s) => s.user?.id_paciente)
  const [period, setPeriod] = useState(PERIODS[0])

  const q = useQuery({
    queryKey: ['automonitoreo', id, period.dias],
    queryFn: () => api.paciente.automonitoreo(id!, undefined, period.dias),
    enabled: !!id,
  })

  const data: AutomonitoreoRegistro[] = q.data ?? []
  const glucosa = data.filter((d) => d.tipo === 'glucosa').map((d) => d.valor)
  const peso = data.filter((d) => d.tipo === 'peso').map((d) => d.valor)
  const presion = data.filter((d) => d.tipo === 'presion')
  const gStats = stats(glucosa)
  const maxG = Math.max(180, ...glucosa)
  const maxPeso = Math.max(100, ...peso)

  return (
    <View style={s.root}>
      <Header title="Tendencias de Salud" showBack />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity key={p.label} onPress={() => setPeriod(p)} style={[s.periodBtn, period.label === p.label && s.periodBtnActive]}>
              <Text style={[s.periodText, period.label === p.label && s.periodTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <QueryState
          isLoading={q.isLoading}
          isError={q.isError}
          error={q.error}
          isEmpty={!q.isLoading && data.length === 0}
          emptyText="Sin registros de automonitoreo en este periodo."
          onRetry={q.refetch}
        >
          <Text style={s.chartTitle}>Glucosa capilar (mg/dL)</Text>
          <Card>
            {glucosa.length ? (
              <>
                <BarChart data={glucosa} max={maxG} refLine={125} color={colors.primary} />
                <View style={s.chartStats}>
                  <Text style={s.stat}>Min: {gStats.min}</Text>
                  <Text style={s.stat}>Max: {gStats.max}</Text>
                  <Text style={s.stat}>Prom: {gStats.prom}</Text>
                </View>
              </>
            ) : <Text style={s.noData}>Sin datos</Text>}
          </Card>

          <Text style={s.chartTitle}>Peso corporal (kg)</Text>
          <Card>
            {peso.length ? <BarChart data={peso} max={maxPeso} color={colors.primaryLight} /> : <Text style={s.noData}>Sin datos</Text>}
          </Card>

          <Text style={s.chartTitle}>Presión arterial (mmHg)</Text>
          <Card>
            {presion.length ? (
              <View style={{ height: 80, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                {presion.map((p, i) => (
                  <View key={i} style={{ flex: 1, gap: 2, alignItems: 'center', justifyContent: 'flex-end' }}>
                    <View style={{ height: Math.max(4, (p.valor / 200) * 80), width: '40%', backgroundColor: colors.primary, borderRadius: 2 }} />
                    <View style={{ height: Math.max(4, ((p.valor_secundario ?? 0) / 200) * 80), width: '40%', backgroundColor: '#93C5FD', borderRadius: 2 }} />
                  </View>
                ))}
              </View>
            ) : <Text style={s.noData}>Sin datos</Text>}
          </Card>
        </QueryState>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 32 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  periodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  periodTextActive: { color: '#fff', fontWeight: '700' },
  chartTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  chartStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  stat: { fontSize: fontSize.xs, color: colors.textMuted },
  noData: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
})
