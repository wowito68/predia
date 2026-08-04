import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Header } from '@/components/Header'
import { EmptyState, FeedbackBanner, Ionicons } from '@/components/ui'
import { radius, spacing, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

export function CamaraClinicaScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<any>()
  const queryClient = useQueryClient()
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const idPaciente: number | undefined = route.params?.idPaciente
  const nombre: string = route.params?.nombre ?? ''
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  const upload = useMutation({
    mutationFn: async () => {
      if (!idPaciente || !file) throw new Error('Selecciona una imagen clínica.')
      const form = new FormData()
      form.append('id_paciente', String(idPaciente))
      form.append('tipo_imagen', 'Foto clínica')
      form.append('region_anatomica', 'General')
      form.append('archivo', file, file.name || `clinica_${Date.now()}.jpg`)
      return api.medico.subirImagen(form)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['imagenes', idPaciente] })
      setSaved(true)
    },
  })

  const selectPhoto = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp'
    input.setAttribute('capture', 'environment')
    input.onchange = () => {
      const selected = input.files?.[0]
      if (!selected) return
      setSaved(false)
      setFile(selected)
    }
    input.click()
  }

  if (!idPaciente) {
    return (
      <View style={s.root}>
        <Header title="Foto clínica" showBack />
        <EmptyState
          icon="camera-outline"
          title="Selecciona un paciente"
          subtitle="Abre la cámara desde el expediente clínico correspondiente."
          actionLabel="Volver"
          onAction={() => navigation.goBack()}
        />
      </View>
    )
  }

  return (
    <View style={s.root}>
      <Header title="Foto clínica" subtitle={nombre || undefined} showBack />
      <View style={s.content}>
        {saved ? (
          <FeedbackBanner
            title="Imagen adjuntada"
            subtitle="La fotografía ya forma parte del expediente clínico."
            tone="success"
          />
        ) : null}

        <View style={s.preview}>
          {preview ? (
            <Image source={{ uri: preview }} style={s.image} resizeMode="cover" accessibilityLabel="Vista previa de foto clínica" />
          ) : (
            <View style={s.placeholder}>
              <View style={s.cameraIcon}>
                <Ionicons name="camera" size={28} color={colors.primary} />
              </View>
              <Text style={s.placeholderTitle}>Captura clínica</Text>
              <Text style={s.placeholderText}>Usa la cámara del dispositivo o selecciona una imagen existente.</Text>
            </View>
          )}
        </View>

        {upload.isError ? (
          <FeedbackBanner
            title="No se pudo adjuntar"
            subtitle={upload.error instanceof Error ? upload.error.message : 'Intenta nuevamente.'}
            tone="danger"
          />
        ) : null}

        <View style={s.actions}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [s.secondaryButton, pressed && s.pressed]}
            onPress={selectPhoto}
            disabled={upload.isPending}
          >
            <Ionicons name="camera-outline" size={19} color={colors.textPrimary} />
            <Text style={s.secondaryText}>{file ? 'Cambiar foto' : 'Tomar o elegir foto'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [s.primaryButton, (!file || upload.isPending || saved) && s.disabled, pressed && s.pressed]}
            onPress={() => upload.mutate()}
            disabled={!file || upload.isPending || saved}
          >
            {upload.isPending ? <ActivityIndicator size="small" color={colors.surface} /> : <Ionicons name="cloud-upload-outline" size={19} color={colors.surface} />}
            <Text style={s.primaryText}>{upload.isPending ? 'Guardando…' : saved ? 'Foto guardada' : 'Adjuntar al expediente'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.md, gap: spacing.md },
  preview: { flex: 1, minHeight: 260, maxHeight: 520, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  cameraIcon: { width: 58, height: 58, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.infoBg, marginBottom: spacing.md },
  placeholderTitle: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  placeholderText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, maxWidth: 300 },
  actions: { gap: spacing.sm },
  primaryButton: { minHeight: 50, borderRadius: radius.md, backgroundColor: colors.primary, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm },
  primaryText: { ...typography.bodyMedium, color: colors.surface },
  secondaryButton: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm },
  secondaryText: { ...typography.bodyMedium, color: colors.textPrimary },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.82 },
})
