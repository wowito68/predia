import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigation, useRoute } from '@react-navigation/native'
import Svg, { Circle } from 'react-native-svg'
import { api, type EnsanutScreeningInput, type EnsanutScreeningResult } from '@/services/api'
import { Screen, ScreenHeader } from '@/components/Screen'
import { EmptyState, FeedbackBanner, Ionicons, PremiumCard, PrimaryButton, SectionTitle, StatusBadge } from '@/components/ui'
import { radius, spacing, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'


type BinaryAnswer = 0 | 1 | null

const ANSWERS: Array<{ value: BinaryAnswer; label: string }> = [
  { value: 1, label: 'Sí' },
  { value: 0, label: 'No' },
  { value: null, label: 'No sabe' },
]


export function TamizajeEnsanutScreen() {
  const nav = useNavigation<any>()
  const route = useRoute<any>()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const idPaciente: number | undefined = route.params?.idPaciente
  const nombre: string = route.params?.nombre ?? 'Paciente'
  const hydrated = useRef(false)
  const [age, setAge] = useState('')
  const [female, setFemale] = useState<0 | 1>(1)
  const [bmi, setBmi] = useState('')
  const [waist, setWaist] = useState('')
  const [parentDiabetes, setParentDiabetes] = useState<BinaryAnswer>(null)
  const [hypertension, setHypertension] = useState<BinaryAnswer>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [result, setResult] = useState<EnsanutScreeningResult | null>(null)

  useEffect(() => {
    if (Platform.OS === 'web') window.scrollTo({ top: 0, left: 0 })
  }, [])

  const snapshot = useQuery({
    queryKey: ['clinical-snapshot', idPaciente],
    queryFn: () => api.medico.snapshot(idPaciente!),
    enabled: !!idPaciente,
    staleTime: 45_000,
  })

  useEffect(() => {
    if (!snapshot.data || hydrated.current) return
    hydrated.current = true
    const patient = snapshot.data.paciente
    const measurement = snapshot.data.summary.ultimaMedicion
    const gender = String(patient.genero ?? '').trim().toUpperCase()
    setAge(patient.edad != null ? String(patient.edad) : '')
    setFemale(gender.startsWith('M') && !gender.startsWith('MUJ') ? 0 : 1)
    setBmi(measurement?.imc != null ? String(measurement.imc) : '')
    setWaist(measurement?.circunferencia_cintura != null ? String(measurement.circunferencia_cintura) : '')
    const hasHypertension = snapshot.data.summary.patologias.some((item: any) =>
      String(item.patologia ?? '').toLowerCase().includes('hipertens'),
    )
    if (hasHypertension) setHypertension(1)
  }, [snapshot.data])

  const mutation = useMutation({
    mutationFn: (input: EnsanutScreeningInput) => api.medico.tamizajeEnsanut(input),
    onSuccess: setResult,
  })

  const evaluate = () => {
    setFormError(null)
    if (!idPaciente) {
      setFormError('Abre el tamizaje desde el expediente de un paciente.')
      return
    }
    const parsedAge = Number(age)
    const parsedBmi = Number(bmi)
    const parsedWaist = Number(waist)
    if (!Number.isFinite(parsedAge) || parsedAge < 20 || parsedAge > 110) {
      setFormError('La edad debe estar entre 20 y 110 años.')
      return
    }
    if (!Number.isFinite(parsedBmi) || parsedBmi < 10 || parsedBmi > 80) {
      setFormError('El IMC debe estar entre 10 y 80 kg/m².')
      return
    }
    if (!Number.isFinite(parsedWaist) || parsedWaist < 40 || parsedWaist > 220) {
      setFormError('La cintura debe estar entre 40 y 220 cm.')
      return
    }
    mutation.mutate({
      id_paciente: idPaciente,
      age: parsedAge,
      female,
      parent_diabetes: parentDiabetes,
      diagnosed_hypertension: hypertension,
      bmi: parsedBmi,
      waist_cm: parsedWaist,
    }, {
      onError: (error) => setFormError((error as Error)?.message ?? 'No se pudo ejecutar el tamizaje.'),
    })
  }

  return (
    <View style={s.root}>
      <ScreenHeader title="Tamizaje ENSANUT" subtitle={nombre} onBack={() => nav.goBack()} />
      <Screen scroll padded>
        {snapshot.isLoading ? <ActivityIndicator color={colors.primary} style={s.loader} /> : null}
        {snapshot.isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="No se pudo cargar el expediente"
            subtitle={(snapshot.error as Error)?.message}
            actionLabel="Reintentar"
            onAction={snapshot.refetch}
          />
        ) : null}

        {!snapshot.isError && !result ? (
          <>
            <FeedbackBanner
              icon="info"
              title="Prototipo de investigación"
              subtitle="Estima prioridad para confirmación bioquímica. No diagnostica diabetes."
              tone="info"
            />

            <SectionTitle>Datos de tamizaje</SectionTitle>
            <PremiumCard style={s.formCard}>
              <Field label="Edad" unit="años" value={age} onChange={setAge} placeholder="45" />
              <View style={s.divider} />
              <Text style={s.label}>Sexo registrado en el modelo</Text>
              <View style={s.segmented}>
                <Segment label="Mujer" active={female === 1} onPress={() => setFemale(1)} />
                <Segment label="Hombre" active={female === 0} onPress={() => setFemale(0)} />
              </View>
              <Text style={s.helper}>La encuesta de desarrollo utilizó codificación binaria; esta limitación se conserva de forma transparente.</Text>
              <View style={s.divider} />
              <Field label="Índice de masa corporal" unit="kg/m²" value={bmi} onChange={setBmi} placeholder="27.8" />
              <View style={s.divider} />
              <Field label="Circunferencia de cintura" unit="cm" value={waist} onChange={setWaist} placeholder="94" />
            </PremiumCard>

            <SectionTitle>Antecedentes</SectionTitle>
            <PremiumCard style={s.formCard}>
              <BinaryField label="¿Padre o madre con diabetes?" value={parentDiabetes} onChange={setParentDiabetes} />
              <View style={s.divider} />
              <BinaryField label="¿Hipertensión diagnosticada previamente?" value={hypertension} onChange={setHypertension} />
            </PremiumCard>

            {formError ? <FeedbackBanner title="Revisa los datos" subtitle={formError} tone="danger" style={s.feedback} /> : null}
            <PrimaryButton
              label={mutation.isPending ? 'Calculando…' : 'Evaluar prioridad de confirmación'}
              icon="target"
              onPress={evaluate}
              disabled={mutation.isPending || snapshot.isLoading}
              style={s.submit}
            />
          </>
        ) : null}

        {result ? <ScreeningResult result={result} onReset={() => setResult(null)} /> : null}
      </Screen>
    </View>
  )
}


