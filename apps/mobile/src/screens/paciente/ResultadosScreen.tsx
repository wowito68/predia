import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import { Header } from '@/components/Header'
import { Card } from '@/components/Card'
import { QueryState } from '@/components/QueryState'
import { spacing, fontSize, riskColor, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

const toList = (v: string[] | string | null | undefined): string[] => {
  if (!v) return []
  if (Array.isArray(v)) return v
  return String(v).split(/\n|;|·/).map((x) => x.trim()).filter(Boolean)
}

export function ResultadosScreen() {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const id = useAuthStore((st) => st.user?.id_paciente)
  const q = useQuery({
    queryKey: ['prediccion', id],
    queryFn: () => api.paciente.prediccion(id!),
    enabled: !!id,
  })

  const p = q.data?.ultima ?? null
  const risk = riskColor(p?.nivel_riesgo ?? 'BAJO', colors)
  const factores = toList(p?.factores_riesgo)
  const recomendaciones = toList(p?.recomendaciones)
  const fecha = p ? new Date(p.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  return (
    <View style={s.root}>
      <Header title="Mis resultados IA" subtitle={fecha ? `Última actualización: ${fecha}` : undefined} showBack />
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
            <View style={[s.levelBlock, { backgroundColor: risk.bg }]}> 
              <Text style={[s.levelText, { color: risk.text }]}>{risk.label}</Text>
            </View>
            <Text style={s.levelExplanation}>
              {risk.label === 'MUY ALTO' || risk.label === 'ALTO'
                ? 'Este nivel indica que necesitas seguimiento cercano con tu equipo médico.'
                : risk.label === 'MODERADO'
                  ? 'Hay aspectos de tu salud que conviene vigilar y mejorar.'
                  : 'Mantén tus hábitos saludables y controles de rutina.'}
            </Text>
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

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 32 },
  gaugeCard: { alignItems: 'center' },
  gaugeTitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 16 },
  levelBlock: { minWidth: 160, height: 64, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  levelText: { fontSize: fontSize.xl, fontWeight: '800' },
  levelExplanation: { textAlign: 'center', fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm, marginTop: 4 },
  rec: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 6, lineHeight: 20 },
  disclaimer: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 12, lineHeight: 16, fontStyle: 'italic' },
})
