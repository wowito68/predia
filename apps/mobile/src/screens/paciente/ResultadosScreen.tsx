import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import { Header } from '@/components/Header'
import { Card } from '@/components/Card'
import { QueryState } from '@/components/QueryState'
import { colors, spacing, fontSize, riskColor } from '@/theme'

const toList = (v: string[] | string | null | undefined): string[] => {
  if (!v) return []
  if (Array.isArray(v)) return v
  return String(v).split(/\n|;|·/).map((x) => x.trim()).filter(Boolean)
}

export function ResultadosScreen() {
  const id = useAuthStore((s) => s.user?.id_paciente)
  const q = useQuery({
    queryKey: ['prediccion', id],
    queryFn: () => api.paciente.prediccion(id!),
    enabled: !!id,
  })

  const p = q.data?.ultima ?? null
  const pct = p ? Math.round(p.probabilidad_diabetes * 100) : 0
  const risk = riskColor(p?.nivel_riesgo ?? 'BAJO')
  const factores = toList(p?.factores_riesgo)
  const recomendaciones = toList(p?.recomendaciones)
  const fecha = p ? new Date(p.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  return (
    <View style={s.root}>
      <Header title="Mis Resultados IA" subtitle={fecha ? `Última actualización: ${fecha}` : undefined} showBack />
      <QueryState
        isLoading={q.isLoading}
        isError={q.isError}
        error={q.error}
        isEmpty={!q.isLoading && !p}
        emptyText="Aún no tienes una predicción de IA registrada."
        onRetry={q.refetch}
      >
        <ScrollView contentContainerStyle={s.content}>
          <Card style={s.gaugeCard}>
            <Text style={s.gaugeTitle}>Tu nivel de riesgo actual</Text>
            <View style={s.gaugeCircleWrap}>
              <View style={[s.gaugeOuter, { backgroundColor: risk.bg }]}>
                <View style={s.gaugeInner}>
                  <Text style={[s.gaugePct, { color: risk.text }]}>{pct}%</Text>
                  <Text style={[s.gaugeLevel, { color: risk.text }]}>{risk.label}</Text>
                </View>
              </View>
            </View>
            <View style={s.scaleRow}>
              <Text style={s.scaleItem}>Bajo{'\n'}&lt;40%</Text>
              <Text style={s.scaleItem}>Moderado{'\n'}40–69%</Text>
              <Text style={[s.scaleItem, { color: colors.error, fontWeight: '700' }]}>Alto{'\n'}≥70%</Text>
            </View>
          </Card>

          {factores.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Factores que influyen en tu riesgo</Text>
              <Card>
                {factores.map((f, i) => (
                  <Text key={i} style={s.rec}>• {f}</Text>
                ))}
              </Card>
            </>
          )}

          {recomendaciones.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Recomendaciones personalizadas</Text>
              <Card>
                {recomendaciones.map((r, i) => (
                  <Text key={i} style={s.rec}>• {r}</Text>
                ))}
              </Card>
            </>
          )}

          {p && (
            <Text style={s.disclaimer}>
              Resultado {p.validado ? 'validado por tu médico' : 'pendiente de validación médica'}.
              Esta estimación no sustituye el diagnóstico profesional.
            </Text>
          )}
        </ScrollView>
      </QueryState>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 32 },
  gaugeCard: { alignItems: 'center' },
  gaugeTitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 16 },
  gaugeCircleWrap: { marginBottom: 16 },
  gaugeOuter: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  gaugeInner: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  gaugePct: { fontSize: fontSize.xxl, fontWeight: '700' },
  gaugeLevel: { fontSize: fontSize.sm, fontWeight: '700' },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  scaleItem: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 16 },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm, marginTop: 4 },
  rec: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 6, lineHeight: 20 },
  disclaimer: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 12, lineHeight: 16, fontStyle: 'italic' },
})
