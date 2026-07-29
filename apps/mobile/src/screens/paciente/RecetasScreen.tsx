import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View, Text, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import type { RecetaResumen } from '@predia/shared'
import { parseMedicamentos, printHtml, recetaHtml, sharePdf, showPdfError } from '@/services/pdf'
import { Header } from '@/components/Header'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { QueryState } from '@/components/QueryState'
import { Ionicons } from '@/components/ui'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

const estadoVariant = (e: string) =>
  e === 'Activa' ? 'success' : e === 'Cancelada' ? 'error' : 'info'

type PdfBusy = { id: number; action: 'print' | 'share' } | null

export function RecetasScreen() {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const user = useAuthStore((st) => st.user)
  const id = user?.id_paciente
  const [pdfBusy, setPdfBusy] = useState<PdfBusy>(null)

  const q = useQuery({
    queryKey: ['recetas', id],
    queryFn: () => api.paciente.recetas(id!),
    enabled: !!id,
  })

  const recetas = q.data ?? []

  const runPdf = async (receta: RecetaResumen, action: 'print' | 'share') => {
    setPdfBusy({ id: receta.id_receta, action })
    try {
      const html = recetaHtml(receta, user?.nombre)
      if (action === 'print') await printHtml(html)
      else await sharePdf(`Receta PREDIA ${receta.id_receta}`, html)
    } catch (error) {
      showPdfError(error)
    } finally {
      setPdfBusy(null)
    }
  }

  return (
    <View style={s.root}>
      <Header title="Mis recetas" subtitle="Medicamentos e indicaciones activas" />
      <QueryState
        isLoading={q.isLoading}
        isError={q.isError}
        error={q.error}
        isEmpty={!q.isLoading && recetas.length === 0}
        emptyText="No tienes recetas registradas."
        onRetry={q.refetch}
      >
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {recetas.map((r) => {
            const meds = parseMedicamentos(r.medicamentos)
            const printing = pdfBusy?.id === r.id_receta && pdfBusy.action === 'print'
            const sharing = pdfBusy?.id === r.id_receta && pdfBusy.action === 'share'
            return (
              <Card key={r.id_receta}>
                <View style={s.medHeader}>
                  <View style={s.rxBadge}><Text style={s.rxText}>Rx</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.medName}>
                      {new Date(r.fecha_emision).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                    <Text style={s.medInst}>{r.medico}</Text>
                  </View>
                  <Badge label={r.estado} variant={estadoVariant(r.estado) as any} />
                </View>

                {meds.map((m, i) => (
                  <View key={i} style={s.medItem}>
                    <Text style={s.medItemName}>{m.nombre}{m.dosis ? ` · ${m.dosis}` : ''}</Text>
                    {(m.frecuencia || m.duracion) && (
                      <Text style={s.medItemDetail}>
                        {[m.frecuencia, m.duracion].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </View>
                ))}

                {r.instrucciones ? <Text style={s.instr}>Indicaciones: {r.instrucciones}</Text> : null}

                <View style={s.divider} />
                <View style={s.footerRow}>
                  <Text style={s.footerLabel}>{r.estado === 'Activa' ? 'Tratamiento activo' : `Estado: ${r.estado}`}</Text>
                  <View style={s.pdfActions}>
                    <Pressable style={({ pressed }) => [s.pdfButton, pressed && s.pressed]} onPress={() => runPdf(r, 'print')} disabled={!!pdfBusy}>
                      {printing ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <Ionicons name="printer" size={15} color={colors.textSecondary} />}
                      <Text style={s.pdfButtonText}>Imprimir</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [s.pdfButton, s.pdfPrimary, pressed && s.pressed]} onPress={() => runPdf(r, 'share')} disabled={!!pdfBusy}>
                      {sharing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="share-2" size={15} color="#FFFFFF" />}
                      <Text style={s.pdfPrimaryText}>PDF</Text>
                    </Pressable>
                  </View>
                </View>
              </Card>
            )
          })}
        </ScrollView>
      </QueryState>
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 32 },
  medHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  rxBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.infoBg, alignItems: 'center', justifyContent: 'center' },
  rxText: { ...typography.caption, color: colors.primary },
  medName: { ...typography.bodyMedium, color: colors.textPrimary },
  medInst: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  medItem: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.background },
  medItemName: { ...typography.caption, color: colors.textPrimary },
  medItemDetail: { ...typography.overline, color: colors.textSecondary, marginTop: 1 },
  instr: { ...typography.caption, color: colors.textSecondary, marginTop: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  footerLabel: { ...typography.caption, color: colors.textSecondary },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  pdfActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pdfButton: { minHeight: 34, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pdfPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  pdfButtonText: { ...typography.caption, color: colors.textSecondary },
  pdfPrimaryText: { ...typography.caption, color: '#FFFFFF' },
  pressed: { opacity: 0.72 },
})
