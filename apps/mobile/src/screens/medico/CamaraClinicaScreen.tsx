import { useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Header } from '@/components/Header'
import { spacing, radius, fontSize, type AppColors } from '@/theme'
import { useThemedStyles } from '@/theme/context'

export function CamaraClinicaScreen() {
  const route = useRoute<any>()
  const nav = useNavigation<any>()
  const qc = useQueryClient()
  const idPaciente: number | undefined = route.params?.idPaciente
  const nombre: string = route.params?.nombre ?? ''
  const cameraRef = useRef<CameraView>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const s = useThemedStyles(makeStyles)

  const mut = useMutation({
    mutationFn: (uri: string) => {
      const form = new FormData()
      form.append('id_paciente', String(idPaciente))
      form.append('tipo_imagen', 'Foto clínica')
      form.append('region_anatomica', 'General')
      // En React Native el archivo se adjunta como { uri, name, type }
      form.append('archivo', { uri, name: `clinica_${Date.now()}.jpg`, type: 'image/jpeg' } as any)
      return api.medico.subirImagen(form)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imagenes', idPaciente] }),
  })

  const tomar = async () => {
    if (!idPaciente) { Alert.alert('Sin paciente', 'Abre esta pantalla desde un expediente.'); return }
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6 })
      if (!photo?.uri) return
      mut.mutate(photo.uri, {
        onSuccess: () => Alert.alert('Foto adjuntada', `La imagen se guardó en el expediente de ${nombre}.`, [{ text: 'OK', onPress: () => nav.goBack() }]),
        onError: (e: any) => Alert.alert('Error', e?.message ?? 'No se pudo subir la imagen'),
      })
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo capturar la foto')
    }
  }

  if (!permission) return <View style={s.root}><Header title="Cámara Clínica" /></View>

  if (!permission.granted) {
    return (
      <View style={s.root}>
        <Header title="Cámara Clínica" />
        <View style={s.center}>
          <Text style={s.permText}>Se necesita acceso a la cámara para fotos clínicas.</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
            <Text style={s.permBtnText}>Otorgar permiso</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={s.cameraRoot}>
      <CameraView ref={cameraRef} style={s.camera} facing="back">
        <View style={s.overlay}>
          <View style={s.frame} />
          <Text style={s.frameHint}>{nombre ? `Paciente: ${nombre}` : 'Centra la imagen clínica'}</Text>
          <TouchableOpacity style={s.captureBtn} onPress={tomar} disabled={mut.isPending}>
            {mut.isPending ? <ActivityIndicator color="#fff" /> : <View style={s.captureInner} />}
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  cameraRoot: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'space-around', paddingVertical: 60 },
  frame: { width: 240, height: 240, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', borderRadius: radius.md, borderStyle: 'dashed' },
  frameHint: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.sm },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  permText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  permBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 24, paddingVertical: 12 },
  permBtnText: { color: colors.surface, fontWeight: '700', fontSize: fontSize.md },
})
