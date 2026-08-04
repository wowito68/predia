import { useState } from 'react'
import { ActivityIndicator, ScrollView, View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import { Header } from '@/components/Header'
import { Card } from '@/components/Card'
import { QueryState } from '@/components/QueryState'
import { FeedbackBanner, Ionicons } from '@/components/ui'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useThemedStyles } from '@/theme/context'

const fmtLong = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

export function CitasScreen() {
  const s = useThemedStyles(makeStyles)
  const id = useAuthStore((st) => st.user?.id_paciente)
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<string | null>(null)
  const q = useQuery({
    queryKey: ['citas', id],
    queryFn: () => api.paciente.citas(id!),
    enabled: !!id,
  })

  const citas = q.data ?? []
  const [proxima, ...resto] = citas
  const cancelar = useMutation({
    mutationFn: (idCita: number) => api.paciente.cancelarCita(id!, idCita),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['citas', id] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', id] }),
      ])
      setFeedback('La cita se canceló y la agenda clínica ya fue actualizada.')
    },
    onError: (error) => {
      Alert.alert('No se pudo cancelar', error instanceof Error ? error.message : 'Intenta nuevamente en unos momentos.')
    },
  })

  const confirmarCancelacion = (idCita: number) => {
    Alert.alert(
      'Cancelar cita',
      'Esta acción libera el horario en la agenda clínica. ¿Deseas continuar?',
      [
        { text: 'Conservar cita', style: 'cancel' },
        { text: 'Cancelar cita', style: 'destructive', onPress: () => cancelar.mutate(idCita) },
      ],
    )
  }

  return (
    <View style={s.root}>
      <Header title="Mis citas" showBack />
      <QueryState
        isLoading={q.isLoading}
        isError={q.isError}
        error={q.error}
        isEmpty={!q.isLoading && citas.length === 0}
        emptyText="No tienes citas próximas programadas."
        onRetry={q.refetch}
      >
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {feedback ? (
            <FeedbackBanner
              title="Agenda actualizada"
              subtitle={feedback}
              tone="success"
              style={s.feedback}
            />
          ) : null}
          {proxima && (
            <View style={s.proximaCard}>
              <Text style={s.proximaTag}>Próxima cita</Text>
              <Text style={s.proximaFecha}>{fmtLong(proxima.fecha)}</Text>
              <Text style={s.proximaInfo}>{fmtTime(proxima.fecha)} · {proxima.medico} · {proxima.motivo}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cancelar próxima cita"
                style={[s.btnCancelar, cancelar.isPending && s.btnDisabled]}
                disabled={cancelar.isPending}
                onPress={() => confirmarCancelacion(proxima.id_cita)}
              >
                {cancelar.isPending ? (
                  <ActivityIndicator size="small" color={s.btnCancelarText.color} />
                ) : (
                  <Ionicons name="calendar-x" size={17} color={s.btnCancelarText.color} />
                )}
                <Text style={s.btnCancelarText}>{cancelar.isPending ? 'Cancelando…' : 'Cancelar cita'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {resto.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Próximas citas</Text>
              {resto.map((c) => (
                <Card key={c.id_cita} style={s.histItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.histFecha}>{fmtLong(c.fecha)}</Text>
                    <Text style={s.histDoc}>{c.medico} · {c.motivo}</Text>
                  </View>
                  <Text style={s.histHora}>{fmtTime(c.fecha)}</Text>
                </Card>
              ))}
            </>
          )}

          <View style={s.recordatorioCard}>
            <View style={s.rBadge}><Text style={s.rBadgeText}>R</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.rTitle}>Recordatorio activado</Text>
              <Text style={s.rSub}>Recibirás aviso 24h y 1h antes de cada cita</Text>
            </View>
          </View>
        </ScrollView>
      </QueryState>
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 32 },
  feedback: { marginBottom: spacing.md },
  proximaCard: { backgroundColor: colors.infoBg, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  proximaTag: { ...typography.overline, color: colors.primary, marginBottom: 4 },
  proximaFecha: { ...typography.title, color: colors.textPrimary, textTransform: 'capitalize' },
  proximaInfo: { ...typography.caption, color: colors.textSecondary, marginTop: 4, marginBottom: 16 },
  btnCancelar: { alignSelf: 'flex-start', minHeight: 44, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.errorText },
  btnCancelarText: { ...typography.caption, color: colors.errorText },
  btnDisabled: { opacity: 0.6 },
  sectionTitle: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: spacing.sm },
  histItem: { flexDirection: 'row', alignItems: 'center' },
  histFecha: { ...typography.caption, color: colors.textPrimary, textTransform: 'capitalize' },
  histDoc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  histHora: { ...typography.caption, color: colors.primary },
  recordatorioCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  rBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  rBadgeText: { ...typography.bodyMedium, color: colors.surface },
  rTitle: { ...typography.caption, color: colors.textPrimary },
  rSub: { ...typography.overline, color: colors.textSecondary, marginTop: 2 },
})
