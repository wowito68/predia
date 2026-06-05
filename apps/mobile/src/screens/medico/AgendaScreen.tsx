import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QueryState } from '@/components/QueryState'
import { colors, spacing, radius, fontSize } from '@/theme'

export function AgendaScreen() {
  const nav = useNavigation<any>()
  const today = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  const q = useQuery({ queryKey: ['agenda'], queryFn: () => api.medico.agenda() })
  const citas = q.data ?? []

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Agenda del Día — {today}</Text>
      </View>
      <QueryState
        isLoading={q.isLoading}
        isError={q.isError}
        error={q.error}
        isEmpty={!q.isLoading && citas.length === 0}
        emptyText="No hay citas próximas programadas."
        onRetry={q.refetch}
      >
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>{citas.length} {citas.length === 1 ? 'cita próxima' : 'citas próximas'}</Text>
          </View>

          {citas.map((c) => {
            const hora = new Date(c.proxima_cita).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
            const fecha = new Date(c.proxima_cita).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
            const nombre = `${c.paciente.nombre} ${c.paciente.apellido_paterno}`
            return (
              <TouchableOpacity
                key={c.id_consulta}
                style={s.item}
                onPress={() => nav.navigate('IF-M04', { idPaciente: c.paciente.id_paciente, nombre })}
              >
                <View style={s.timeCol}>
                  <Text style={s.hora}>{hora}</Text>
                  <Text style={s.fecha}>{fecha}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.nombre}>{nombre}</Text>
                  <Text style={s.motivo}>{c.motivo_consulta}</Text>
                </View>
                <Text style={s.arrow}>→</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </QueryState>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingTop: 52, paddingBottom: spacing.xxl, paddingHorizontal: spacing.xl },
  title: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },
  content: { padding: spacing.lg, paddingBottom: 32 },
  summaryCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  summaryTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  item: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  timeCol: { width: 52, alignItems: 'center' },
  hora: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  fecha: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  nombre: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  motivo: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  arrow: { fontSize: 16, color: colors.textMuted },
})
