import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native'
import { useAudioRecorder, RecordingPresets, AudioModule, setAudioModeAsync } from 'expo-audio'
import { useRoute, useNavigation } from '@react-navigation/native'
import { api } from '@/services/api'
import { colors, spacing, radius, fontSize } from '@/theme'

function Waveform({ active }: { active: boolean }) {
  const heights = [20, 35, 28, 45, 18, 40, 32, 48, 25, 38, 30, 50, 22, 42, 35, 28, 45, 18, 40, 32]
  return (
    <View style={wS.root}>
      {heights.map((h, i) => (
        <View key={i} style={[wS.bar, { height: active ? h : h * 0.3, opacity: active ? 1 : 0.4 }]} />
      ))}
    </View>
  )
}
const wS = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 60 },
  bar: { width: 8, backgroundColor: colors.primary, borderRadius: 4 },
})

export function DictadoNotasScreen() {
  const route = useRoute<any>()
  const nav = useNavigation<any>()
  const nombre: string = route.params?.nombre ?? ''
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)

  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [texto, setTexto] = useState('')
  const [procesando, setProcesando] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

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
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => nav.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Dictado de Notas</Text>
          {nombre ? <Text style={s.headerSub}>{nombre}</Text> : null}
        </View>
      </View>
      <ScrollView contentContainerStyle={s.content}>
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
        <View style={s.transcripcionBox}>
          {procesando ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={s.transcripcionText}>
              {texto || (grabando ? 'Escuchando... pulsa ■ para detener y transcribir.' : 'Pulsa ● para comenzar a dictar.')}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[s.adjuntarBtn, !texto && s.btnDisabled]}
          disabled={!texto}
          onPress={() => { Alert.alert('Nota lista', 'Transcripción lista para adjuntar al expediente.'); }}
        >
          <Text style={s.adjuntarText}>Usar transcripción</Text>
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
  content: { padding: spacing.xl, alignItems: 'center', paddingBottom: 32 },
  recWrap: { alignItems: 'center', marginBottom: 24, marginTop: 16 },
  recCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FCA5A5' },
  recCircleActive: { borderColor: colors.error, backgroundColor: '#FECACA' },
  recIcon: { fontSize: 40, color: colors.error },
  recStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  recStatusText: { fontSize: fontSize.sm, color: colors.error, fontWeight: '600' },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 12, marginTop: 20, alignSelf: 'flex-start' },
  transcripcionBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, minHeight: 140, width: '100%', borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  transcripcionText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },
  adjuntarBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 16, alignItems: 'center', marginTop: 24, width: '100%' },
  adjuntarText: { color: '#fff', fontWeight: '700', fontSize: fontSize.md },
  btnDisabled: { opacity: 0.5 },
})
