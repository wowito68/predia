import { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import * as LocalAuthentication from 'expo-local-authentication'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import { colors, spacing, radius, fontSize } from '@/theme'

type Role = 'PACIENTE' | 'MEDICO'

export function LoginScreen() {
  const login = useAuthStore((s) => s.login)
  const unlockWithStored = useAuthStore((s) => s.unlockWithStored)
  const logout = useAuthStore((s) => s.logout)
  const hasStoredSession = useAuthStore((s) => s.hasStoredSession)
  const pendingUser = useAuthStore((s) => s.pendingUser)

  const [role, setRole] = useState<Role>('PACIENTE')
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
      const { user, token } =
        role === 'PACIENTE'
          ? await api.auth.loginPaciente(curp.trim().toUpperCase(), pin.trim())
          : await api.auth.loginMedico(username.trim(), password)
      await login(user, token)
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

  // Al montar con sesión guardada, ofrecer biometría automáticamente.
  useEffect(() => {
    if (hasStoredSession) handleBiometric()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStoredSession])

  // ---- Vista BLOQUEADA: sesión persistida, requiere biometría ----
  if (hasStoredSession && pendingUser) {
    const firstName = pendingUser.nombre?.split(' ')[0] ?? ''
    return (
      <View style={s.lockedRoot}>
        <View style={s.logoCircle}><Text style={s.logoLetter}>P</Text></View>
        <Text style={s.lockedHi}>Hola, {firstName}</Text>
        <Text style={s.lockedSub}>Desbloquea tu sesión para continuar</Text>
        <TouchableOpacity style={s.bioBtn} onPress={handleBiometric}>
          <Text style={s.bioBtnText}>🔓  Desbloquear con biometría</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => logout()}>
          <Text style={s.lockedOther}>Usar otra cuenta</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ---- Vista de LOGIN ----
  const isPaciente = role === 'PACIENTE'
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.hero}>
          <View style={s.logoCircle}><Text style={s.logoLetter}>P</Text></View>
          <Text style={s.appName}>PREDIA</Text>
          <Text style={s.appSub}>Plataforma de Gestión de Historiales Médicos</Text>
        </View>

        <View style={s.roleRow}>
          {(['PACIENTE', 'MEDICO'] as Role[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[s.roleBtn, role === r && s.roleBtnActive]}
              onPress={() => setRole(r)}
            >
              <Text style={[s.roleTxt, role === r && s.roleTxtActive]}>
                {r === 'PACIENTE' ? '👤 Paciente' : '🩺 Médico'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.title}>Iniciar Sesión</Text>
          <Text style={s.hint}>
            {isPaciente ? 'Ingresa con tu CURP y PIN' : 'Ingresa con tu usuario y contraseña'}
          </Text>

          {isPaciente ? (
            <>
              <View style={s.field}>
                <Text style={s.label}>CURP</Text>
                <TextInput
                  style={s.input}
                  value={curp}
                  onChangeText={setCurp}
                  placeholder="ROGJ850515HMCRRN08"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
              <View style={s.field}>
                <Text style={s.label}>PIN</Text>
                <TextInput
                  style={s.input}
                  value={pin}
                  onChangeText={setPin}
                  placeholder="••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={12}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>
            </>
          ) : (
            <>
              <View style={s.field}>
                <Text style={s.label}>Usuario</Text>
                <TextInput
                  style={s.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="dr_juan"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
              <View style={s.field}>
                <Text style={s.label}>Contraseña</Text>
                <TextInput
                  style={s.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>
            </>
          )}

          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Ingresar</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleBiometric} style={s.biometricRow}>
            <Text style={s.biometricText}>— o usa biometría —</Text>
          </TouchableOpacity>

          <Text style={s.help}>¿Problemas de acceso? Contacta a tu médico</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1 },
  hero: { alignItems: 'center', paddingTop: 64, paddingBottom: 24 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoLetter: { color: '#fff', fontSize: 32, fontWeight: '700' },
  appName: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: 2 },
  appSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 40 },
  roleRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 16 },
  roleBtn: {
    paddingHorizontal: 28, paddingVertical: 10, borderRadius: radius.sm,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
  },
  roleBtnActive: { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: '#fff' },
  roleTxt: { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.sm, fontWeight: '600' },
  roleTxtActive: { color: '#fff' },
  card: { backgroundColor: colors.surface, marginHorizontal: 16, borderRadius: radius.xl, padding: 24, paddingBottom: 28 },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  hint: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 20 },
  field: { marginBottom: 12 },
  label: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 4, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    padding: 14, fontSize: fontSize.md, color: colors.textPrimary, backgroundColor: '#FAFAFA',
  },
  btn: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
  biometricRow: { alignItems: 'center', marginVertical: 14 },
  biometricText: { color: colors.textMuted, fontSize: fontSize.sm },
  help: { textAlign: 'center', color: colors.textMuted, fontSize: fontSize.xs, marginTop: 6 },
  // Vista bloqueada
  lockedRoot: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', padding: 32 },
  lockedHi: { color: '#fff', fontSize: fontSize.xxl, fontWeight: '700', marginTop: 16 },
  lockedSub: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm, marginTop: 6, marginBottom: 32 },
  bioBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: '#fff', borderWidth: 1.5, borderRadius: radius.sm, paddingVertical: 16, paddingHorizontal: 28 },
  bioBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
  lockedOther: { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.sm, marginTop: 24, textDecorationLine: 'underline' },
})
