import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AgendaItem } from '@predia/shared'
import { api, type PacienteListItem } from '@/services/api'
import { ScreenHeader } from '@/components/Screen'
import { Avatar, CardSkeleton, EmptyState, FeedbackBanner, Ionicons, StatusBadge } from '@/components/ui'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

function dayKey(item: AgendaItem) {
  if (item.estado === 'EN_CURSO') return 'En curso'
  const date = new Date(item.fecha_cita)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (date.toDateString() === now.toDateString()) return 'Hoy'
  if (date.toDateString() === tomorrow.toDateString()) return 'Mañana'
  return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

function inputDate(daysAhead = 1) {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function dateInputFromDate(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function timeInputFromDate(date: Date) {
  return [String(date.getHours()).padStart(2, '0'), String(date.getMinutes()).padStart(2, '0')].join(':')
}

function buildDateTime(date: string, time: string) {
  const parsed = new Date(`${date}T${time}:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function appointmentPerson(appointment: AgendaItem) {
  return `${appointment.paciente.nombre} ${appointment.paciente.apellido_paterno}`
}

function findPatientConflict(appointments: AgendaItem[], patientId: number, date: Date, excludeId?: number) {
  const target = date.getTime()
  return appointments.find((item) => (
    item.id_cita !== excludeId
    && ['PROGRAMADA', 'EN_CURSO'].includes(item.estado)
    && item.paciente.id_paciente === patientId
    && Math.abs(new Date(item.fecha_cita).getTime() - target) < 60_000
  ))
}

type AgendaAction = 'INICIAR' | 'FINALIZAR' | 'EDITAR' | 'REAGENDAR' | 'CANCELAR'
type EditState = { appointment: AgendaItem; mode: 'EDITAR' | 'REAGENDAR' }
type AgendaFeedback = { title: string; subtitle?: string; tone?: 'success' | 'info' | 'warning' | 'danger' }

export function AgendaScreen() {
  const navigation = useNavigation<any>()
  const queryClient = useQueryClient()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const [createOpen, setCreateOpen] = useState(false)
  const [finishing, setFinishing] = useState<AgendaItem | null>(null)
  const [managing, setManaging] = useState<AgendaItem | null>(null)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [cancelling, setCancelling] = useState<AgendaItem | null>(null)
  const [feedback, setFeedback] = useState<AgendaFeedback | null>(null)
  const agendaQuery = useQuery({ queryKey: ['agenda'], queryFn: () => api.medico.agenda(), staleTime: 20_000 })
  const appointments = agendaQuery.data ?? []

  const lifecycle = useMutation({
    mutationFn: ({
      id,
      action,
      observations,
      observaciones,
      fecha,
      motivo,
    }: {
      id: number
      action: AgendaAction
      observations?: FinishValues
      observaciones?: string
      fecha?: string
      motivo?: string
    }) =>
      api.medico.actualizarCita(id, {
        action,
        fecha,
        motivo,
        observaciones: observations?.observaciones ?? observaciones,
        diagnostico: observations?.diagnostico,
        tratamiento: observations?.tratamiento,
      }),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['agenda'] }),
        queryClient.invalidateQueries({ queryKey: ['clinical-alerts'] }),
      ])
      if (variables.action === 'INICIAR') {
        setFeedback({ title: 'Consulta iniciada', subtitle: 'La cita quedó marcada como en curso.', tone: 'info' })
      } else if (variables.action === 'FINALIZAR') {
        setFinishing(null)
        setFeedback({ title: 'Consulta finalizada', subtitle: 'La atención y su nota de cierre quedaron registradas.', tone: 'success' })
      } else if (variables.action === 'CANCELAR') {
        setCancelling(null)
        setFeedback({ title: 'Cita cancelada', subtitle: 'La agenda se actualizó y el horario quedó liberado.', tone: 'warning' })
      } else {
        setEditing(null)
        setFeedback({ title: variables.action === 'REAGENDAR' ? 'Cita reagendada' : 'Cita actualizada', subtitle: 'Los cambios quedaron sincronizados con la agenda.', tone: 'success' })
      }
    },
    onError: (error: any) => Alert.alert('No se pudo actualizar', error?.message ?? 'Intenta nuevamente.'),
  })

  const sections = useMemo(() => {
    const grouped = new Map<string, AgendaItem[]>()
    appointments.forEach((appointment) => {
      const key = dayKey(appointment)
      grouped.set(key, [...(grouped.get(key) ?? []), appointment])
    })
    return [...grouped.entries()].map(([title, data]) => ({ title, data }))
  }, [appointments])

  const inProgress = appointments.filter((item) => item.estado === 'EN_CURSO').length
  const today = appointments.filter((item) => item.estado === 'PROGRAMADA' && new Date(item.fecha_cita).toDateString() === new Date().toDateString()).length

  const startAppointment = (appointment: AgendaItem) => {
    const patient = `${appointment.paciente.nombre} ${appointment.paciente.apellido_paterno}`
    Alert.alert('Iniciar consulta', `¿Comenzar la atención de ${patient}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Iniciar', onPress: () => lifecycle.mutate({ id: appointment.id_cita, action: 'INICIAR' }) },
    ])
  }

  return (
    <View style={s.root}>
      <ScreenHeader
        eyebrow="OPERACIÓN CLÍNICA"
        title="Agenda"
        subtitle={`${appointments.length} ${appointments.length === 1 ? 'cita activa' : 'citas activas'}`}
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Agendar cita" style={({ pressed }) => [s.addButton, pressed && s.pressed]} onPress={() => setCreateOpen(true)}>
            <Ionicons name="plus" size={21} color={colors.surface} />
          </Pressable>
        }
      />

      {agendaQuery.isLoading ? (
        <View style={s.loading}><CardSkeleton /><CardSkeleton /><CardSkeleton /></View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id_cita)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshing={agendaQuery.isFetching}
          onRefresh={agendaQuery.refetch}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View>
              {feedback ? <FeedbackBanner title={feedback.title} subtitle={feedback.subtitle} tone={feedback.tone} style={s.feedbackBanner} /> : null}
              <View style={s.summary}>
                <SummaryMetric label="Hoy" value={today} color={colors.info} />
                <View style={s.summaryDivider} />
                <SummaryMetric label="En curso" value={inProgress} color={colors.coral} />
                <View style={s.summaryDivider} />
                <SummaryMetric label="Agendadas" value={appointments.length - inProgress} color={colors.accent} />
              </View>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionHeader}>{section.title}</Text>
              <Text style={s.sectionCount}>{section.data.length} {section.data.length === 1 ? 'cita' : 'citas'}</Text>
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <AppointmentRow
              appointment={item}
              first={index === 0}
              last={index === section.data.length - 1}
              busy={lifecycle.isPending}
              onPatient={() => navigation.navigate('PacienteDetalle', {
                idPaciente: item.paciente.id_paciente,
                nombre: `${item.paciente.nombre} ${item.paciente.apellido_paterno}`,
              })}
              onStart={() => startAppointment(item)}
              onFinish={() => setFinishing(item)}
              onManage={() => setManaging(item)}
            />
          )}
          ListEmptyComponent={
            agendaQuery.isError ? (
              <EmptyState icon="cloud-offline-outline" title="No se pudo cargar la agenda" subtitle={(agendaQuery.error as Error)?.message} actionLabel="Reintentar" onAction={agendaQuery.refetch} />
            ) : (
              <EmptyState icon="calendar-clear-outline" title="Agenda disponible" subtitle="No hay citas activas. Programa una desde el botón superior." actionLabel="Agendar cita" onAction={() => setCreateOpen(true)} />
            )
          }
        />
      )}

      <CreateAppointmentModal
        open={createOpen}
        appointments={appointments}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setFeedback({ title: 'Cita programada', subtitle: 'El registro quedó disponible en la agenda móvil.', tone: 'success' })}
      />
      <ManageAppointmentModal
        appointment={managing}
        onClose={() => setManaging(null)}
        onEdit={() => {
          if (managing) setEditing({ appointment: managing, mode: 'EDITAR' })
          setManaging(null)
        }}
        onReschedule={() => {
          if (managing) setEditing({ appointment: managing, mode: 'REAGENDAR' })
          setManaging(null)
        }}
        onCancel={() => {
          if (managing) setCancelling(managing)
          setManaging(null)
        }}
      />
      <EditAppointmentModal
        state={editing}
        appointments={appointments}
        pending={lifecycle.isPending}
        onClose={() => setEditing(null)}
        onSubmit={(values) => editing && lifecycle.mutate({ id: editing.appointment.id_cita, action: editing.mode, ...values })}
      />
      <CancelAppointmentModal
        appointment={cancelling}
        pending={lifecycle.isPending}
        onClose={() => setCancelling(null)}
        onSubmit={(observaciones) => cancelling && lifecycle.mutate({ id: cancelling.id_cita, action: 'CANCELAR', observaciones })}
      />
      <FinishAppointmentModal
        appointment={finishing}
        pending={lifecycle.isPending}
        onClose={() => setFinishing(null)}
        onSubmit={(values) => finishing && lifecycle.mutate({ id: finishing.id_cita, action: 'FINALIZAR', observations: values })}
      />
    </View>
  )
}

