import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import * as LocalAuthentication from 'expo-local-authentication'
import { Ionicons } from '@/components/icons'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

type Role = 'PACIENTE' | 'MEDICO'

export function LoginScreen() {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const login = useAuthStore((st) => st.login)
  const unlockWithStored = useAuthStore((st) => st.unlockWithStored)
  const logout = useAuthStore((st) => st.logout)
  const hasStoredSession = useAuthStore((st) => st.hasStoredSession)
  const pendingUser = useAuthStore((st) => st.pendingUser)

  const [role, setRole] = useState<Role>('MEDICO')
  const [curp, setCurp] = useState('')
  const [pin, setPin] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (role === 'PACIENTE' ? (!curp.trim() || !pin.trim()) : (!username.trim() || !password.trim())) {
      Alert.alert('Campos requeridos', role === 'PACIENTE' ? 'Ingresa tu CURP y PIN.' : 'Ingresa usuario y contraseña.')
      return
    }
    setLoading(true)
    try {
      const { user, token, refreshToken } =
        role === 'PACIENTE'
          ? await api.auth.loginPaciente(curp.trim().toUpperCase(), pin.trim())
          : await api.auth.loginMedico(username.trim(), password)
      await login(user, token, refreshToken)
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleBiometric = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    const enrolled = await LocalAuthentication.isEnrolledAsync()
    if (!hasHardware || !enrolled) {
      Alert.alert('No disponible', 'Tu dispositivo no tiene biometría configurada.')
      return
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquea PREDIA',
      fallbackLabel: 'Usar credenciales',
    })
    if (result.success) {
      const ok = await unlockWithStored()
      if (!ok) Alert.alert('Sesión no encontrada', 'Inicia sesión con tus credenciales.')
    }
  }

  useEffect(() => {
    if (hasStoredSession) handleBiometric()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStoredSession])

  if (hasStoredSession && pendingUser) {
    const firstName = pendingUser.nombre?.split(' ')[0] ?? ''
    return (
      <View style={s.lockedRoot}>
        <BrandMark large />
        <Text style={s.lockedHi}>Hola, {firstName}</Text>
        <Text style={s.lockedSub}>Desbloquea tu sesion para continuar</Text>
        <Pressable style={({ pressed }) => [s.primaryBtn, pressed && s.pressed]} onPress={handleBiometric}>
          <Ionicons name="finger-print" size={18} color={colors.surface} />
          <Text style={s.primaryText}>Desbloquear con biometria</Text>
        </Pressable>
        <Pressable onPress={() => logout()} hitSlop={12}>
          <Text style={s.linkText}>Usar otra cuenta</Text>
        </Pressable>
      </View>
    )
  }

  const isPaciente = role === 'PACIENTE'
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.brandRow}>
            <BrandMark />
            <View>
              <Text style={s.appName}>PREDIA</Text>
              <Text style={s.appTag}>Health intelligence</Text>
            </View>
          </View>
          <Text style={s.heroTitle}>Tu clínica, clara y conectada.</Text>
          <Text style={s.heroCopy}>Expedientes, alertas y seguimiento en un solo espacio seguro.</Text>
        </View>

        <View style={s.panel}>
          <View style={s.roleRow}>
            {(['PACIENTE', 'MEDICO'] as Role[]).map((item) => {
              const active = role === item
              return (
                <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={item} style={[s.roleBtn, active && s.roleBtnActive]} onPress={() => setRole(item)}>
                  <Ionicons name={item === 'PACIENTE' ? 'person-outline' : 'medkit-outline'} size={16} color={active ? colors.textPrimary : colors.textSecondary} />
                  <Text style={[s.roleTxt, active && s.roleTxtActive]}>{item === 'PACIENTE' ? 'Paciente' : 'Personal clínico'}</Text>
                </Pressable>
              )
            })}
          </View>

          <Text style={s.title}>Iniciar sesion</Text>
          <Text style={s.hint}>{isPaciente ? 'Usa tu CURP y PIN de paciente.' : 'Acceso para medicos y enfermeria.'}</Text>

          {isPaciente ? (
            <>
              <Field label="CURP" value={curp} onChangeText={setCurp} placeholder="ROGJ850515HMCRRN08" autoCapitalize="characters" />
              <Field label="PIN" value={pin} onChangeText={setPin} placeholder="••••••" secureTextEntry keyboardType="numeric" maxLength={12} onSubmitEditing={handleLogin} />
            </>
          ) : (
            <>
              <Field
                label="Usuario"
                value={username}
                onChangeText={setUsername}
                placeholder="dr_juan"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                textContentType="username"
                autoComplete="username"
              />
              <Field
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                textContentType="password"
                autoComplete="current-password"
                onSubmitEditing={handleLogin}
              />
            </>
          )}

          <Pressable accessibilityRole="button" style={({ pressed }) => [s.primaryBtn, (pressed || loading) && s.pressed]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={s.primaryText}>Ingresar</Text>}
          </Pressable>

          <Pressable accessibilityRole="button" accessibilityLabel="Usar biometría" onPress={handleBiometric} style={s.biometricRow}>
            <Ionicons name="finger-print" size={16} color={colors.textMuted} />
            <Text style={s.biometricText}>Usar biometria</Text>
          </Pressable>

          <Text style={s.help}>Soporte de acceso disponible con tu equipo clinico.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function BrandMark({ large = false }: { large?: boolean }) {
  const s = useThemedStyles(makeStyles)
  return (
    <View style={[s.brandMark, large && s.brandMarkLarge]}>
      <Text style={[s.brandLetter, large && s.brandLetterLarge]}>P</Text>
      <View style={s.brandAccent} />
    </View>
  )
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const { label, style, ...rest } = props
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        {...rest}
        placeholderTextColor={colors.textMuted}
        style={[s.input, style]}
        autoCorrect={false}
        returnKeyType={rest.onSubmitEditing ? 'done' : 'next'}
      />
    </View>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.md, justifyContent: 'center' },
  hero: { paddingTop: spacing.xl, paddingBottom: spacing.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  brandMark: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  brandMarkLarge: { width: 76, height: 76 },
  brandLetter: { fontFamily: typography.family.bold, fontSize: 25, color: '#F5FAF9' },
  brandLetterLarge: { fontSize: 38 },
  brandAccent: { position: 'absolute', left: 0, bottom: 0, width: '100%', height: 4, backgroundColor: colors.coral },
  appName: { ...typography.title, color: colors.textPrimary },
  appTag: { ...typography.caption, color: colors.textMuted, marginTop: -1 },
  heroTitle: { ...typography.display, color: colors.textPrimary, maxWidth: 340 },
  heroCopy: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, maxWidth: 330 },
  panel: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: spacing.md },
  roleRow: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, padding: 4, marginBottom: spacing.lg },
  roleBtn: { flex: 1, minHeight: 44, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  roleBtnActive: { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  roleTxt: { ...typography.caption, color: colors.textSecondary },
  roleTxtActive: { color: colors.textPrimary },
  title: { ...typography.title, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: 3, marginBottom: spacing.md },
  field: { marginBottom: spacing.sm },
  label: { ...typography.overline, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 6 },
  input: {
    ...typography.body,
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  primaryBtn: { minHeight: 50, backgroundColor: colors.primary, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: spacing.xs },
  primaryText: { ...typography.bodyMedium, color: colors.surface },
  pressed: { opacity: 0.76 },
  biometricRow: { minHeight: 44, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: spacing.sm, paddingHorizontal: spacing.sm },
  biometricText: { ...typography.caption, color: colors.textMuted },
  help: { ...typography.overline, color: colors.textMuted, textAlign: 'center' },
  lockedRoot: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  lockedHi: { ...typography.headline, color: colors.textPrimary, marginTop: spacing.lg },
  lockedSub: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl, textAlign: 'center' },
  linkText: { ...typography.caption, color: colors.primary, marginTop: spacing.lg },
})
