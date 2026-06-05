import { useState } from 'react'
import { ScrollView, View, Text, Switch, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import type { Medicamento, RecetaResumen } from '@predia/shared'
import { Header } from '@/components/Header'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { QueryState } from '@/components/QueryState'
import { colors, spacing, fontSize } from '@/theme'

const parseMeds = (m: RecetaResumen['medicamentos']): Medicamento[] => {
  if (!m) return []
  if (Array.isArray(m)) return m
  try {
    const p = JSON.parse(m as string)
    return Array.isArray(p) ? p : [{ nombre: String(m) }]
  } catch {
    return [{ nombre: String(m) }]
  }
}

const estadoVariant = (e: string) =>
  e === 'Activa' ? 'success' : e === 'Cancelada' ? 'error' : 'info'

export function RecetasScreen() {
  const id = useAuthStore((s) => s.user?.id_paciente)
  const [reminders, setReminders] = useState<Record<number, boolean>>({})

  const q = useQuery({
    queryKey: ['recetas', id],
    queryFn: () => api.paciente.recetas(id!),
    enabled: !!id,
  })

  const recetas = q.data ?? []

  return (
    <View style={s.root}>
      <Header title="Mis Recetas y Medicamentos" showBack />
      <QueryState
        isLoading={q.isLoading}
        isError={q.isError}
        error={q.error}
        isEmpty={!q.isLoading && recetas.length === 0}
        emptyText="No tienes recetas registradas."
        onRetry={q.refetch}
      >
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {recetas.map((r) => {
            const on = reminders[r.id_receta] ?? r.estado === 'Activa'
            const meds = parseMeds(r.medicamentos)
            return (
              <Card key={r.id_receta}>
                <View style={s.medHeader}>
                  <View style={s.rxBadge}><Text style={s.rxText}>Rx</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.medName}>
                      {new Date(r.fecha_emision).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                    <Text style={s.medInst}>{r.medico}</Text>
                  </View>
                  <Badge label={r.estado} variant={estadoVariant(r.estado) as any} />
                </View>

                {meds.map((m, i) => (
                  <View key={i} style={s.medItem}>
                    <Text style={s.medItemName}>{m.nombre}{m.dosis ? ` · ${m.dosis}` : ''}</Text>
                    {(m.frecuencia || m.duracion) && (
                      <Text style={s.medItemDetail}>
                        {[m.frecuencia, m.duracion].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </View>
                ))}

                {r.instrucciones ? <Text style={s.instr}>📝 {r.instrucciones}</Text> : null}

                <View style={s.divider} />
                <View style={s.medFooter}>
                  <Text style={s.footerLabel}>Recordatorio</Text>
                  <View style={s.footerRight}>
                    <Text style={[s.estadoText, { color: on ? colors.primary : colors.textMuted }]}>
                      {on ? 'Activo' : 'Inactivo'}
                    </Text>
                    <Switch
                      value={on}
                      onValueChange={(v) => setReminders((prev) => ({ ...prev, [r.id_receta]: v }))}
                      trackColor={{ false: colors.border, true: colors.primaryLight }}
                      thumbColor={on ? colors.primary : '#f4f3f4'}
                    />
                  </View>
                </View>
              </Card>
            )
          })}
        </ScrollView>
      </QueryState>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 32 },
  medHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  rxBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  rxText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.sm },
  medName: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  medInst: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  medItem: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.background },
  medItemName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  medItemDetail: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },
  instr: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 8, lineHeight: 18 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  medFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  estadoText: { fontSize: fontSize.sm, fontWeight: '600' },
})
