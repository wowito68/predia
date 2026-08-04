import { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import * as LocalAuthentication from 'expo-local-authentication'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, RecetaInput } from '@/services/api'
import { Badge } from '@/components/Badge'
import { Screen, ScreenHeader } from '@/components/Screen'
import { EmptyState, FeedbackBanner, Ionicons, PremiumCard, PrimaryButton } from '@/components/ui'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

interface MedRow { nombre: string; dosis: string; frecuencia: string; duracion: string }

export function FirmaScreen() {
  const route = useRoute<any>()
  const nav = useNavigation<any>()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const qc = useQueryClient()
  const idPaciente: number | undefined = route.params?.idPaciente
  const nombre: string = route.params?.nombre ?? 'Paciente'

  const [meds, setMeds] = useState<MedRow[]>([])
  const [draft, setDraft] = useState<MedRow>({ nombre: '', dosis: '', frecuencia: '', duracion: '' })
  const [instrucciones, setInstrucciones] = useState('')
  const [saved, setSaved] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mut = useMutation({ mutationFn: (input: RecetaInput) => api.medico.crearReceta(input) })

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  const addMed = () => {
    if (!draft.nombre.trim()) { Alert.alert('Falta nombre', 'Indica el medicamento.'); return }
    setMeds((m) => [...m, draft])
    setDraft({ nombre: '', dosis: '', frecuencia: '', duracion: '' })
  }

  const emitir = () => {
    if (!idPaciente) return
    mut.mutate(
      { id_paciente: idPaciente, medicamentos: meds, instrucciones: instrucciones.trim() || undefined },
      {
        onSuccess: async () => {
          await Promise.all([
            qc.invalidateQueries({ queryKey: ['recetas', idPaciente] }),
            qc.invalidateQueries({ queryKey: ['expediente', idPaciente] }),
            qc.invalidateQueries({ queryKey: ['clinical-snapshot', idPaciente] }),
          ])
          setSaved(true)
          closeTimer.current = setTimeout(() => nav.goBack(), 900)
        },
        onError: (e: any) => Alert.alert('Error', e?.message ?? 'No se pudo emitir la receta'),
      },
    )
  }

  const firmar = async () => {
    if (!idPaciente) { Alert.alert('Sin paciente', 'Abre esta pantalla desde un expediente.'); return }
    if (meds.length === 0) { Alert.alert('Sin medicamentos', 'Agrega al menos un medicamento.'); return }

    const compatible = await LocalAuthentication.hasHardwareAsync()
    const enrolled = await LocalAuthentication.isEnrolledAsync()
    if (!compatible || !enrolled) {
      Alert.alert('Firma de demo', 'Este dispositivo no tiene biometría configurada. ¿Deseas emitir la receta con confirmación manual para la demo?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Emitir', onPress: emitir },
      ])
      return
    }

    const result = await LocalAuthentication.authenticateAsync({ promptMessage: `Firmar receta — ${nombre}`, fallbackLabel: 'Usar PIN' })
    if (!result.success) { Alert.alert('Cancelado', 'Firma no completada.'); return }

    emitir()
  }

  return (
    <View style={s.root}>
      <ScreenHeader title="Firma de receta" subtitle={nombre} onBack={() => nav.goBack()} />
      <Screen scroll padded>
        {saved ? <FeedbackBanner title="Receta emitida" subtitle={`Receta de ${nombre} firmada y registrada.`} tone="success" /> : null}
        <Text style={s.sectionTitle}>Medicamentos</Text>
        {meds.length === 0 ? (
          <EmptyState icon="medkit-outline" title="Sin medicamentos agregados" subtitle="Agrega al menos un medicamento antes de firmar la receta." />
        ) : (
          meds.map((m, i) => (
            <PremiumCard key={i} style={s.medCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.medName}>{m.nombre}</Text>
                <Text style={s.medMeta}>{[m.dosis, m.frecuencia, m.duracion].filter(Boolean).join(' · ')}</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Eliminar ${m.nombre}`} style={s.removeButton} onPress={() => setMeds((arr) => arr.filter((_, j) => j !== i))}>
                <Ionicons name="trash-2" size={18} color={colors.error} />
              </TouchableOpacity>
            </PremiumCard>
          ))
        )}

        <PremiumCard style={s.draftCard}>
          <TextInput style={s.input} placeholder="Medicamento (ej. Metformina)" placeholderTextColor={colors.textMuted} value={draft.nombre} onChangeText={(v) => setDraft((d) => ({ ...d, nombre: v }))} />
          <View style={s.draftRow}>
            <TextInput style={s.input} placeholder="Dosis (850 mg)" placeholderTextColor={colors.textMuted} value={draft.dosis} onChangeText={(v) => setDraft((d) => ({ ...d, dosis: v }))} />
            <TextInput style={s.input} placeholder="Frecuencia (c/12h)" placeholderTextColor={colors.textMuted} value={draft.frecuencia} onChangeText={(v) => setDraft((d) => ({ ...d, frecuencia: v }))} />
          </View>
          <TextInput style={s.input} placeholder="Duración (30 días)" placeholderTextColor={colors.textMuted} value={draft.duracion} onChangeText={(v) => setDraft((d) => ({ ...d, duracion: v }))} />
          <TouchableOpacity accessibilityRole="button" style={s.addBtn} onPress={addMed}><Ionicons name="plus" size={17} color={colors.primary} /><Text style={s.addBtnText}>Agregar medicamento</Text></TouchableOpacity>
        </PremiumCard>

        <Text style={s.sectionTitle}>Instrucciones</Text>
        <TextInput style={[s.input, { minHeight: 60 }]} placeholder="Indicaciones generales..." placeholderTextColor={colors.textMuted} value={instrucciones} onChangeText={setInstrucciones} multiline />

        <View style={s.firmaInfo}>
          <Text style={s.firmaRequerida}>Firma requerida</Text>
          <Badge label={`${meds.length} medicamento(s)`} variant="info" />
        </View>
        <PrimaryButton label={saved ? 'Receta emitida' : 'Firmar con biometría y emitir'} icon="finger-print" onPress={firmar} disabled={mut.isPending || saved} />
        {mut.isPending ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} /> : <Text style={s.firmaBtnSub}>Huella / Face ID o confirmacion manual de demo</Text>}
      </Screen>
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  sectionTitle: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.xs },
  medCard: { marginBottom: spacing.xs, flexDirection: 'row', alignItems: 'center' },
  medName: { ...typography.bodyMedium, color: colors.textPrimary },
  medMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  removeButton: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.errorBg, alignItems: 'center', justifyContent: 'center' },
  draftCard: { marginBottom: spacing.md, gap: 8 },
  draftRow: { gap: 8 },
  input: { width: '100%', minWidth: 0, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, ...typography.body, color: colors.textPrimary, backgroundColor: colors.background },
  addBtn: { minHeight: 44, backgroundColor: colors.infoBg, borderRadius: radius.md, padding: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  addBtnText: { ...typography.caption, color: colors.primary },
  firmaInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
  firmaRequerida: { ...typography.overline, color: colors.textMuted },
  firmaBtnSub: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' },
})