function SummaryMetric({ label, value, color }: { label: string; value: number; color: string }) {
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.summaryMetric}>
      <Text style={[s.summaryValue, { color }]}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
    </View>
  )
}

function AppointmentRow({
  appointment,
  first,
  last,
  busy,
  onPatient,
  onStart,
  onFinish,
  onManage,
}: {
  appointment: AgendaItem
  first: boolean
  last: boolean
  busy: boolean
  onPatient: () => void
  onStart: () => void
  onFinish: () => void
  onManage: () => void
}) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const compact = useWindowDimensions().width < 360
  const time = new Date(appointment.fecha_cita).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  const inProgress = appointment.estado === 'EN_CURSO'
  const canManage = appointment.estado === 'PROGRAMADA'
  return (
    <View style={[s.row, first && s.rowFirst, last && s.rowLast, !first && s.rowDivider]}>
      <View style={s.rowMain}>
        <View style={[s.timeCol, inProgress && { borderRightColor: colors.coralSoft }]}>
          <Text style={[s.hour, inProgress && { color: colors.coral }]}>{time}</Text>
          <View style={[s.timelineDot, inProgress && { backgroundColor: colors.coral }]} />
        </View>
        <Avatar nombre={appointment.paciente.nombre} apellido={appointment.paciente.apellido_paterno} size={42} color={inProgress ? colors.coral : colors.accent} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir expediente de ${appointmentPerson(appointment)}`}
          style={({ pressed }) => [s.patientCopy, pressed && s.pressed]}
          onPress={onPatient}
        >
          <View style={s.patientLine}>
            <Text style={s.patientName} numberOfLines={1}>{appointment.paciente.nombre} {appointment.paciente.apellido_paterno}</Text>
            {!compact ? <StatusBadge label={inProgress ? 'EN CURSO' : 'PROGRAMADA'} tone={inProgress ? 'danger' : 'info'} /> : null}
          </View>
          {compact ? <StatusBadge label={inProgress ? 'EN CURSO' : 'PROGRAMADA'} tone={inProgress ? 'danger' : 'info'} style={s.compactStatus} /> : null}
          <Text style={s.reason} numberOfLines={2}>{appointment.motivo}</Text>
          <Text style={s.doctor}>Dr. {appointment.usuario.nombre} {appointment.usuario.apellido_paterno}</Text>
        </Pressable>
      </View>
      <View style={[s.rowActions, compact && s.rowActionsCompact]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir expediente de ${appointmentPerson(appointment)}`}
          style={({ pressed }) => [s.secondaryAction, compact && s.secondaryActionCompact, pressed && s.pressed]}
          onPress={onPatient}
        >
          <Ionicons name="file-text" size={16} color={colors.textSecondary} />
          <Text style={s.secondaryActionText}>Expediente</Text>
        </Pressable>
        {canManage ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Gestionar cita de ${appointmentPerson(appointment)}`}
            style={({ pressed }) => [s.secondaryAction, compact && s.secondaryActionCompact, pressed && s.pressed]}
            onPress={onManage}
          >
            <Ionicons name="more-horizontal" size={16} color={colors.textSecondary} />
            <Text style={s.secondaryActionText}>Gestionar</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${inProgress ? 'Finalizar' : 'Iniciar'} cita de ${appointmentPerson(appointment)}`}
          style={({ pressed }) => [s.primaryAction, compact && s.primaryActionCompact, inProgress && s.finishAction, pressed && s.pressed]}
          onPress={inProgress ? onFinish : onStart}
          disabled={busy}
        >
          {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name={inProgress ? 'check' : 'play'} size={16} color="#FFFFFF" />}
          <Text style={s.primaryActionText}>{inProgress ? 'Finalizar' : 'Iniciar'}</Text>
        </Pressable>
      </View>
    </View>
  )
}

