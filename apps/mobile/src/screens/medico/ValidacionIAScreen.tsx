import { useState } from 'react'
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { ValidarPrediccionInput } from '@predia/shared'
import { Header } from '@/components/Header'
import { Badge } from '@/components/Badge'
import { QueryState } from '@/components/QueryState'
import { spacing, radius, typography, riskColor, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

export function ValidacionIAScreen() {
  const qc = useQueryClient()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const [notas, setNotas] = useState<Record<number, string>>({})

  const q = useQuery({ queryKey: ['predicciones'], queryFn: () => api.medico.predicciones() })

  const mut = useMutation({
    mutationFn: ({ id, input }: { id: number; input: ValidarPrediccionInput }) => api.medico.validarPrediccion(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['predicciones'] })
    },
  })

  const pendientes = (q.data ?? []).filter((p) => !p.validado)

  const decidir = (id: number, nombre: string, confirmar: boolean) => {
    mut.mutate(
      { id, input: { diagnostico_confirmado: confirmar ? 'Confirmado' : 'Descartado', notas_medicas: notas[id] ?? '', validado: true } },
      {
        onSuccess: () => Alert.alert(confirmar ? 'Diagnóstico confirmado' : 'Predicción descartada', `Predicción de ${nombre} registrada.`),
        onError: (e: any) => Alert.alert('Error', e?.message ?? 'No se pudo validar'),
      },
    )
  }

  return (
    <View style={s.root}>
      <Header title="Validar Predicciones IA" />
      <QueryState isLoading={q.isLoading} isError={q.isError} error={q.error} onRetry={q.refetch}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.statsRow}>
            <Badge label={`${pendientes.length} pendientes`} variant="warning" />
            <Badge label={`${(q.data ?? []).length - pendientes.length} validadas`} variant="success" />
          </View>

          {pendientes.map((p) => {
            const risk = riskColor(p.nivel_riesgo, colors)
            const pct = Math.round(p.probabilidad_diabetes * 100)
            return (
              <View key={p.id_prediccion} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.nombre}>{p.paciente_nombre}</Text>
                  <View style={[s.riskBadge, { backgroundColor: risk.bg }]}>
                    <Text style={[s.riskBadgeText, { color: risk.text }]}>{risk.label} {pct}%</Text>
                  </View>
                </View>
                <View style={s.barBg}>
                  <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: risk.text }]} />
                </View>
                <Text style={s.factores}>Resultado del modelo: {p.resultado}</Text>
                <TextInput
                  style={s.notaInput}
                  placeholder="Nota médica breve..."
                  placeholderTextColor={colors.textMuted}
                  value={notas[p.id_prediccion] ?? ''}
                  onChangeText={(v) => setNotas((prev) => ({ ...prev, [p.id_prediccion]: v }))}
                  multiline
                />
                <View style={s.btnRow}>
                  <TouchableOpacity style={s.btnConfirmar} disabled={mut.isPending} onPress={() => decidir(p.id_prediccion, p.paciente_nombre, true)}>
                    {mut.isPending ? <ActivityIndicator color={colors.surface} /> : <Text style={s.btnConfirmarText}>Confirmar diagnóstico</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnRechazar} disabled={mut.isPending} onPress={() => decidir(p.id_prediccion, p.paciente_nombre, false)}>
                    <Text style={s.btnRechazarText}>Descartar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}

          {pendientes.length === 0 && (
            <View style={s.empty}><Text style={s.emptyText}>✓ Todas las predicciones revisadas</Text></View>
          )}
        </ScrollView>
      </QueryState>
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  nombre: { ...typography.bodyMedium, color: colors.textPrimary },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  riskBadgeText: { ...typography.overline },
  barBg: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginBottom: 10 },
  barFill: { height: 4, borderRadius: 2 },
  factores: { ...typography.caption, color: colors.textPrimary, marginBottom: 10 },
  notaInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 10,
    ...typography.caption, color: colors.textPrimary, backgroundColor: colors.background, marginBottom: 12, minHeight: 44,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnConfirmar: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, padding: 12, alignItems: 'center' },
  btnConfirmarText: { ...typography.overline, color: colors.surface },
  btnRechazar: { flex: 1, backgroundColor: colors.errorBg, borderRadius: radius.md, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.errorBg },
  btnRechazarText: { ...typography.overline, color: colors.error },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { ...typography.bodyMedium, color: colors.success },
})
