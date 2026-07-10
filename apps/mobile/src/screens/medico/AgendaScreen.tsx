import { useMemo, useState } from 'react'
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
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AgendaItem } from '@predia/shared'
import { api, type PacienteListItem } from '@/services/api'
import { ScreenHeader } from '@/components/Screen'
import { Avatar, CardSkeleton, EmptyState, Ionicons, StatusBadge } from '@/components/ui'
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

export function AgendaScreen() {
  const navigation = useNavigation<any>()
  const queryClient = useQueryClient()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const [createOpen, setCreateOpen] = useState(false)
  const [finishing, setFinishing] = useState<AgendaItem | null>(null)
  const agendaQuery = useQuery({ queryKey: ['agenda'], queryFn: () => api.medico.agenda(), staleTime: 20_000 })
  const appointments = agendaQuery.data ?? []

  const lifecycle = useMutation({
    mutationFn: ({ id, action, observations }: { id: number; action: 'INICIAR' | 'FINALIZAR'; observations?: FinishValues }) =>
      api.medico.actualizarCita(id, {
        action,
        observaciones: observations?.observaciones,
        diagnostico: observations?.diagnostico,
        tratamiento: observations?.tratamiento,
      }),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['agenda'] }),
        queryClient.invalidateQueries({ queryKey: ['clinical-alerts'] }),
      ])
      if (variables.action === 'INICIAR') Alert.alert('Consulta iniciada', 'La cita quedó marcada como en curso.')
      else {
        setFinishing(null)
        Alert.alert('Consulta finalizada', 'La atención y su nota de cierre quedaron registradas.')
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
          <Pressable accessibilityLabel="Agendar cita" style={({ pressed }) => [s.addButton, pressed && s.pressed]} onPress={() => setCreateOpen(true)}>
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
            <View style={s.summary}>
              <SummaryMetric label="Hoy" value={today} color={colors.info} />
              <View style={s.summaryDivider} />
              <SummaryMetric label="En curso" value={inProgress} color={colors.coral} />
              <View style={s.summaryDivider} />
              <SummaryMetric label="Programadas" value={appointments.length - inProgress} color={colors.accent} />
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

      <CreateAppointmentModal open={createOpen} onClose={() => setCreateOpen(false)} />
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
}: {
  appointment: AgendaItem
  first: boolean
  last: boolean
  busy: boolean
  onPatient: () => void
  onStart: () => void
  onFinish: () => void
}) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const time = new Date(appointment.fecha_cita).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  const inProgress = appointment.estado === 'EN_CURSO'
  return (
    <View style={[s.row, first && s.rowFirst, last && s.rowLast, !first && s.rowDivider]}>
      <View style={s.rowMain}>
        <View style={[s.timeCol, inProgress && { borderRightColor: colors.coralSoft }]}>
          <Text style={[s.hour, inProgress && { color: colors.coral }]}>{time}</Text>
          <View style={[s.timelineDot, inProgress && { backgroundColor: colors.coral }]} />
        </View>
        <Avatar nombre={appointment.paciente.nombre} apellido={appointment.paciente.apellido_paterno} size={42} color={inProgress ? colors.coral : colors.accent} />
        <Pressable style={({ pressed }) => [s.patientCopy, pressed && s.pressed]} onPress={onPatient}>
          <View style={s.patientLine}>
            <Text style={s.patientName} numberOfLines={1}>{appointment.paciente.nombre} {appointment.paciente.apellido_paterno}</Text>
            <StatusBadge label={inProgress ? 'EN CURSO' : 'PROGRAMADA'} tone={inProgress ? 'danger' : 'info'} />
          </View>
          <Text style={s.reason} numberOfLines={2}>{appointment.motivo}</Text>
          <Text style={s.doctor}>Dr. {appointment.usuario.nombre} {appointment.usuario.apellido_paterno}</Text>
        </Pressable>
      </View>
      <View style={s.rowActions}>
        <Pressable style={({ pressed }) => [s.secondaryAction, pressed && s.pressed]} onPress={onPatient}>
          <Ionicons name="file-text" size={16} color={colors.textSecondary} />
          <Text style={s.secondaryActionText}>Expediente</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.primaryAction, inProgress && s.finishAction, pressed && s.pressed]}
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

function CreateAppointmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      const parsed = new Date(`${date}T${time}:00`)
      if (Number.isNaN(parsed.getTime())) throw new Error('Usa una fecha y hora válidas.')
      if (parsed.getTime() <= Date.now()) throw new Error('La cita debe programarse en el futuro.')
      if (!reason.trim()) throw new Error('Escribe el motivo de la cita.')
      return api.medico.crearCita({ id_paciente: patient.id_paciente, fecha: parsed.toISOString(), motivo: reason.trim() })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agenda'] })
      setPatient(null)
      setSearch('')
      setDate(inputDate(1))
      setTime('09:00')
      setReason('')
      onClose()
      Alert.alert('Cita programada', 'La agenda se actualizó correctamente.')
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
            <Pressable style={s.closeButton} onPress={onClose}><Ionicons name="x" size={20} color={colors.textSecondary} /></Pressable>
          </View>

          <Text style={s.fieldLabel}>Paciente</Text>
          {patient ? (
            <View style={s.selectedPatient}>
              <Avatar nombre={patient.nombre} apellido={patient.apellido_paterno} size={40} />
              <View style={{ flex: 1 }}><Text style={s.selectedName}>{patient.nombre} {patient.apellido_paterno}</Text><Text style={s.selectedMeta}>Cédula {patient.cedula}</Text></View>
              <Pressable onPress={() => setPatient(null)}><Text style={s.changeText}>Cambiar</Text></Pressable>
            </View>
          ) : (
            <>
              <View style={s.searchField}><Ionicons name="search" size={17} color={colors.textMuted} /><TextInput value={search} onChangeText={setSearch} placeholder="Buscar paciente" placeholderTextColor={colors.textMuted} style={s.searchInput} /></View>
              <View style={s.patientResults}>
                {patientsQuery.isLoading ? <ActivityIndicator color={colors.accent} style={s.resultLoader} /> : (patientsQuery.data ?? []).slice(0, 4).map((item, index) => (
                  <Pressable key={item.id_paciente} style={[s.patientOption, index > 0 && s.optionDivider]} onPress={() => setPatient(item)}>
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
            <Pressable style={s.cancelButton} onPress={onClose}><Text style={s.cancelText}>Cancelar</Text></Pressable>
            <Pressable style={s.submitButton} onPress={() => createAppointment.mutate()} disabled={createAppointment.isPending}>
              {createAppointment.isPending ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="calendar" size={17} color="#FFFFFF" /><Text style={s.submitText}>Programar cita</Text></>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function DateChip({ label, onPress }: { label: string; onPress: () => void }) {
  const s = useThemedStyles(makeStyles)
  return <Pressable style={({ pressed }) => [s.dateChip, pressed && s.pressed]} onPress={onPress}><Text style={s.dateChipText}>{label}</Text></Pressable>
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
            <Pressable style={s.closeButton} onPress={close}><Ionicons name="x" size={20} color={colors.textSecondary} /></Pressable>
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
            <Pressable style={s.cancelButton} onPress={close}><Text style={s.cancelText}>Seguir atendiendo</Text></Pressable>
            <Pressable style={[s.submitButton, s.finishSubmit]} onPress={() => onSubmit(values)} disabled={pending}>
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
  addButton: { width: 42, height: 42, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl },
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
  reason: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
  doctor: { ...typography.overline, color: colors.textMuted, marginTop: 5 },
  rowActions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  secondaryAction: { flex: 1, minHeight: 40, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryActionText: { ...typography.caption, color: colors.textSecondary },
  primaryAction: { flex: 1, minHeight: 40, borderRadius: radius.sm, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  finishAction: { backgroundColor: colors.coral },
  primaryActionText: { ...typography.caption, color: '#FFFFFF' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(4, 18, 22, 0.62)' },
  sheet: { backgroundColor: colors.elevated, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: Platform.OS === 'ios' ? spacing.xxxl : spacing.lg, maxHeight: '94%' },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: 'center', marginBottom: spacing.md },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  sheetOverline: { ...typography.overline, color: colors.accent },
  sheetTitle: { ...typography.title, color: colors.textPrimary, marginTop: 2 },
  closeButton: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
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
  dateRow: { flexDirection: 'row', gap: spacing.xs },
  timeField: { width: 112 },
  textField: { minHeight: 46, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingHorizontal: spacing.sm, ...typography.body, color: colors.textPrimary },
  reasonField: { minHeight: 72, paddingTop: spacing.sm, textAlignVertical: 'top' },
  quickDates: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  dateChip: { minHeight: 32, paddingHorizontal: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  dateChipText: { ...typography.overline, color: colors.textSecondary },
  sheetActions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.lg },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  cancelText: { ...typography.bodyMedium, color: colors.textSecondary },
  submitButton: { flex: 1.4, minHeight: 48, borderRadius: radius.sm, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  finishSubmit: { backgroundColor: colors.coral },
  submitText: { ...typography.bodyMedium, color: '#FFFFFF' },
  finishPatient: { ...typography.bodyMedium, color: colors.textPrimary },
  finishReason: { ...typography.caption, color: colors.textSecondary, marginTop: 3, marginBottom: spacing.xs },
  pressed: { opacity: 0.72 },
})
