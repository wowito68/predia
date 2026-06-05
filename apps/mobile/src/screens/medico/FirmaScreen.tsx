import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native'
import * as LocalAuthentication from 'expo-local-authentication'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useMutation } from '@tanstack/react-query'
import { api, RecetaInput } from '@/services/api'
import { Badge } from '@/components/Badge'
import { colors, spacing, radius, fontSize } from '@/theme'

interface MedRow { nombre: string; dosis: string; frecuencia: string }

export function FirmaScreen() {
  const route = useRoute<any>()
  const nav = useNavigation<any>()
  const idPaciente: number | undefined = route.params?.idPaciente
  const nombre: string = route.params?.nombre ?? 'Paciente'

  const [meds, setMeds] = useState<MedRow[]>([])
  const [draft, setDraft] = useState<MedRow>({ nombre: '', dosis: '', frecuencia: '' })
  const [instrucciones, setInstrucciones] = useState('')

  const mut = useMutation({ mutationFn: (input: RecetaInput) => api.medico.crearReceta(input) })

  const addMed = () => {
    if (!draft.nombre.trim()) { Alert.alert('Falta nombre', 'Indica el medicamento.'); return }
    setMeds((m) => [...m, draft])
    setDraft({ nombre: '', dosis: '', frecuencia: '' })
  }

  const firmar = async () => {
    if (!idPaciente) { Alert.alert('Sin paciente', 'Abre esta pantalla desde un expediente.'); return }
    if (meds.length === 0) { Alert.alert('Sin medicamentos', 'Agrega al menos un medicamento.'); return }

    const compatible = await LocalAuthentication.hasHardwareAsync()
    const enrolled = await LocalAuthentication.isEnrolledAsync()
    if (!compatible || !enrolled) { Alert.alert('No disponible', 'Sin sensor biométrico configurado.'); return }

    const result = await LocalAuthentication.authenticateAsync({ promptMessage: `Firmar receta — ${nombre}`, fallbackLabel: 'Usar PIN' })
    if (!result.success) { Alert.alert('Cancelado', 'Firma no completada.'); return }

    mut.mutate(
      { id_paciente: idPaciente, medicamentos: meds, instrucciones: instrucciones.trim() || undefined },
      {
        onSuccess: () => Alert.alert('Receta firmada', `Receta de ${nombre} firmada y registrada.`, [{ text: 'OK', onPress: () => nav.goBack() }]),
        onError: (e: any) => Alert.alert('Error', e?.message ?? 'No se pudo emitir la receta'),
      },
    )
  }

  return (
    <View style={s.root}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => nav.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Firma de Receta</Text>
          <Text style={s.headerSub}>{nombre}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionTitle}>Medicamentos</Text>
        {meds.map((m, i) => (
          <View key={i} style={s.medCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.medName}>{m.nombre}</Text>
              <Text style={s.medMeta}>{[m.dosis, m.frecuencia].filter(Boolean).join(' · ')}</Text>
            </View>
            <TouchableOpacity onPress={() => setMeds((arr) => arr.filter((_, j) => j !== i))}>
              <Text style={s.remove}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={s.draftCard}>
          <TextInput style={s.input} placeholder="Medicamento (ej. Metformina)" placeholderTextColor={colors.textMuted} value={draft.nombre} onChangeText={(v) => setDraft((d) => ({ ...d, nombre: v }))} />
          <View style={s.draftRow}>
            <TextInput style={[s.input, { flex: 1 }]} placeholder="Dosis (850 mg)" placeholderTextColor={colors.textMuted} value={draft.dosis} onChangeText={(v) => setDraft((d) => ({ ...d, dosis: v }))} />
            <TextInput style={[s.input, { flex: 1 }]} placeholder="Frecuencia (c/12h)" placeholderTextColor={colors.textMuted} value={draft.frecuencia} onChangeText={(v) => setDraft((d) => ({ ...d, frecuencia: v }))} />
          </View>
          <TouchableOpacity style={s.addBtn} onPress={addMed}><Text style={s.addBtnText}>+ Agregar medicamento</Text></TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>Instrucciones</Text>
        <TextInput style={[s.input, { minHeight: 60 }]} placeholder="Indicaciones generales..." placeholderTextColor={colors.textMuted} value={instrucciones} onChangeText={setInstrucciones} multiline />

        <View style={s.firmaInfo}>
          <Text style={s.firmaRequerida}>Firma requerida</Text>
          <Badge label={`${meds.length} medicamento(s)`} variant="info" />
        </View>
        <TouchableOpacity style={s.firmaBtn} onPress={firmar} disabled={mut.isPending}>
          {mut.isPending ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={s.firmaBtnText}>Firmar con biometría y emitir</Text>
              <Text style={s.firmaBtnSub}>Huella / Face ID</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerBar: { backgroundColor: colors.primary, paddingTop: 48, paddingBottom: spacing.xl, paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { color: '#fff', fontSize: fontSize.xl, fontWeight: '300' },
  headerTitle: { color: '#fff', fontSize: fontSize.xl, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm },
  content: { padding: spacing.lg, paddingBottom: 32 },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm, marginTop: 4 },
  medCard: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  medName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  medMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  remove: { color: colors.error, fontSize: fontSize.lg, paddingHorizontal: 8 },
  draftCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, gap: 8, borderWidth: 1, borderColor: colors.border },
  draftRow: { flexDirection: 'row', gap: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: fontSize.sm, color: colors.textPrimary, backgroundColor: '#FAFAFA' },
  addBtn: { backgroundColor: colors.infoBg, borderRadius: radius.sm, padding: 10, alignItems: 'center' },
  addBtnText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.sm },
  firmaInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
  firmaRequerida: { fontSize: fontSize.xs, color: colors.textMuted },
  firmaBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center' },
  firmaBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.md },
  firmaBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.xs, marginTop: 2 },
})
