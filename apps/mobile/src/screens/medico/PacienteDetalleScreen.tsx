import { View, Text, StyleSheet, Pressable, Linking, Alert } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { Screen, ScreenHeader } from '@/components/Screen'
import {
  Avatar,
  RiskPill,
  SectionTitle,
  QuickAction,
  CardSkeleton,
  EmptyState,
  Ionicons,
  PremiumCard,
  PrimaryButton,
  StatusBadge,
  type IconName,
} from '@/components/ui'
import { spacing, fontSize, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

function openPhone(phone?: string | null) {
  if (!phone) return Alert.alert('Sin telefono', 'Este paciente no tiene telefono registrado.')
  Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)
}

function openWhatsApp(phone?: string | null, name?: string) {
  if (!phone) return Alert.alert('Sin telefono', 'Este paciente no tiene telefono registrado.')
  const number = phone.replace(/[^\d]/g, '')
  const message = encodeURIComponent(`Hola ${name ?? ''}, le contactamos de la Clinica PREDIA.`)
  Linking.openURL(`https://wa.me/${number}?text=${message}`).catch(() => Alert.alert('WhatsApp', 'No se pudo abrir WhatsApp.'))
}

function dateLabel(value?: string | null) {
  if (!value) return 'Sin registro'
  return new Date(value).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PacienteDetalleScreen() {
  const nav = useNavigation<any>()
  const route = useRoute<any>()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const role = useAuthStore((state) => state.user?.rol)
  const isNurse = role === 'ENFERMERO'
  const id: number = route.params?.idPaciente
  const fallbackName: string = route.params?.nombre ?? ''

  const q = useQuery({
    queryKey: ['clinical-snapshot', id],
    queryFn: () => api.medico.snapshot(id),
    enabled: !!id,
    staleTime: 45_000,
  })

  const data = q.data
  const patient = data?.paciente
  const summary = data?.summary
  const name = patient?.nombre_completo || fallbackName
  const measurement = summary?.ultimaMedicion
  const latestConsultation = summary?.ultimaConsulta
  const activePrescription = summary?.recetasActivas?.[0]
  const criticalAllergies = summary?.alergiasCriticas ?? []
  const go = (screen: string) => nav.navigate(screen, { idPaciente: id, nombre: name })

  return (
    <View style={s.root}>
      <ScreenHeader title="Resumen clínico" subtitle={name} onBack={() => nav.goBack()} />
      <Screen scroll padded refreshing={q.isFetching} onRefresh={q.refetch}>
        {q.isLoading ? (
          <><CardSkeleton /><CardSkeleton /><CardSkeleton /></>
        ) : q.isError || !data ? (
          <EmptyState icon="cloud-offline-outline" title="No se pudo abrir el expediente" subtitle={(q.error as Error)?.message} actionLabel="Reintentar" onAction={q.refetch} />
        ) : (
          <>
            <PremiumCard style={s.profileCard}>
              <View style={s.recordStatus}>
                <View style={s.recordDot} />
                <Text style={s.recordStatusText}>EXPEDIENTE SINCRONIZADO</Text>
              </View>
              <View style={s.identityRow}>
                <Avatar nombre={patient?.nombre} apellido={patient?.apellido_paterno} size={68} color="#8BD3D1" />
                <View style={{ flex: 1 }}>
                  <Text style={s.overline}>Expediente activo</Text>
                  <Text style={s.name}>{name}</Text>
                  <Text style={s.meta}>{patient?.edad ? `${patient.edad} años` : 'Edad sin registrar'} · {patient?.genero || '—'} · {patient?.tipo_sangre || 'Sin tipo sanguíneo'}</Text>
                </View>
              </View>

              <View style={s.profileFooter}>
                {data.risk ? <RiskPill nivel={data.risk.nivel} /> : <StatusBadge label="Sin riesgo" />}
                <Text style={s.identifier}>Cedula {patient?.cedula}</Text>
              </View>
            </PremiumCard>

            <View style={s.primaryActions}>
              <ContactButton icon="call" label="Llamar" onPress={() => openPhone(patient?.telefono)} />
              <View style={s.contactDivider} />
              <ContactButton icon="logo-whatsapp" label="WhatsApp" tint={colors.success} onPress={() => openWhatsApp(patient?.telefono, patient?.nombre)} />
            </View>

            <SectionTitle>Acciones clínicas</SectionTitle>
            <PremiumCard style={s.actionPanel}>
              <QuickAction icon="fitness" label="Nueva medición" onPress={() => go('SignosVitales')} />
              {!isNurse ? <QuickAction icon="mic" label="Nueva consulta" tint={colors.info} onPress={() => go('DictadoNotas')} /> : null}
              {!isNurse ? <QuickAction icon="document-text" label="Nueva receta" tint={colors.success} onPress={() => go('Firma')} /> : null}
              <QuickAction icon="time" label="Ver historial" tint={colors.textSecondary} onPress={() => go('HistorialClinico')} />
            </PremiumCard>

            <View style={s.decisionGrid}>
              <DecisionCard label="Última consulta" value={dateLabel(latestConsultation?.fecha_consulta)} />
              <View style={s.decisionDivider} />
              <DecisionCard label="Próxima cita" value={summary?.proximaCita ? dateLabel(summary.proximaCita.proxima_cita) : 'Sin cita'} />
            </View>

            {data.alerts.length > 0 ? (
              <>
                <SectionTitle>Alertas activas</SectionTitle>
                <PremiumCard style={s.alertGroup}>
                  {data.alerts.slice(0, 3).map((item, index) => (
                    <View key={`${item.type}-${index}`} style={[s.alertLine, index > 0 && s.topBorder]}>
                      <View style={[s.alertIcon, { backgroundColor: item.severity === 'critical' ? colors.errorBg : colors.warningBg }]}>
                        <Ionicons name={item.severity === 'critical' ? 'warning' : 'alert-circle'} size={17} color={item.severity === 'critical' ? colors.error : colors.warning} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.alertTitle}>{item.title}</Text>
                        <Text style={s.alertDetail}>{item.detail}</Text>
                      </View>
                    </View>
                  ))}
                </PremiumCard>
              </>
            ) : null}

            <SectionTitle>Indicadores</SectionTitle>
            <View style={s.vitals}>
              <Vital icon="barbell-outline" label="Peso" value={measurement?.peso != null ? `${measurement.peso} kg` : '—'} color={colors.accent} />
              <Vital icon="body-outline" label="IMC" value={measurement?.imc != null ? String(measurement.imc) : '—'} color={colors.indigo} />
              <Vital icon="heart-outline" label="Presión" value={measurement?.presion_sistolica != null ? `${measurement.presion_sistolica}/${measurement.presion_diastolica ?? '—'}` : '—'} color={colors.coral} />
              <Vital icon="water-outline" label="Glucosa" value={summary?.ultimaGlucosa ? `${summary.ultimaGlucosa.valor}` : '—'} color={colors.warning} />
            </View>

            <SectionTitle>Riesgo clínico</SectionTitle>
            <PremiumCard>
              {data.risk ? (
                <>
                  <View style={s.riskHeader}>
                    <View style={{ flex: 1 }}>
                      <RiskPill nivel={data.risk.nivel} />
                      <Text style={s.riskTitle}>{data.risk.titulo}</Text>
                    </View>
                    {!isNurse ? (
                      <PrimaryButton
                        label={data.risk.validado ? 'Revisar' : 'Validar'}
                        icon="chevron-forward"
                        onPress={() => nav.navigate('ValidacionIA', { idPaciente: id, nombre: name })}
                        style={s.validateButton}
                      />
                    ) : null}
                  </View>
                  <Text style={s.riskDescription}>{data.risk.descripcion}</Text>
                  <Text style={s.riskAction}>{data.risk.accionClinica}</Text>
                  {(data.risk.explanation?.contribuyen?.length ?? 0) > 0 ? (
                    <View style={s.factorBox}>
                      <Text style={s.factorLabel}>Factores principales</Text>
                      <Text style={s.factorText}>{data.risk.explanation?.contribuyen.slice(0, 3).map((item) => item.factor).join(' · ')}</Text>
                    </View>
                  ) : null}
                </>
              ) : <Text style={s.muted}>Este paciente aun no tiene evaluacion de riesgo.</Text>}
            </PremiumCard>

            <SectionTitle>Tratamiento y alergias</SectionTitle>
            <PremiumCard>
              <InfoLine label="Receta activa" value={activePrescription ? summarizeMedicines(activePrescription.medicamentos) : 'Sin receta activa'} />
              <View style={s.topBorder} />
              <InfoLine
                label="Alergias críticas"
                value={criticalAllergies.length ? criticalAllergies.map((item) => item.alergeno).join(', ') : 'Sin alergias críticas registradas'}
                danger={criticalAllergies.length > 0}
              />
            </PremiumCard>

            <SectionTitle action="Ver completo" onAction={() => go('HistorialClinico')}>Timeline reciente</SectionTitle>
            {data.timeline.length === 0 ? (
              <EmptyState icon="time-outline" title="Sin eventos clínicos" subtitle="Todavía no hay eventos para mostrar." />
            ) : (
              <PremiumCard style={s.timelineCard}>
                {data.timeline.slice(0, 5).map((item, index) => (
                  <View key={item.id} style={s.timelineRow}>
                    <View style={s.timelineRail}>
                      <View style={s.timelineDot} />
                      {index < Math.min(data.timeline.length, 5) - 1 ? <View style={s.timelineLine} /> : null}
                    </View>
                    <View style={{ flex: 1, paddingBottom: index < 4 ? spacing.lg : 0 }}>
                      <View style={s.timelineHeader}>
                        <Text style={s.timelineKind}>{item.kind}</Text>
                        <Text style={s.timelineDate}>{dateLabel(item.date)}</Text>
                      </View>
                      <Text style={s.timelineTitle}>{item.title}</Text>
                      <Text style={s.timelineDetail} numberOfLines={2}>{item.detail}</Text>
                    </View>
                  </View>
                ))}
              </PremiumCard>
            )}
          </>
        )}
      </Screen>
    </View>
  )
}

