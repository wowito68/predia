import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import { api, type ClinicalAlert, type PacienteListItem } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { Screen, ScreenHeader } from '@/components/Screen'
import { Avatar, RiskPill, SectionTitle, EmptyState, CardSkeleton, Ionicons, StatusBadge, type IconName } from '@/components/ui'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

const HIGH = ['ALTO', 'MUY_ALTO', 'MUY ALTO']
const MEDIUM = ['MEDIO', 'MODERADO']

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function isToday(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

const alertTone = (priority: ClinicalAlert['priority'], colors: AppColors) =>
  priority === 'Crítica' ? { color: colors.error, tone: 'danger' as const } :
  priority === 'Alta' ? { color: colors.warning, tone: 'warning' as const } :
  { color: colors.info, tone: 'info' as const }

export function HomeScreen() {
  const nav = useNavigation<any>()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const user = useAuthStore((state) => state.user)
  const compact = useWindowDimensions().width < 360
  const isNurse = user?.rol === 'ENFERMERO'
  const firstName = (user?.nombre ?? 'Profesional').split(' ')[0]

  const agendaQ = useQuery({ queryKey: ['agenda'], queryFn: () => api.medico.agenda(), staleTime: 45_000 })
  const predictionQ = useQuery({ queryKey: ['predicciones'], queryFn: () => api.medico.predicciones(), staleTime: 60_000 })
  const patientQ = useQuery({ queryKey: ['pacientes', 'home'], queryFn: () => api.medico.pacientes(), staleTime: 60_000 })
  const alertsQ = useQuery({ queryKey: ['clinical-alerts'], queryFn: () => api.medico.alertasClinicas(), staleTime: 45_000 })

  const appointments = agendaQ.data ?? []
  const todayAppointments = appointments.filter((item) => isToday(item.proxima_cita))
  const predictions = predictionQ.data ?? []
  const highRisk = predictions.filter((item) => HIGH.includes((item.nivel_riesgo || '').toUpperCase()))
  const patients = patientQ.data ?? []
  const alerts = alertsQ.data ?? []
  const critical = alerts.filter((item) => item.priority === 'Crítica')
  const followUps = alerts.filter((item) => item.type === 'follow_up' || item.type === 'overdue_appointment')
  const loading = agendaQ.isLoading || predictionQ.isLoading || patientQ.isLoading || alertsQ.isLoading
  const portfolio = portfolioCounts(patients)

  const refetchAll = () => {
    agendaQ.refetch()
    predictionQ.refetch()
    patientQ.refetch()
    alertsQ.refetch()
  }
  const goPatient = (patientId: number, name: string) => nav.navigate('PacienteDetalle', { idPaciente: patientId, nombre: name })
  const mainAction = critical.length ? 'Atender alertas' : todayAppointments.length ? 'Abrir agenda' : 'Buscar paciente'
  const mainTarget = critical.length ? 'Alertas' : todayAppointments.length ? 'Agenda' : 'Pacientes'

  return (
    <View style={s.root}>
      <ScreenHeader
        eyebrow={isNurse ? 'Puesto de enfermería' : 'Centro de control clínico'}
        title={compact ? `Hola, ${firstName}` : `${greeting()}, ${firstName}`}
        subtitle={new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
      />
      <Screen scroll padded refreshing={agendaQ.isFetching || alertsQ.isFetching} onRefresh={refetchAll}>
        <View style={s.hero}>
          <View style={s.heroStatus}>
            <View style={s.liveDot} />
            <Text style={s.heroOverline}>JORNADA EN VIVO</Text>
          </View>
          <Text style={s.heroTitle}>
            {critical.length
              ? `${critical.length} ${critical.length === 1 ? 'caso requiere' : 'casos requieren'} decisión prioritaria.`
              : todayAppointments.length
                ? `La agenda de hoy tiene ${todayAppointments.length} ${todayAppointments.length === 1 ? 'consulta' : 'consultas'}.`
                : 'La operación clínica está bajo control.'}
          </Text>
          <Text style={s.heroCopy}>
            {followUps.length
              ? `${followUps.length} seguimientos pendientes de cierre.`
              : 'Sin seguimientos vencidos en este momento.'}
          </Text>

          <View style={s.heroMetrics}>
            <HeroMetric value={todayAppointments.length} label="Citas hoy" />
            <View style={s.heroDivider} />
            <HeroMetric value={critical.length} label="Críticas" alert={critical.length > 0} />
            <View style={s.heroDivider} />
            <HeroMetric value={highRisk.length} label="Alto riesgo" />
          </View>

          <Pressable style={({ pressed }) => [s.heroCta, pressed && s.pressed]} onPress={() => nav.navigate(mainTarget)}>
            <Text style={s.heroCtaText}>{mainAction}</Text>
            <Ionicons name="arrow-up-right" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={s.shortcuts}>
          <Shortcut icon="search" label="Buscar" color={colors.accent} onPress={() => nav.navigate('Pacientes')} />
          <Shortcut icon="calendar" label="Agenda" color={colors.info} onPress={() => nav.navigate('Agenda')} />
          {!isNurse ? <Shortcut icon="activity" label="Validar IA" color={colors.indigo} onPress={() => nav.navigate('ValidacionIA')} /> : null}
          <Shortcut icon="alert-triangle" label="Alertas" color={colors.coral} onPress={() => nav.navigate('Alertas')} />
        </View>

        {!loading && patients.length > 0 ? (
          <View style={s.portfolioCard}>
            <View style={s.portfolioHeader}>
              <View>
                <Text style={s.portfolioOverline}>CARTERA ACTIVA</Text>
                <Text style={s.portfolioTitle}>Distribución de riesgo</Text>
              </View>
              <Text style={s.portfolioTotal}>{patients.length}</Text>
            </View>
            <RiskDistribution total={patients.length} high={portfolio.high} medium={portfolio.medium} low={portfolio.low} />
            <View style={s.legendRow}>
              <Legend color={colors.error} label="Alto" value={portfolio.high} />
              <Legend color={colors.warning} label="Moderado" value={portfolio.medium} />
              <Legend color={colors.success} label="Bajo" value={portfolio.low} />
            </View>
          </View>
        ) : null}

        <SectionTitle action={alerts.length ? 'Ver todas' : undefined} onAction={() => nav.navigate('Alertas')}>Prioridad clínica</SectionTitle>
        {loading ? (
          <><CardSkeleton /><CardSkeleton /></>
        ) : alerts.length === 0 ? (
          <EmptyState icon="shield-checkmark-outline" title="Sin pendientes prioritarios" subtitle="No hay alertas clínicas activas para atender." />
        ) : (
          <View style={s.group}>
            {alerts.slice(0, 4).map((item, index) => {
              const tone = alertTone(item.priority, colors)
              return (
                <Pressable key={item.id} style={({ pressed }) => [s.priorityRow, index > 0 && s.groupDivider, pressed && s.pressed]} onPress={() => goPatient(item.patientId, item.patientName)}>
                  <View style={[s.priorityMarker, { backgroundColor: tone.color }]} />
                  <View style={{ flex: 1 }}>
                    <View style={s.rowTopLine}>
                      <Text style={s.rowTitle}>{item.patientName}</Text>
                      <StatusBadge label={item.priority} tone={tone.tone} />
                    </View>
                    <Text style={s.rowSub} numberOfLines={2}>{item.title}</Text>
                    <Text style={s.suggested} numberOfLines={1}>{item.suggestedAction}</Text>
                  </View>
                  <Ionicons name="chevron-right" size={17} color={colors.textMuted} />
                </Pressable>
              )
            })}
          </View>
        )}

        <SectionTitle action={appointments.length ? 'Ver agenda' : undefined} onAction={() => nav.navigate('Agenda')}>Agenda del día</SectionTitle>
        {loading ? (
          <CardSkeleton />
        ) : todayAppointments.length === 0 ? (
          <EmptyState icon="calendar-clear-outline" title="Agenda despejada" subtitle="Usa este espacio para seguimientos o validaciones pendientes." />
        ) : (
          <View style={s.group}>
            {todayAppointments.slice(0, 4).map((appointment, index) => {
              const name = `${appointment.paciente.nombre} ${appointment.paciente.apellido_paterno}`
              const time = new Date(appointment.proxima_cita).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
              return (
                <Pressable key={appointment.id_cita} style={({ pressed }) => [s.appointmentRow, index > 0 && s.groupDivider, pressed && s.pressed]} onPress={() => goPatient(appointment.paciente.id_paciente, name)}>
                  <View style={s.timeBlock}>
                    <Text style={s.hourText}>{time}</Text>
                    <View style={s.timeLine} />
                  </View>
                  <Avatar nombre={appointment.paciente.nombre} apellido={appointment.paciente.apellido_paterno} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>{name}</Text>
                    <Text style={s.rowSub} numberOfLines={1}>{appointment.motivo_consulta}</Text>
                  </View>
                  <Ionicons name="chevron-right" size={17} color={colors.textMuted} />
                </Pressable>
              )
            })}
          </View>
        )}

        {!isNurse && highRisk.length > 0 ? (
          <>
            <SectionTitle action="Ver alertas" onAction={() => nav.navigate('Alertas')}>Vigilancia activa</SectionTitle>
            <View style={s.group}>
              {highRisk.slice(0, 3).map((item, index) => (
                <Pressable key={item.id_prediccion} style={({ pressed }) => [s.patientRow, index > 0 && s.groupDivider, pressed && s.pressed]} onPress={() => goPatient(item.id_paciente, item.paciente_nombre)}>
                  <Avatar nombre={item.paciente_nombre} apellido={item.paciente_nombre.split(' ')[1]} color={colors.error} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>{item.paciente_nombre}</Text>
                    <Text style={s.rowSub}>{item.validado ? 'Evaluación validada' : 'Pendiente de validación'}</Text>
                  </View>
                  <RiskPill nivel={item.nivel_riesgo} />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </Screen>
    </View>
  )
}

function portfolioCounts(patients: PacienteListItem[]) {
  return patients.reduce((result, patient) => {
    const level = (patient.nivel_riesgo || '').toUpperCase()
    if (HIGH.includes(level)) result.high += 1
    else if (MEDIUM.includes(level)) result.medium += 1
    else result.low += 1
    return result
  }, { high: 0, medium: 0, low: 0 })
}

function HeroMetric({ value, label, alert }: { value: number; label: string; alert?: boolean }) {
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.heroMetric}>
      <Text style={[s.heroMetricValue, alert && s.heroMetricAlert]}>{value}</Text>
      <Text style={s.heroMetricLabel}>{label}</Text>
    </View>
  )
}

function Shortcut({ icon, label, color, onPress }: { icon: IconName; label: string; color: string; onPress: () => void }) {
  const s = useThemedStyles(makeStyles)
  return (
    <Pressable style={({ pressed }) => [s.shortcut, pressed && s.pressed]} onPress={onPress}>
      <View style={[s.shortcutIcon, { backgroundColor: `${color}16` }]}><Ionicons name={icon} size={19} color={color} /></View>
      <Text style={s.shortcutLabel}>{label}</Text>
    </Pressable>
  )
}

function RiskDistribution({ total, high, medium, low }: { total: number; high: number; medium: number; low: number }) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const pct = (value: number) => `${Math.max(value ? 6 : 0, (value / Math.max(total, 1)) * 100)}%` as `${number}%`
  return (
    <View style={s.riskBar} accessibilityLabel={`Alto ${high}, moderado ${medium}, bajo ${low}`}>
      {high ? <View style={[s.riskSegment, { width: pct(high), backgroundColor: colors.error }]} /> : null}
      {medium ? <View style={[s.riskSegment, { width: pct(medium), backgroundColor: colors.warning }]} /> : null}
      {low ? <View style={[s.riskSegment, { flex: 1, backgroundColor: colors.success }]} /> : null}
    </View>
  )
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendLabel}>{label}</Text>
      <Text style={s.legendValue}>{value}</Text>
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: { backgroundColor: colors.primaryDark, borderRadius: radius.sm, padding: spacing.lg, overflow: 'hidden' },
  heroStatus: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#65D1BC' },
  heroOverline: { ...typography.overline, color: '#B8D5D5' },
  heroTitle: { ...typography.title, color: '#F5FAF9', marginTop: spacing.sm, maxWidth: 315 },
  heroCopy: { ...typography.caption, color: '#B8D5D5', marginTop: 6 },
  heroMetrics: { flexDirection: 'row', alignItems: 'stretch', marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#44656C' },
  heroMetric: { flex: 1 },
  heroMetricValue: { fontFamily: typography.family.bold, fontSize: 25, lineHeight: 30, color: '#FFFFFF' },
  heroMetricAlert: { color: '#F2A39C' },
  heroMetricLabel: { ...typography.overline, color: '#9DBABC', marginTop: 1 },
  heroDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#44656C', marginHorizontal: spacing.sm },
  heroCta: { minHeight: 44, marginTop: spacing.lg, borderRadius: radius.sm, backgroundColor: colors.accent, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroCtaText: { ...typography.bodyMedium, color: '#FFFFFF' },
  shortcuts: { flexDirection: 'row', marginTop: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  shortcut: { flex: 1, alignItems: 'center', gap: 6, minWidth: 0 },
  shortcutIcon: { width: 38, height: 38, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { ...typography.overline, color: colors.textSecondary, textAlign: 'center' },
  portfolioCard: { marginTop: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  portfolioHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  portfolioOverline: { ...typography.overline, color: colors.textMuted },
  portfolioTitle: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: 2 },
  portfolioTotal: { fontFamily: typography.family.bold, fontSize: 24, color: colors.textPrimary },
  riskBar: { height: 10, flexDirection: 'row', gap: 3, backgroundColor: colors.surfaceSunken, borderRadius: radius.full, overflow: 'hidden', marginTop: spacing.md },
  riskSegment: { height: '100%', borderRadius: radius.full },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendLabel: { ...typography.overline, color: colors.textMuted },
  legendValue: { ...typography.overline, color: colors.textPrimary },
  group: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: spacing.md },
  groupDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  priorityMarker: { width: 4, height: 42, borderRadius: 2 },
  rowTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  rowTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  rowSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  suggested: { ...typography.overline, color: colors.accent, marginTop: 5 },
  appointmentRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  patientRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  timeBlock: { alignSelf: 'stretch', width: 48, justifyContent: 'center', alignItems: 'flex-start' },
  hourText: { ...typography.caption, color: colors.accent },
  timeLine: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, backgroundColor: colors.accentSoft },
  pressed: { opacity: 0.72 },
})
