import { View, Text, FlatList, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Header } from '@/components/Header'
import { Badge } from '@/components/Badge'
import { QueryState } from '@/components/QueryState'
import { colors, spacing, radius, fontSize } from '@/theme'

const ALTO = ['ALTO', 'MUY_ALTO', 'MUY ALTO']

export function AlertasScreen() {
  const q = useQuery({ queryKey: ['predicciones'], queryFn: () => api.medico.predicciones() })
  const alertas = (q.data ?? []).filter((p) => ALTO.includes((p.nivel_riesgo || '').toUpperCase()))

  return (
    <View style={s.root}>
      <Header title="Alertas Críticas" />
      <QueryState
        isLoading={q.isLoading}
        isError={q.isError}
        error={q.error}
        isEmpty={!q.isLoading && alertas.length === 0}
        emptyText="Sin alertas críticas activas"
        onRetry={q.refetch}
      >
        <FlatList
          data={alertas}
          keyExtractor={(i) => String(i.id_prediccion)}
          contentContainerStyle={s.content}
          renderItem={({ item }) => {
            const muyAlto = (item.nivel_riesgo || '').toUpperCase().includes('MUY')
            const pct = Math.round(item.probabilidad_diabetes * 100)
            return (
              <View style={[s.card, { borderLeftColor: muyAlto ? colors.error : colors.warning }]}>
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.paciente}>{item.paciente_nombre}</Text>
                    <Text style={s.tipo}>Riesgo de diabetes (IA)</Text>
                    <Text style={s.detalle}>Predicción {pct}% — {item.validado ? 'validada' : 'requiere validación médica'}</Text>
                  </View>
                  <View style={s.right}>
                    <Badge label={muyAlto ? 'CRÍTICO' : 'ALERTA'} variant={muyAlto ? 'error' : 'warning'} />
                    <Text style={s.tiempo}>{new Date(item.fecha_prediccion).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</Text>
                  </View>
                </View>
              </View>
            )
          }}
        />
      </QueryState>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 32 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  row: { flexDirection: 'row', gap: 12 },
  paciente: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  tipo: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginTop: 2 },
  detalle: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4, lineHeight: 16 },
  right: { alignItems: 'flex-end', gap: 4 },
  tiempo: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
})