function summarizeMedicines(value: any): string {
  try {
    const rows = typeof value === 'string' ? JSON.parse(value) : value
    if (Array.isArray(rows)) return rows.map((item) => item.nombre || item.medicamento).filter(Boolean).slice(0, 2).join(', ') || 'Medicamentos registrados'
  } catch {
    return typeof value === 'string' ? value : 'Medicamentos registrados'
  }
  return typeof value === 'string' ? value : 'Medicamentos registrados'
}

function ContactButton({ icon, label, onPress, tint }: { icon: IconName; label: string; onPress: () => void; tint?: string }) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const color = tint ?? colors.primary
  return (
    <Pressable style={({ pressed }) => [s.contactButton, pressed && s.pressed]} onPress={onPress}>
      <Ionicons name={icon} size={17} color={color} />
      <Text style={[s.contactText, { color }]}>{label}</Text>
    </Pressable>
  )
}

function DecisionCard({ label, value }: { label: string; value: string }) {
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.decisionCard}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue}>{value}</Text>
    </View>
  )
}

function Vital({ icon, label, value, color }: { icon: IconName; label: string; value: string; color: string }) {
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.vitalCell}>
      <View style={[s.vitalIcon, { backgroundColor: `${color}15` }]}><Ionicons name={icon} size={17} color={color} /></View>
      <View style={{ flex: 1 }}><Text style={s.vitalLabel}>{label}</Text><Text style={s.vitalValue}>{value}</Text></View>
    </View>
  )
}

