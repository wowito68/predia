import { useState } from 'react'
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import type { AutomonitoreoInput, AutomonitoreoRegistro, TipoAutomonitoreo } from '@predia/shared'
import { Header } from '@/components/Header'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

const TIPOS: { tipo: TipoAutomonitoreo; label: string; unidad: string; placeholder: string }[] = [
  { tipo: 'glucosa', label: 'Glucosa capilar', unidad: 'mg/dL', placeholder: 'Ej. 110' },
  { tipo: 'presion', label: 'Presión arterial', unidad: 'mmHg', placeholder: 'Ej. 120/80' },
  { tipo: 'peso', label: 'Peso corporal', unidad: 'kg', placeholder: 'Ej. 74.5' },
]

const circleTone = (tipo: TipoAutomonitoreo, colors: AppColors) =>
  tipo === 'glucosa' ? colors.errorBg : tipo === 'presion' ? colors.warningBg : colors.successBg

const lastOf = (rows: AutomonitoreoRegistro[], tipo: TipoAutomonitoreo) =>
  [...rows].reverse().find((r) => r.tipo === tipo)

export function AutomonitoreoScreen() {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const id = useAuthStore((st) => st.user?.id_paciente)
  const qc = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>({})
  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const recent = useQuery({
    queryKey: ['automonitoreo', id, 30],
    queryFn: () => api.paciente.automonitoreo(id!, undefined, 30),
    enabled: !!id,
  })

  const mut = useMutation({
    mutationFn: (input: AutomonitoreoInput) => api.paciente.addAutomonitoreo(id!, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automonitoreo', id] })
      qc.invalidateQueries({ queryKey: ['dashboard', id] })
    },
  })

  const registrar = (tipo: TipoAutomonitoreo, unidad: string) => {
    const raw = (values[tipo] ?? '').trim()
    if (!raw) { Alert.alert('Campo vacío', 'Ingresa un valor.'); return }

    let input: AutomonitoreoInput
    if (tipo === 'presion') {
      const m = raw.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/)
      if (!m) { Alert.alert('Formato inválido', 'Usa el formato sistólica/diastólica, ej. 120/80.'); return }
      input = { tipo, valor: Number(m[1]), valor_secundario: Number(m[2]), unidad }
    } else {
      const v = Number(raw)
      if (isNaN(v) || v <= 0) { Alert.alert('Valor inválido', 'Ingresa un número válido.'); return }
      input = { tipo, valor: v, unidad }
    }

    mut.mutate(input, {
      onSuccess: () => {
        setValues((prev) => ({ ...prev, [tipo]: '' }))
        Alert.alert('Registrado', 'Tu medición se guardó correctamente.')
      },
      onError: (e: any) => Alert.alert('Error', e?.message ?? 'No se pudo registrar'),
    })
  }

  const rows = recent.data ?? []

  return (
    <View style={s.root}>
      <Header title="Automonitoreo de Salud" showBack />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.dayCard}>
          <View>
            <Text style={s.dayTitle}>Registro del día</Text>
            <Text style={s.dayDate}>{today.charAt(0).toUpperCase() + today.slice(1)}</Text>
          </View>
        </View>

        {TIPOS.map((m) => {
          const last = lastOf(rows, m.tipo)
          const lastTxt = last
            ? m.tipo === 'presion'
              ? `${last.valor}/${last.valor_secundario} ${m.unidad}`
              : `${last.valor} ${m.unidad}`
            : '—'
          return (
            <View key={m.tipo} style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.circle, { backgroundColor: circleTone(m.tipo, colors) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.medLabel}>{m.label}</Text>
                  <Text style={s.medUltimo}>Último: {lastTxt}</Text>
                </View>
              </View>
              <View style={s.inputRow}>
                <TextInput
                  style={s.input}
                  placeholder={`${m.placeholder} (${m.unidad})`}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={m.tipo === 'presion' ? 'default' : 'numeric'}
                  value={values[m.tipo] ?? ''}
                  onChangeText={(v) => setValues((prev) => ({ ...prev, [m.tipo]: v }))}
                />
                <TouchableOpacity style={s.regBtn} onPress={() => registrar(m.tipo, m.unidad)} disabled={mut.isPending}>
                  {mut.isPending ? <ActivityIndicator color={colors.surface} /> : <Text style={s.regBtnText}>+ Registrar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 32 },
  dayCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  dayTitle: { ...typography.caption, color: colors.textSecondary },
  dayDate: { ...typography.bodyMedium, color: colors.textPrimary, textTransform: 'capitalize' },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  circle: { width: 44, height: 44, borderRadius: 22 },
  medLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  medUltimo: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderRadius: radius.md, backgroundColor: colors.background, color: colors.textPrimary, paddingHorizontal: 14, paddingVertical: 10, ...typography.caption, borderWidth: 1, borderColor: colors.border },
  regBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center', minWidth: 110, alignItems: 'center' },
  regBtnText: { ...typography.caption, color: '#fff' },
})
