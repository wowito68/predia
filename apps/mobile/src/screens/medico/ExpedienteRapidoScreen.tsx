import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { QueryState } from '@/components/QueryState'
import { colors, spacing, radius, fontSize, riskColor } from '@/theme'

const ACCIONES = [
  { label: 'Signos\nvitales', screen: 'IF-M05' },
  { label: 'Dictar\nnota', screen: 'IF-M06' },
  { label: 'Foto\nclínica', screen: 'IF-M07' },
  { label: 'Firmar\nreceta', screen: 'IF-M10' },
]

export function ExpedienteRapidoScreen() {
  const nav = useNavigation<any>()
  const route = useRoute<any>()
  const paramId: number | undefined = route.params?.idPaciente

  // Fallback: si se entra desde la pestaña sin paciente, usar el primero de la agenda.
  const agendaQ = useQuery({ queryKey: ['agenda'], queryFn: () => api.medico.agenda(), enabled: !paramId })
  const id = paramId ?? agendaQ.data?.[0]?.paciente?.id_paciente

  const pacQ = useQuery({ queryKey: ['paciente', id], queryFn: () => api.medico.paciente(id!), enabled: !!id })
  const predQ = useQuery({ queryKey: ['predicciones', id], queryFn: () => api.medico.predicciones(id!), enabled: !!id })
  const medQ = useQuery({ queryKey: ['mediciones', id], queryFn: () => api.medico.mediciones(id!), enabled: !!id })

  const p = pacQ.data
  const nombre = p ? `${p.nombre} ${p.apellido_paterno}` : (route.params?.nombre ?? '')
  const pred = predQ.data?.[0]
  const med = medQ.data?.[0]
  const risk = riskColor(pred?.nivel_riesgo ?? 'BAJO')
  const go = (screen: string) => nav.navigate(screen, { idPaciente: id, nombre })

  return (
    <View style={s.root}>
      <Header title="Expediente Rápido" nav={nav} />
      <QueryState
        isLoading={pacQ.isLoading}
        isError={pacQ.isError}
        error={pacQ.error}
        isEmpty={!pacQ.isLoading && !id}
        emptyText="Selecciona un paciente desde la Agenda."
        onRetry={pacQ.refetch}
      >
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Card>
            <View style={s.patientRow}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {(p?.nombre?.[0] ?? '') + (p?.apellido_paterno?.[0] ?? '')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.patientName}>{nombre}</Text>
                <Text style={s.patientMeta}>
                  {p?.edad ? `${p.edad} años` : ''}{p?.genero ? ` · ${p.genero}` : ''}{p?.tipo_sangre ? ` · ${p.tipo_sangre}` : ''}
                </Text>
              </View>
              {pred && <Badge label={risk.label} variant={risk.label === 'BAJO' ? 'success' : risk.label === 'MODERADO' ? 'warning' : 'error'} />}
            </View>
          </Card>

          <View style={s.vitalesGrid}>
            <Vital label="Peso" valor={med?.peso != null ? `${med.peso} kg` : '—'} />
            <Vital label="IMC" valor={med?.imc != null ? String(med.imc) : '—'} />
            <Vital label="PA" valor={med?.presion_sistolica != null ? `${med.presion_sistolica}/${med.presion_diastolica ?? '—'}` : '—'} />
            <Vital label="Última toma" valor={med ? new Date(med.fecha_medicion).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'} />
          </View>

          <Text style={s.sectionTitle}>Última Predicción IA</Text>
          <Card>
            {pred ? (
              <>
                <View style={s.iaRow}>
                  <View style={[s.iaBadge, { backgroundColor: risk.bg }]}>
                    <Text style={[s.iaBadgeText, { color: risk.text }]}>
                      Riesgo {risk.label} · {Math.round(pred.probabilidad_diabetes * 100)}%
                    </Text>
                  </View>
                  <TouchableOpacity style={s.validarBtn} onPress={() => nav.navigate('IA')}>
                    <Text style={s.validarBtnText}>Validar →</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.iaFecha}>Actualizado: {new Date(pred.fecha_prediccion).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                <Text style={[s.iaPendiente, { color: pred.validado ? colors.success : colors.warning }]}>
                  {pred.validado ? `Validado: ${pred.diagnostico_confirmado}` : 'Validación pendiente'}
                </Text>
              </>
            ) : (
              <Text style={s.noData}>Sin predicciones registradas.</Text>
            )}
          </Card>

          <Text style={s.sectionTitle}>Acciones rápidas</Text>
          <View style={s.actionsRow}>
            {ACCIONES.map((a) => (
              <TouchableOpacity key={a.screen} style={s.actionCard} onPress={() => go(a.screen)}>
                <Text style={s.actionIcon}>◆</Text>
                <Text style={s.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </QueryState>
    </View>
  )
}

function Vital({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={s.vitalCell}>
      <Text style={s.vitalLabel}>{label}</Text>
      <Text style={s.vitalValor}>{valor}</Text>
    </View>
  )
}

// Header local con botón atrás (evita depender de showBack en este stack anidado).
function Header({ title, nav }: { title: string; nav: any }) {
  return (
    <View style={s.headerBar}>
      <TouchableOpacity onPress={() => nav.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
      <Text style={s.headerTitle}>{title}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerBar: { backgroundColor: colors.primary, paddingTop: 48, paddingBottom: spacing.xl, paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { color: '#fff', fontSize: fontSize.xl, fontWeight: '300' },
  headerTitle: { color: '#fff', fontSize: fontSize.xl, fontWeight: '700' },
  content: { padding: spacing.lg, paddingBottom: 32 },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.sm },
  patientName: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  patientMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  vitalesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.md },
  vitalCell: {
    flex: 1, minWidth: '40%', backgroundColor: colors.surface, borderRadius: radius.sm, padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  vitalLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 4 },
  vitalValor: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm, marginTop: 4 },
  iaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  iaBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  iaBadgeText: { fontWeight: '700', fontSize: fontSize.xs },
  validarBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.sm },
  validarBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
  iaFecha: { fontSize: fontSize.xs, color: colors.textSecondary },
  iaPendiente: { fontSize: fontSize.xs, fontWeight: '600', marginTop: 2 },
  noData: { fontSize: fontSize.sm, color: colors.textMuted },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  actionIcon: { fontSize: 22, color: colors.primary, marginBottom: 4 },
  actionLabel: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center', lineHeight: 14 },
})
