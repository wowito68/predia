import { View, Text, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import { Screen, ScreenHeader } from '@/components/Screen'
import { RiskPill, EmptyState, CardSkeleton, Ionicons, ActionRow, PremiumCard } from '@/components/ui'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

function toList(value: string[] | string | null | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  return String(value).split(/\n|;|·/).map((item) => item.replace(/^[-•]\s*/, '').trim()).filter(Boolean)
}

export function RecomendacionesScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const id = useAuthStore((state) => state.user?.id_paciente)
  const q = useQuery({
    queryKey: ['prediccion', id],
    queryFn: () => api.paciente.prediccion(id!),
    enabled: !!id,
    staleTime: 60_000,
  })
  const prediction = q.data?.ultima
  const recommendations = toList(prediction?.recomendaciones)
  const factors = toList(prediction?.factores_riesgo)

  return (
    <View style={s.root}>
      <ScreenHeader title="Recomendaciones" subtitle="Pasos claros para cuidar tu salud" />
      <Screen scroll padded refreshing={q.isFetching} onRefresh={q.refetch}>
        {q.isLoading ? (
          <><CardSkeleton /><CardSkeleton /></>
        ) : q.isError ? (
          <EmptyState icon="cloud-offline-outline" title="No se pudieron cargar tus recomendaciones" subtitle={(q.error as Error)?.message} actionLabel="Reintentar" onAction={q.refetch} />
        ) : !prediction ? (
          <EmptyState icon="heart-outline" title="Aún no hay recomendaciones" subtitle="Tu médico debe registrar una evaluación para generar un plan de seguimiento." />
        ) : (
          <>
            <PremiumCard style={s.riskCard}>
              <View style={s.riskTop}>
                <View>
                  <Text style={s.eyebrow}>Tu nivel actual</Text>
                  <View style={{ marginTop: 6 }}><RiskPill nivel={prediction.nivel_riesgo} /></View>
                </View>
                <Ionicons name="shield-checkmark-outline" size={34} color={colors.primary} />
              </View>
              <Text style={s.validation}>{prediction.validado ? 'Revisado por tu médico' : 'Pendiente de revisión médica'}</Text>
            </PremiumCard>

            <Text style={s.sectionTitle}>Qué puedes hacer ahora</Text>
            {recommendations.length ? (
              <PremiumCard style={s.card}>
                {recommendations.map((item, index) => (
                  <View key={`${item}-${index}`} style={[s.recommendation, index > 0 && s.divider]}>
                    <View style={s.check}><Text style={s.checkText}>{index + 1}</Text></View>
                    <Text style={s.recommendationText}>{item}</Text>
                  </View>
                ))}
              </PremiumCard>
            ) : (
              <EmptyState icon="list-outline" title="Sin indicaciones registradas" subtitle="Consulta con tu médico cuáles son los siguientes pasos recomendados." />
            )}

            {factors.length > 0 ? (
              <>
                <Text style={s.sectionTitle}>Aspectos a vigilar</Text>
                <PremiumCard style={s.card}>
                  {factors.slice(0, 4).map((item, index) => (
                    <View key={`${item}-${index}`} style={[s.factor, index > 0 && s.divider]}>
                      <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
                      <Text style={s.factorText}>{item}</Text>
                    </View>
                  ))}
                </PremiumCard>
              </>
            ) : null}

            <Text style={s.sectionTitle}>Seguimiento</Text>
            <View style={s.actions}>
              <ActionRow icon="calendar-outline" title="Revisar próximas citas" subtitle="Consulta cuándo es tu siguiente revisión." onPress={() => navigation.navigate('Citas')} />
              <ActionRow icon="add-circle-outline" title="Registrar una medición" subtitle="Agrega glucosa, peso o presión." onPress={() => navigation.navigate('Automonitoreo')} />
              <ActionRow icon="information-circle-outline" title="Entender mi resultado" subtitle="Consulta factores y explicación completa." onPress={() => navigation.navigate('Resultados')} />
            </View>

            <Text style={s.disclaimer}>Estas recomendaciones acompañan el seguimiento médico. No cambies medicamentos ni tratamientos sin indicación profesional.</Text>
          </>
        )}
      </Screen>
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  riskCard: { padding: spacing.lg },
  riskTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { ...typography.overline, color: colors.textMuted, textTransform: 'uppercase' },
  validation: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
  sectionTitle: { ...typography.title, fontSize: 20, lineHeight: 26, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.xs },
  card: { paddingHorizontal: spacing.md, paddingVertical: 0 },
  recommendation: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md },
  check: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center' },
  checkText: { ...typography.overline, color: colors.successText },
  recommendationText: { flex: 1, ...typography.body, color: colors.textPrimary, paddingTop: 2 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  factor: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  factorText: { flex: 1, ...typography.caption, color: colors.textSecondary },
  actions: { gap: spacing.xs },
  disclaimer: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg, textAlign: 'center' },
})
