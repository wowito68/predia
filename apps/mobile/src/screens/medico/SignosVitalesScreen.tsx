import { useState } from 'react'
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, SignosVitalesInput } from '@/services/api'
import { colors, spacing, radius, fontSize } from '@/theme'

const CAMPOS: { key: keyof Omit<SignosVitalesInput, 'id_paciente' | 'observaciones'>; label: string; unidad: string; placeholder: string }[] = [
  { key: 'peso', label: 'Peso', unidad: 'kg', placeholder: '82.0' },
  { key: 'altura', label: 'Altura', unidad: 'm', placeholder: '1.72' },
  { key: 'presion_sistolica', label: 'Presión sistólica', unidad: 'mmHg', placeholder: '132' },
  { key: 'presion_diastolica', label: 'Presión diastólica', unidad: 'mmHg', placeholder: '86' },
  { key: 'circunferencia_cintura', label: 'Circunf. cintura', unidad: 'cm', placeholder: '94' },
  { key: 'circunferencia_cadera', label: 'Circunf. cadera', unidad: 'cm', placeholder: '102' },
]

export function SignosVitalesScreen() {
  const nav = useNavigation<any>()
  const route = useRoute<any>()
  const qc = useQueryClient()
  const idPaciente: number | undefined = route.params?.idPaciente
  const nombre: string = route.params?.nombre ?? 'Paciente'
  const [values, setValues] = useState<Record<string, string>>({})
  const [obs, setObs] = useState('')

  const mut = useMutation({
    mutationFn: (input: SignosVitalesInput) => api.medico.addSignos(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mediciones', idPaciente] }),
  })

  const guardar = () => {
    if (!idPaciente) { Alert.alert('Sin paciente', 'Abre esta pantalla desde un expediente.'); return }
    const input: SignosVitalesInput = { id_paciente: idPaciente }
    for (const c of CAMPOS) {
      const raw = values[c.key as string]
      if (raw) {
        const n = Number(raw)
        if (isNaN(n) || n <= 0) { Alert.alert('Valor inválido', `${c.label} no es un número válido.`); return }
        ;(input as any)[c.key] = n
      }
    }
    if (obs.trim()) input.observaciones = obs.trim()
    if (Object.keys(input).length === 1) { Alert.alert('Sin datos', 'Captura al menos una medición.'); return }

    mut.mutate(input, {
      onSuccess: () => { Alert.alert('Guardado', 'Signos vitales registrados en el expediente.'); nav.goBack() },
      onError: (e: any) => Alert.alert('Error', e?.message ?? 'No se pudo guardar'),
    })
  }

  return (
    <View style={s.root}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => nav.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Signos Vitales</Text>
          <Text style={s.headerSub}>{nombre}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {CAMPOS.map((c) => (
          <View key={c.key as string} style={s.card}>
            <Text style={s.fieldLabel}>{c.label} <Text style={s.unidad}>({c.unidad})</Text></Text>
            <TextInput
              style={s.input}
              value={values[c.key as string] ?? ''}
              onChangeText={(v) => setValues((p) => ({ ...p, [c.key as string]: v }))}
              keyboardType="numeric"
              placeholder={c.placeholder}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        ))}
        <View style={s.card}>
          <Text style={s.fieldLabel}>Observaciones</Text>
          <TextInput
            style={[s.input, { minHeight: 60 }]}
            value={obs}
            onChangeText={setObs}
            placeholder="Notas adicionales..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>

        <TouchableOpacity style={s.guardarBtn} onPress={guardar} disabled={mut.isPending}>
          {mut.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.guardarBtnText}>Guardar signos vitales</Text>}
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
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  fieldLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  unidad: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '400' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: fontSize.lg, fontWeight: '600', color: colors.textPrimary, backgroundColor: '#FAFAFA' },
  guardarBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 16, alignItems: 'center', marginTop: 8 },
  guardarBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.md },
})
