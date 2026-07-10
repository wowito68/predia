import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { useAudioRecorder, RecordingPresets, AudioModule, setAudioModeAsync } from 'expo-audio'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Screen, ScreenHeader } from '@/components/Screen'
import { PremiumCard, PrimaryButton } from '@/components/ui'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

function Waveform({ active }: { active: boolean }) {
  const wS = useThemedStyles(makeWaveStyles)
  const heights = [20, 35, 28, 45, 18, 40, 32, 48, 25, 38, 30, 50, 22, 42, 35, 28, 45, 18, 40, 32]
  return (
    <View style={wS.root}>
      {heights.map((h, i) => (
        <View key={i} style={[wS.bar, { height: active ? h : h * 0.3, opacity: active ? 1 : 0.4 }]} />
      ))}
    </View>
  )
}
const makeWaveStyles = (colors: AppColors) => StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 60 },
  bar: { width: 8, backgroundColor: colors.primary, borderRadius: 4 },
})

export function DictadoNotasScreen() {
  const route = useRoute<any>()
  const nav = useNavigation<any>()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const qc = useQueryClient()
  const idPaciente: number | undefined = route.params?.idPaciente
  const nombre: string = route.params?.nombre ?? ''
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)

  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [texto, setTexto] = useState('')
  const [procesando, setProcesando] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const guardarNota = useMutation({
    mutationFn: () => {
      if (!idPaciente) throw new Error('Abre el dictado desde un expediente para adjuntar la nota.')
      return api.medico.crearConsulta({
        id_paciente: idPaciente,
        motivo_consulta: 'Nota clínica por dictado móvil',
        observaciones: texto.trim(),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expediente', idPaciente] })
      qc.invalidateQueries({ queryKey: ['paciente', idPaciente] })
      Alert.alert('Nota guardada', 'La transcripción se agregó al expediente clínico.', [{ text: 'OK', onPress: () => nav.goBack() }])
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'No se pudo guardar la nota'),
  })

  useEffect(() => {
    if (grabando) {
      timer.current = setInterval(() => setSegundos((x) => x + 1), 1000)
    } else if (timer.current) {
      clearInterval(timer.current)
    }
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [grabando])

  const fmt = (x: number) => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`

  const iniciar = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync()
      if (!perm.granted) { Alert.alert('Permiso requerido', 'Concede acceso al micrófono para dictar.'); return }
      try { await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }) } catch { /* opcional */ }
      await recorder.prepareToRecordAsync()
      recorder.record()
      setSegundos(0); setTexto(''); setGrabando(true)
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo iniciar la grabación')
    }
  }

  const detener = async () => {
    try {
      await recorder.stop()
      setGrabando(false)
      const uri = recorder.uri
      if (!uri) { Alert.alert('Sin audio', 'No se capturó audio.'); return }
      setProcesando(true)
      const form = new FormData()
      form.append('file', { uri, name: 'dictado.m4a', type: 'audio/m4a' } as any)
      const res = await api.medico.transcribir(form)
      setTexto(res.text + (res.isMock ? '\n\n(Transcripción de demostración — configura OPENAI_API_KEY para transcripción real.)' : ''))
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo transcribir el audio')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <View style={s.root}>
      <ScreenHeader title="Dictado de notas" subtitle={nombre || undefined} onBack={() => nav.goBack()} />
      <Screen scroll padded>
        <View style={s.recWrap}>
          <TouchableOpacity onPress={grabando ? detener : iniciar} style={[s.recCircle, grabando && s.recCircleActive]} disabled={procesando}>
            <Text style={s.recIcon}>{grabando ? '■' : '●'}</Text>
          </TouchableOpacity>
          {grabando && (
            <View style={s.recStatus}>
              <View style={s.redDot} />
              <Text style={s.recStatusText}>Grabando... {fmt(segundos)}</Text>
            </View>
          )}
        </View>

        <Waveform active={grabando} />

        <Text style={s.sectionTitle}>Transcripción</Text>
        <PremiumCard style={s.transcripcionBox}>
          {procesando ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={s.transcripcionText}>
              {texto || (grabando ? 'Escuchando... pulsa ■ para detener y transcribir.' : 'Pulsa ● para comenzar a dictar.')}
            </Text>
          )}
        </PremiumCard>

        <PrimaryButton
          label="Guardar en expediente"
          disabled={!texto || guardarNota.isPending}
          onPress={() => guardarNota.mutate()}
          style={{ marginTop: spacing.lg }}
        />
        {guardarNota.isPending ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} /> : null}
      </Screen>
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  recWrap: { alignItems: 'center', marginBottom: 24, marginTop: 16 },
  recCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.errorBg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.errorBg },
  recCircleActive: { borderColor: colors.error, backgroundColor: colors.errorBg },
  recIcon: { fontSize: 40, color: colors.error },
  recStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  recStatusText: { ...typography.caption, color: colors.error },
  sectionTitle: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: 12, marginTop: 20 },
  transcripcionBox: { minHeight: 150, justifyContent: 'center' },
  transcripcionText: { ...typography.body, color: colors.textSecondary },
})
