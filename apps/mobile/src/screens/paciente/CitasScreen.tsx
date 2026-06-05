import { ScrollView, View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import { Header } from '@/components/Header'
import { Card } from '@/components/Card'
import { QueryState } from '@/components/QueryState'
import { colors, spacing, radius, fontSize } from '@/theme'

const fmtLong = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

export function CitasScreen() {
  const id = useAuthStore((s) => s.user?.id_paciente)
  const q = useQuery({
    queryKey: ['citas', id],
    queryFn: () => api.paciente.citas(id!),
    enabled: !!id,
  })

  const citas = q.data ?? []
  const [proxima, ...resto] = citas

  return (
    <View style={s.root}>
      <Header title="Mis Citas" showBack />
      <QueryState
        isLoading={q.isLoading}
        isError={q.isError}
        error={q.error}
        isEmpty={!q.isLoading && citas.length === 0}
        emptyText="No tienes citas próximas programadas."
        onRetry={q.refetch}
      >
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {proxima && (
            <View style={s.proximaCard}>
              <Text style={s.proximaTag}>Próxima cita</Text>
              <Text style={s.proximaFecha}>{fmtLong(proxima.fecha)}</Text>
              <Text style={s.proximaInfo}>{fmtTime(proxima.fecha)} · {proxima.medico} · {proxima.motivo}</Text>
              <View style={s.btnRow}>
                <TouchableOpacity style={s.btnConfirmar} onPress={() => Alert.alert('Confirmado', 'Asistencia confirmada.')}>
                  <Text style={s.btnConfirmarText}>Confirmar asistencia</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnCancelar} onPress={() => Alert.alert('Cancelar', '¿Seguro que quieres cancelar?')}>
                  <Text style={s.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {resto.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Próximas citas</Text>
              {resto.map((c) => (
                <Card key={c.id_consulta} style={s.histItem}>
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 32 },
  proximaCard: { backgroundColor: '#EFF6FF', borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: '#BFDBFE' },
  proximaTag: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600', marginBottom: 4 },
  proximaFecha: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary, textTransform: 'capitalize' },
  proximaInfo: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4, marginBottom: 16 },
  btnRow: { flexDirection: 'row', gap: 12 },
  btnConfirmar: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 10 },
  btnConfirmarText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
  btnCancelar: { borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 10 },
  btnCancelarText: { color: colors.error, fontWeight: '700', fontSize: fontSize.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  histItem: { flexDirection: 'row', alignItems: 'center' },
  histFecha: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, textTransform: 'capitalize' },
  histDoc: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  histHora: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  recordatorioCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  rBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  rBadgeText: { color: '#fff', fontWeight: '700', fontSize: fontSize.md },
  rTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  rSub: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
})