function CreateAppointmentModal({
  open,
  appointments,
  onClose,
  onCreated,
}: {
  open: boolean
  appointments: AgendaItem[]
  onClose: () => void
  onCreated?: (appointment: AgendaItem) => void
}) {
  const queryClient = useQueryClient()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const [search, setSearch] = useState('')
  const [patient, setPatient] = useState<PacienteListItem | null>(null)
  const [date, setDate] = useState(inputDate(1))
  const [time, setTime] = useState('09:00')
  const [reason, setReason] = useState('')
  const patientsQuery = useQuery({
    queryKey: ['patients', 'appointment', search],
    queryFn: () => api.medico.pacientes(search || undefined, 1, 20),
    enabled: open && !patient,
    staleTime: 30_000,
  })
  const createAppointment = useMutation({
    mutationFn: () => {
      if (!patient) throw new Error('Selecciona un paciente.')
      const parsed = buildDateTime(date, time)
      if (!parsed) throw new Error('Usa una fecha y hora válidas.')
      if (parsed.getTime() <= Date.now()) throw new Error('La cita debe programarse en el futuro.')
      if (!reason.trim()) throw new Error('Escribe el motivo de la cita.')
      const conflict = findPatientConflict(appointments, patient.id_paciente, parsed)
      if (conflict) throw new Error('El paciente ya tiene una cita en ese horario.')
      return api.medico.crearCita({ id_paciente: patient.id_paciente, fecha: parsed.toISOString(), motivo: reason.trim() })
    },
    onSuccess: async (appointment) => {
      await queryClient.invalidateQueries({ queryKey: ['agenda'] })
      setPatient(null)
      setSearch('')
      setDate(inputDate(1))
      setTime('09:00')
      setReason('')
      onClose()
      onCreated?.(appointment)
    },
    onError: (error: any) => Alert.alert('Revisa la cita', error?.message ?? 'No se pudo programar.'),
  })

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <View><Text style={s.sheetOverline}>NUEVA ATENCIÓN</Text><Text style={s.sheetTitle}>Agendar cita</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar formulario de cita" style={s.closeButton} onPress={onClose}><Ionicons name="x" size={20} color={colors.textSecondary} /></Pressable>
          </View>

          <Text style={s.fieldLabel}>Paciente</Text>
          {patient ? (
            <View style={s.selectedPatient}>
              <Avatar nombre={patient.nombre} apellido={patient.apellido_paterno} size={40} />
              <View style={{ flex: 1 }}><Text style={s.selectedName}>{patient.nombre} {patient.apellido_paterno}</Text><Text style={s.selectedMeta}>Cédula {patient.cedula}</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Cambiar paciente" onPress={() => setPatient(null)}><Text style={s.changeText}>Cambiar</Text></Pressable>
            </View>
          ) : (
            <>
              <View style={s.searchField}><Ionicons name="search" size={17} color={colors.textMuted} /><TextInput value={search} onChangeText={setSearch} placeholder="Buscar paciente" placeholderTextColor={colors.textMuted} style={s.searchInput} /></View>
              <View style={s.patientResults}>
                {patientsQuery.isLoading ? <ActivityIndicator color={colors.accent} style={s.resultLoader} /> : (patientsQuery.data ?? []).slice(0, 4).map((item, index) => (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Seleccionar a ${item.nombre} ${item.apellido_paterno}`} key={item.id_paciente} style={[s.patientOption, index > 0 && s.optionDivider]} onPress={() => setPatient(item)}>
                    <Avatar nombre={item.nombre} apellido={item.apellido_paterno} size={34} />
                    <Text style={s.optionName}>{item.nombre} {item.apellido_paterno}</Text>
                    <Ionicons name="chevron-right" size={16} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <View style={s.dateRow}>
            <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Fecha</Text><TextInput value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" placeholderTextColor={colors.textMuted} style={s.textField} /></View>
            <View style={s.timeField}><Text style={s.fieldLabel}>Hora</Text><TextInput value={time} onChangeText={setTime} placeholder="09:00" placeholderTextColor={colors.textMuted} style={s.textField} /></View>
          </View>
          <View style={s.quickDates}>
            <DateChip label="Mañana" onPress={() => setDate(inputDate(1))} />
            <DateChip label="En 3 días" onPress={() => setDate(inputDate(3))} />
            <DateChip label="En 1 semana" onPress={() => setDate(inputDate(7))} />
          </View>

          <Text style={s.fieldLabel}>Motivo</Text>
          <TextInput value={reason} onChangeText={setReason} placeholder="Ej. Revisión de resultados" placeholderTextColor={colors.textMuted} style={[s.textField, s.reasonField]} multiline />

          <View style={s.sheetActions}>
            <Pressable accessibilityRole="button" style={s.cancelButton} onPress={onClose}><Text style={s.cancelText}>Cancelar</Text></Pressable>
            <Pressable accessibilityRole="button" style={s.submitButton} onPress={() => createAppointment.mutate()} disabled={createAppointment.isPending}>
              {createAppointment.isPending ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="calendar" size={17} color="#FFFFFF" /><Text style={s.submitText}>Programar cita</Text></>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function ManageAppointmentModal({
  appointment,
  onClose,
  onEdit,
  onReschedule,
  onCancel,
}: {
  appointment: AgendaItem | null
  onClose: () => void
  onEdit: () => void
  onReschedule: () => void
  onCancel: () => void
}) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const date = appointment ? new Date(appointment.fecha_cita) : null
  return (
    <Modal visible={!!appointment} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <View>
              <Text style={s.sheetOverline}>GESTIÓN DE CITA</Text>
              <Text style={s.sheetTitle}>{appointment ? appointmentPerson(appointment) : 'Cita'}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar gestión de cita" style={s.closeButton} onPress={onClose}><Ionicons name="x" size={20} color={colors.textSecondary} /></Pressable>
          </View>
          {appointment ? (
            <View style={s.manageSummary}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.manageDate}>{date?.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} · {date?.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
                <Text style={s.manageReason} numberOfLines={2}>{appointment.motivo}</Text>
              </View>
            </View>
          ) : null}

          <Pressable accessibilityRole="button" style={({ pressed }) => [s.manageOption, pressed && s.pressed]} onPress={onEdit}>
            <View style={[s.manageIcon, { backgroundColor: colors.infoBg }]}><Ionicons name="edit-2" size={18} color={colors.infoText} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.manageTitle}>Editar datos</Text>
              <Text style={s.manageSub}>Ajustar fecha, hora o motivo de la cita.</Text>
            </View>
            <Ionicons name="chevron-right" size={17} color={colors.textMuted} />
          </Pressable>
          <Pressable accessibilityRole="button" style={({ pressed }) => [s.manageOption, pressed && s.pressed]} onPress={onReschedule}>
            <View style={[s.manageIcon, { backgroundColor: colors.successBg }]}><Ionicons name="refresh-cw" size={18} color={colors.successText} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.manageTitle}>Reagendar</Text>
              <Text style={s.manageSub}>Mover la atención a un nuevo horario disponible.</Text>
            </View>
            <Ionicons name="chevron-right" size={17} color={colors.textMuted} />
          </Pressable>
          <Pressable accessibilityRole="button" style={({ pressed }) => [s.manageOption, s.manageDanger, pressed && s.pressed]} onPress={onCancel}>
            <View style={[s.manageIcon, { backgroundColor: colors.errorBg }]}><Ionicons name="x-circle" size={18} color={colors.errorText} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.manageTitle, { color: colors.errorText }]}>Cancelar cita</Text>
              <Text style={s.manageSub}>Marcarla como cancelada y liberar el horario.</Text>
            </View>
            <Ionicons name="chevron-right" size={17} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

function EditAppointmentModal({
  state,
  appointments,
  pending,
  onClose,
  onSubmit,
}: {
  state: EditState | null
  appointments: AgendaItem[]
  pending: boolean
  onClose: () => void
  onSubmit: (values: { fecha: string; motivo: string }) => void
}) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const appointment = state?.appointment ?? null
  const [date, setDate] = useState(inputDate(1))
  const [time, setTime] = useState('09:00')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!appointment) return
    const parsed = new Date(appointment.fecha_cita)
    setDate(dateInputFromDate(parsed))
    setTime(timeInputFromDate(parsed))
    setReason(appointment.motivo)
  }, [appointment])

  const submit = () => {
    if (!appointment) return
    const parsed = buildDateTime(date, time)
    if (!parsed) return Alert.alert('Fecha inválida', 'Usa una fecha y hora válidas.')
    if (parsed.getTime() <= Date.now()) return Alert.alert('Horario inválido', 'La cita debe quedar programada en el futuro.')
    if (!reason.trim()) return Alert.alert('Motivo obligatorio', 'Escribe el motivo de la cita.')
    const conflict = findPatientConflict(appointments, appointment.paciente.id_paciente, parsed, appointment.id_cita)
    if (conflict) return Alert.alert('Conflicto de horario', 'El paciente ya tiene una cita en ese horario.')
    onSubmit({ fecha: parsed.toISOString(), motivo: reason.trim() })
  }

  const mode = state?.mode ?? 'EDITAR'
  return (
    <Modal visible={!!state} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <View>
              <Text style={s.sheetOverline}>{mode === 'REAGENDAR' ? 'REAGENDAR ATENCIÓN' : 'EDITAR ATENCIÓN'}</Text>
              <Text style={s.sheetTitle}>{appointment ? appointmentPerson(appointment) : 'Cita'}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar edición de cita" style={s.closeButton} onPress={onClose}><Ionicons name="x" size={20} color={colors.textSecondary} /></Pressable>
          </View>
          <View style={s.dateRow}>
            <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Fecha</Text><TextInput value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" placeholderTextColor={colors.textMuted} style={s.textField} /></View>
            <View style={s.timeField}><Text style={s.fieldLabel}>Hora</Text><TextInput value={time} onChangeText={setTime} placeholder="09:00" placeholderTextColor={colors.textMuted} style={s.textField} /></View>
          </View>
          <View style={s.quickDates}>
            <DateChip label="Mañana" onPress={() => setDate(inputDate(1))} />
            <DateChip label="En 3 días" onPress={() => setDate(inputDate(3))} />
            <DateChip label="En 1 semana" onPress={() => setDate(inputDate(7))} />
          </View>
          <Text style={s.fieldLabel}>Motivo</Text>
          <TextInput value={reason} onChangeText={setReason} placeholder="Ej. Control metabólico" placeholderTextColor={colors.textMuted} style={[s.textField, s.reasonField]} multiline />
          <View style={s.validationNote}>
            <Ionicons name="shield" size={16} color={colors.textMuted} />
            <Text style={s.validationText}>PREDIA validará conflictos del paciente y del médico antes de guardar.</Text>
          </View>
          <View style={s.sheetActions}>
            <Pressable accessibilityRole="button" style={s.cancelButton} onPress={onClose}><Text style={s.cancelText}>Cerrar</Text></Pressable>
            <Pressable accessibilityRole="button" style={s.submitButton} onPress={submit} disabled={pending}>
              {pending ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="save" size={17} color="#FFFFFF" /><Text style={s.submitText}>{mode === 'REAGENDAR' ? 'Reagendar' : 'Guardar'}</Text></>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function CancelAppointmentModal({
  appointment,
  pending,
  onClose,
  onSubmit,
}: {
  appointment: AgendaItem | null
  pending: boolean
  onClose: () => void
  onSubmit: (observaciones: string) => void
}) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (appointment) setNote('')
  }, [appointment])

  return (
    <Modal visible={!!appointment} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <View>
              <Text style={s.sheetOverline}>CANCELACIÓN</Text>
              <Text style={s.sheetTitle}>Cancelar cita</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar cancelación de cita" style={s.closeButton} onPress={onClose}><Ionicons name="x" size={20} color={colors.textSecondary} /></Pressable>
          </View>
          <Text style={s.finishPatient}>{appointment ? appointmentPerson(appointment) : ''}</Text>
          <Text style={s.finishReason}>{appointment?.motivo}</Text>
          <Text style={s.fieldLabel}>Motivo de cancelación</Text>
          <TextInput
            style={[s.textField, s.reasonField]}
            value={note}
            onChangeText={setNote}
            placeholder="Opcional: paciente reprogramará, no asistirá, duplicada..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <View style={s.validationNote}>
            <Ionicons name="info" size={16} color={colors.warningText} />
            <Text style={s.validationText}>Esta acción libera el horario y la cita deja de mostrarse como activa.</Text>
          </View>
          <View style={s.sheetActions}>
            <Pressable accessibilityRole="button" style={s.cancelButton} onPress={onClose}><Text style={s.cancelText}>Conservar</Text></Pressable>
            <Pressable accessibilityRole="button" style={[s.submitButton, s.cancelSubmit]} onPress={() => onSubmit(note.trim())} disabled={pending}>
              {pending ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="x-circle" size={17} color="#FFFFFF" /><Text style={s.submitText}>Cancelar cita</Text></>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function DateChip({ label, onPress }: { label: string; onPress: () => void }) {
  const s = useThemedStyles(makeStyles)
  return <Pressable accessibilityRole="button" style={({ pressed }) => [s.dateChip, pressed && s.pressed]} onPress={onPress}><Text style={s.dateChipText}>{label}</Text></Pressable>
}

type FinishValues = { observaciones: string; diagnostico: string; tratamiento: string }

function FinishAppointmentModal({
  appointment,
  pending,
  onClose,
  onSubmit,
}: {
  appointment: AgendaItem | null
  pending: boolean
  onClose: () => void
  onSubmit: (values: FinishValues) => void
}) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const [values, setValues] = useState<FinishValues>({ observaciones: '', diagnostico: '', tratamiento: '' })
  const close = () => {
    setValues({ observaciones: '', diagnostico: '', tratamiento: '' })
    onClose()
  }
  return (
    <Modal visible={!!appointment} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <View><Text style={s.sheetOverline}>CIERRE CLÍNICO</Text><Text style={s.sheetTitle}>Finalizar consulta</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar finalización de consulta" style={s.closeButton} onPress={close}><Ionicons name="x" size={20} color={colors.textSecondary} /></Pressable>
          </View>
          <Text style={s.finishPatient}>{appointment?.paciente.nombre} {appointment?.paciente.apellido_paterno}</Text>
          <Text style={s.finishReason}>{appointment?.motivo}</Text>
          <Text style={s.fieldLabel}>Diagnóstico</Text>
          <TextInput style={s.textField} value={values.diagnostico} onChangeText={(diagnostico) => setValues((current) => ({ ...current, diagnostico }))} placeholder="Opcional" placeholderTextColor={colors.textMuted} />
          <Text style={s.fieldLabel}>Tratamiento</Text>
          <TextInput style={s.textField} value={values.tratamiento} onChangeText={(tratamiento) => setValues((current) => ({ ...current, tratamiento }))} placeholder="Opcional" placeholderTextColor={colors.textMuted} />
          <Text style={s.fieldLabel}>Nota de cierre</Text>
          <TextInput style={[s.textField, s.reasonField]} value={values.observaciones} onChangeText={(observaciones) => setValues((current) => ({ ...current, observaciones }))} placeholder="Evolución, acuerdos o indicaciones" placeholderTextColor={colors.textMuted} multiline />
          <View style={s.sheetActions}>
            <Pressable accessibilityRole="button" style={s.cancelButton} onPress={close}><Text style={s.cancelText}>Seguir atendiendo</Text></Pressable>
            <Pressable accessibilityRole="button" style={[s.submitButton, s.finishSubmit]} onPress={() => onSubmit(values)} disabled={pending}>
              {pending ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="check" size={17} color="#FFFFFF" /><Text style={s.submitText}>Finalizar</Text></>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loading: { padding: spacing.md },
  addButton: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl },
  feedbackBanner: { marginTop: spacing.xs },
  summary: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: colors.primaryDark, borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.xs },
  summaryMetric: { flex: 1 },
  summaryValue: { ...typography.title },
  summaryLabel: { ...typography.overline, color: '#AFCBCC', marginTop: 2 },
  summaryDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#416069', marginHorizontal: spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.xs },
  sectionHeader: { ...typography.bodyMedium, color: colors.textPrimary, textTransform: 'capitalize' },
  sectionCount: { ...typography.overline, color: colors.textMuted },
  row: { backgroundColor: colors.surface, padding: spacing.md, borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  rowFirst: { borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm },
  rowLast: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: radius.sm, borderBottomRightRadius: radius.sm },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeCol: { alignItems: 'flex-start', width: 58, alignSelf: 'stretch', justifyContent: 'center', borderRightWidth: 2, borderRightColor: colors.accentSoft },
  hour: { ...typography.caption, color: colors.accent },
  timelineDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, right: -5, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surface },
  patientCopy: { flex: 1 },
  patientLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  patientName: { flex: 1, ...typography.bodyMedium, color: colors.textPrimary },
  compactStatus: { alignSelf: 'flex-start', marginTop: 4 },
  reason: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
  doctor: { ...typography.overline, color: colors.textMuted, marginTop: 5 },
  rowActions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowActionsCompact: { flexWrap: 'wrap' },
  secondaryAction: { flex: 1, minHeight: 44, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryActionCompact: { flexBasis: '45%' },
  secondaryActionText: { ...typography.caption, color: colors.textSecondary },
  primaryAction: { flex: 1, minHeight: 44, borderRadius: radius.sm, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryActionCompact: { flexBasis: '100%' },
  finishAction: { backgroundColor: colors.coral },
  primaryActionText: { ...typography.caption, color: '#FFFFFF' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(4, 18, 22, 0.62)' },
  sheet: { backgroundColor: colors.elevated, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: Platform.OS === 'ios' ? spacing.xxxl : spacing.lg, maxHeight: '94%' },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: 'center', marginBottom: spacing.md },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  sheetOverline: { ...typography.overline, color: colors.accent },
  sheetTitle: { ...typography.title, color: colors.textPrimary, marginTop: 2 },
  closeButton: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { ...typography.overline, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 6, marginTop: spacing.sm },
  selectedPatient: { minHeight: 62, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  selectedName: { ...typography.bodyMedium, color: colors.textPrimary },
  selectedMeta: { ...typography.overline, color: colors.textMuted, marginTop: 2 },
  changeText: { ...typography.caption, color: colors.accent },
  searchField: { height: 46, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, paddingVertical: 0 },
  patientResults: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, marginTop: spacing.xs, maxHeight: 205 },
  patientOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  optionDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  optionName: { flex: 1, ...typography.caption, color: colors.textPrimary },
  resultLoader: { padding: spacing.md },
  manageSummary: { minHeight: 58, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, marginBottom: spacing.sm },
  manageDate: { ...typography.bodyMedium, color: colors.textPrimary, textTransform: 'capitalize' },
  manageReason: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  manageOption: { minHeight: 72, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, marginBottom: spacing.xs },
  manageDanger: { borderColor: colors.errorBg },
  manageIcon: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  manageTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  manageSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  dateRow: { flexDirection: 'row', gap: spacing.xs },
  timeField: { width: 112 },
  textField: { minHeight: 46, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingHorizontal: spacing.sm, ...typography.body, color: colors.textPrimary },
  reasonField: { minHeight: 72, paddingTop: spacing.sm, textAlignVertical: 'top' },
  quickDates: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  dateChip: { minHeight: 44, paddingHorizontal: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  dateChipText: { ...typography.overline, color: colors.textSecondary },
  validationNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, borderRadius: radius.md, padding: spacing.sm, backgroundColor: colors.surfaceMuted, marginTop: spacing.sm },
  validationText: { flex: 1, ...typography.caption, color: colors.textSecondary },
  sheetActions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.lg },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  cancelText: { ...typography.bodyMedium, color: colors.textSecondary },
  submitButton: { flex: 1.4, minHeight: 48, borderRadius: radius.sm, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  finishSubmit: { backgroundColor: colors.coral },
  cancelSubmit: { backgroundColor: colors.error },
  submitText: { ...typography.bodyMedium, color: '#FFFFFF' },
  finishPatient: { ...typography.bodyMedium, color: colors.textPrimary },
  finishReason: { ...typography.caption, color: colors.textSecondary, marginTop: 3, marginBottom: spacing.xs },
  pressed: { opacity: 0.72 },
})
