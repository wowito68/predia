import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import type { Medicamento, RecetaResumen } from '@predia/shared'
import { Header } from '@/components/Header'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { QueryState } from '@/components/QueryState'
import { spacing, typography, type AppColors } from '@/theme'
import { useThemedStyles } from '@/theme/context'

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
  const s = useThemedStyles(makeStyles)
  const id = useAuthStore((st) => st.user?.id_paciente)

  const q = useQuery({
    queryKey: ['recetas', id],
    queryFn: () => api.paciente.recetas(id!),
    enabled: !!id,
  })

  const recetas = q.data ?? []

  return (
    <View style={s.root}>
      <Header title="Mis recetas" subtitle="Medicamentos e indicaciones activas" />
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

                {r.instrucciones ? <Text style={s.instr}>Indicaciones: {r.instrucciones}</Text> : null}

                <View style={s.divider} />
                <Text style={s.footerLabel}>{r.estado === 'Activa' ? 'Tratamiento activo' : `Estado: ${r.estado}`}</Text>
              </Card>
            )
          })}
        </ScrollView>
      </QueryState>
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 32 },
  medHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  rxBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.infoBg, alignItems: 'center', justifyContent: 'center' },
  rxText: { ...typography.caption, color: colors.primary },
  medName: { ...typography.bodyMedium, color: colors.textPrimary },
  medInst: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  medItem: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.background },
  medItemName: { ...typography.caption, color: colors.textPrimary },
  medItemDetail: { ...typography.overline, color: colors.textSecondary, marginTop: 1 },
  instr: { ...typography.caption, color: colors.textSecondary, marginTop: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  footerLabel: { ...typography.caption, color: colors.textSecondary },
})