function Field({ label, unit, value, onChange, placeholder }: { label: string; unit: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <View style={s.numericRow}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={s.input}
        />
        <Text style={s.unit}>{unit}</Text>
      </View>
    </View>
  )
}


function BinaryField({ label, value, onChange }: { label: string; value: BinaryAnswer; onChange: (value: BinaryAnswer) => void }) {
  const s = useThemedStyles(makeStyles)
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <View style={s.segmented}>
        {ANSWERS.map((answer) => (
          <Segment key={answer.label} label={answer.label} active={value === answer.value} onPress={() => onChange(answer.value)} />
        ))}
      </View>
    </View>
  )
}


function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const s = useThemedStyles(makeStyles)
  return (
    <Pressable style={({ pressed }) => [s.segment, active && s.segmentActive, pressed && s.pressed]} onPress={onPress}>
      <Text style={[s.segmentText, active && s.segmentTextActive]}>{label}</Text>
    </Pressable>
  )
}


function ScreeningResult({ result, onReset }: { result: EnsanutScreeningResult; onReset: () => void }) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const positive = result.screenPositive
  const heroBackground = positive ? colors.elevated : colors.successBg
  const heroBorder = positive ? colors.warning : colors.success
  return (
    <>
      <PremiumCard style={{ ...s.resultHero, backgroundColor: heroBackground, borderColor: heroBorder }}>
        <ScreeningGauge value={result.screeningIndex} positive={positive} />
        <StatusBadge label={positive ? 'PRIORIZAR CONFIRMACIÓN' : 'NO PRIORIZADO'} tone={positive ? 'warning' : 'success'} />
        <Text style={[s.resultTitle, { color: positive ? colors.warningText : colors.successText }]}>
          {positive ? 'Conviene solicitar pruebas' : 'Sin prioridad por el modelo'}
        </Text>
        <Text style={s.resultBody}>{result.recommendation}</Text>
      </PremiumCard>

      <FeedbackBanner title="Límite clínico" subtitle={result.warning} tone="warning" style={s.feedback} />

      <SectionTitle>Factores observados</SectionTitle>
      <PremiumCard>
        {result.factors.length ? result.factors.map((factor) => (
          <View key={factor} style={s.factorRow}>
            <Ionicons name="check-circle" size={17} color={colors.primary} />
            <Text style={s.factorText}>{factor}</Text>
          </View>
        )) : <Text style={s.muted}>No se identificaron factores clínicos destacados en las reglas descriptivas.</Text>}
      </PremiumCard>

      <SectionTitle>Evidencia temporal</SectionTitle>
      <PremiumCard>
        <View style={s.metricRow}>
          <Metric label="ROC-AUC" value={result.evidence.rocAuc.toFixed(3)} />
          <Metric label="Sensibilidad" value={`${Math.round(result.evidence.sensitivity * 100)}%`} />
          <Metric label="Especificidad" value={`${Math.round(result.evidence.specificity * 100)}%`} />
        </View>
        <Text style={s.helper}>Prueba temporal bloqueada en ENSANUT {result.evidence.testWave}. Índice de tamizaje, no probabilidad diagnóstica individual.</Text>
        <Text style={s.version}>Modelo {result.modelVersion} · {result.studyFingerprint.slice(0, 10)}</Text>
      </PremiumCard>

      <PrimaryButton label="Nueva evaluación" icon="refresh-cw" variant="secondary" onPress={onReset} style={s.submit} />
    </>
  )
}


