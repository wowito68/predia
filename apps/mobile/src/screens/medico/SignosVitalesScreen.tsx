import { useState } from 'react'
import { View, Text, TextInput, Alert, ActivityIndicator, StyleSheet } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, SignosVitalesInput } from '@/services/api'
import { Screen, ScreenHeader } from '@/components/Screen'
import { PremiumCard, PrimaryButton } from '@/components/ui'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

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
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
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
      <ScreenHeader title="Signos vitales" subtitle={nombre} onBack={() => nav.goBack()} />
      <Screen scroll padded>
        {CAMPOS.map((c) => (
          <PremiumCard key={c.key as string} style={s.card}>
            <Text style={s.fieldLabel}>{c.label} <Text style={s.unidad}>({c.unidad})</Text></Text>
            <TextInput
              style={s.input}
              value={values[c.key as string] ?? ''}
              onChangeText={(v) => setValues((p) => ({ ...p, [c.key as string]: v }))}
              keyboardType="numeric"
              placeholder={c.placeholder}
              placeholderTextColor={colors.textMuted}
            />
          </PremiumCard>
        ))}
        <PremiumCard style={s.card}>
          <Text style={s.fieldLabel}>Observaciones</Text>
          <TextInput
            style={[s.input, { minHeight: 60 }]}
            value={obs}
            onChangeText={setObs}
            placeholder="Notas adicionales..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </PremiumCard>

        <PrimaryButton label="Guardar signos vitales" onPress={guardar} disabled={mut.isPending} />
        {mut.isPending ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} /> : null}
      </Screen>
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  card: { marginBottom: spacing.xs },
  fieldLabel: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: 8 },
  unidad: { ...typography.caption, color: colors.textSecondary },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, ...typography.title, color: colors.textPrimary, backgroundColor: colors.background },
})