function InfoLine({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.infoLine}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, danger && { color: colors.errorText }]}>{value}</Text>
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  profileCard: { padding: spacing.lg, backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  recordStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  recordDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#65D1BC' },
  recordStatusText: { ...typography.overline, color: '#AFCBCC' },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  overline: { ...typography.overline, color: '#AFCBCC', textTransform: 'uppercase' },
  name: { ...typography.title, color: '#F5FAF9', marginTop: 2 },
  meta: { ...typography.caption, color: '#B8D2D3', marginTop: 3 },
  profileFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#416069' },
  identifier: { ...typography.caption, color: '#AFCBCC' },
  primaryActions: { flexDirection: 'row', marginTop: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  contactButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  contactDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.sm },
  contactText: { ...typography.bodyMedium },
  pressed: { opacity: 0.72 },
  actionPanel: { flexDirection: 'row', gap: spacing.xs, padding: spacing.xs },
  decisionGrid: { flexDirection: 'row', marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  decisionCard: { flex: 1, minHeight: 88, padding: spacing.md },
  decisionDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md },
  summaryLabel: { ...typography.overline, color: colors.textMuted, textTransform: 'uppercase' },
  summaryValue: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: 7 },
  alertGroup: { paddingVertical: 0 },
  alertLine: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.md },
  alertIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  alertDetail: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  topBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  vitals: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  vitalCell: { width: '48%', minHeight: 76, flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: spacing.md },
  vitalIcon: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  vitalValue: { fontFamily: typography.family.bold, fontSize: fontSize.md, color: colors.textPrimary, marginTop: 2 },
  vitalLabel: { ...typography.overline, color: colors.textMuted },
  riskHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  validateButton: { minHeight: 38, paddingHorizontal: spacing.sm },
  riskTitle: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: spacing.xs },
  riskDescription: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
  riskAction: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: spacing.sm },
  factorBox: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  factorLabel: { ...typography.overline, color: colors.textMuted, textTransform: 'uppercase' },
  factorText: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  infoLine: { paddingVertical: spacing.sm },
  infoLabel: { ...typography.overline, color: colors.textMuted, textTransform: 'uppercase' },
  infoValue: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: 4 },
  timelineCard: { padding: spacing.md },
  timelineRow: { flexDirection: 'row', gap: spacing.sm },
  timelineRail: { width: 12, alignItems: 'center' },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 5 },
  timelineLine: { width: 1, flex: 1, backgroundColor: colors.border, marginVertical: 3 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  timelineKind: { ...typography.overline, color: colors.primary },
  timelineDate: { ...typography.overline, color: colors.textMuted },
  timelineTitle: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: 3 },
  timelineDetail: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  muted: { ...typography.caption, color: colors.textMuted },
})