function ScreeningGauge({ value, positive }: { value: number; positive: boolean }) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const size = 136
  const stroke = 11
  const radiusValue = (size - stroke) / 2
  const circumference = 2 * Math.PI * radiusValue
  const progress = Math.max(0, Math.min(100, value)) / 100
  const color = positive ? colors.warning : colors.success
  return (
    <View style={s.gauge}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        <Circle cx={size / 2} cy={size / 2} r={radiusValue} stroke={colors.surfaceSunken} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[s.gaugeValue, { color }]}>{value}</Text>
      <Text style={s.gaugeLabel}>ÍNDICE / 100</Text>
    </View>
  )
}


function Metric({ label, value }: { label: string; value: string }) {
  const s = useThemedStyles(makeStyles)
  return (
    <View style={s.metric}>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  )
}


const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loader: { marginVertical: spacing.xxl },
  formCard: { gap: spacing.md, minWidth: 0 },
  label: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: spacing.xs },
  helper: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  numericRow: { width: '100%', minWidth: 0, minHeight: 50, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: spacing.sm },
  input: { flex: 1, minWidth: 0, ...typography.title, color: colors.textPrimary, paddingVertical: spacing.xs },
  unit: { flexShrink: 0, ...typography.caption, color: colors.textSecondary, marginLeft: spacing.xs },
  segmented: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: spacing.xs },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { ...typography.caption, color: colors.textSecondary },
  segmentTextActive: { color: colors.surface, fontFamily: typography.family.semibold },
  pressed: { opacity: 0.74 },
  feedback: { marginTop: spacing.md },
  submit: { marginTop: spacing.lg, marginBottom: spacing.sm },
  resultHero: { alignItems: 'center', paddingVertical: spacing.xl, borderWidth: 1 },
  gauge: { width: 136, height: 136, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  gaugeValue: { ...typography.display, fontSize: 38, lineHeight: 43 },
  gaugeLabel: { ...typography.overline, color: colors.textSecondary },
  resultTitle: { ...typography.title, textAlign: 'center', marginTop: spacing.sm },
  resultBody: { ...typography.body, color: colors.textPrimary, textAlign: 'center', marginTop: spacing.xs, maxWidth: 310 },
  factorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginBottom: spacing.sm },
  factorText: { flex: 1, ...typography.body, color: colors.textPrimary },
  muted: { ...typography.body, color: colors.textSecondary },
  metricRow: { flexDirection: 'row', gap: spacing.xs },
  metric: { flex: 1, minHeight: 74, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.surfaceMuted, padding: spacing.xs },
  metricValue: { ...typography.title, color: colors.textPrimary },
  metricLabel: { ...typography.overline, color: colors.textSecondary, textAlign: 'center', marginTop: 3 },
  version: { ...typography.overline, color: colors.textMuted, marginTop: spacing.md },
})
