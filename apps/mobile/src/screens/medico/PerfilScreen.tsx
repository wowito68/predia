import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { useAuthStore } from '@/store/authStore'
import { Screen, ScreenHeader } from '@/components/Screen'
import { Avatar, Ionicons, type IconName } from '@/components/ui'
import { spacing, radius, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

const ROL_LABEL: Record<string, string> = { MEDICO: 'Médico', ADMIN: 'Administrador', ENFERMERO: 'Enfermero', PACIENTE: 'Paciente' }

export function PerfilScreen() {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const user = useAuthStore((st) => st.user)
  const logout = useAuthStore((st) => st.logout)

  const confirmLogout = () =>
    Alert.alert('Cerrar sesión', '¿Seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => logout() },
    ])

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Perfil" />
      <Screen scroll padded>
        <View style={s.card}>
          <Avatar nombre={user?.nombre?.split(' ')[0]} apellido={user?.nombre?.split(' ')[1]} size={72} />
          <Text style={s.name}>{user?.nombre ?? 'Usuario'}</Text>
          <View style={s.rolePill}><Text style={s.roleText}>{ROL_LABEL[user?.rol ?? ''] ?? user?.rol}</Text></View>
          {user?.email ? <Text style={s.email}>{user.email}</Text> : null}
        </View>

        <View style={s.menu}>
          <Item
            icon="notifications-outline"
            label="Notificaciones"
            sub="Recordatorios clínicos y alertas de riesgo"
            onPress={() => Alert.alert('Notificaciones', 'PREDIA muestra alertas de riesgo alto, citas próximas y estados pendientes desde Inicio y Alertas.')}
          />
          <Item
            icon="shield-checkmark-outline"
            label="Seguridad"
            sub="Biometría y cierre por inactividad"
            onPress={() => Alert.alert('Seguridad', 'La sesión se protege con SecureStore, biometría al reabrir y cierre automático tras 15 minutos de inactividad.')}
          />
          <Item
            icon="information-circle-outline"
            label="Acerca de PREDIA"
            sub="Plataforma clínica · v1.0.0"
            onPress={() => Alert.alert('PREDIA', 'App móvil clínica para seguimiento de pacientes, agenda, signos vitales, recetas y validación de riesgo IA.')}
          />
        </View>

        <TouchableOpacity style={s.logout} onPress={confirmLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={s.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <Text style={s.footer}>PREDIA · Demo académica</Text>
      </Screen>
    </View>
  )
}

function Item({ icon, label, sub, onPress }: { icon: IconName; label: string; sub: string; onPress: () => void }) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  return (
    <TouchableOpacity style={s.item} onPress={onPress} activeOpacity={0.75}>
      <View style={s.itemIcon}><Ionicons name={icon} size={20} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.itemLabel}>{label}</Text>
        <Text style={s.itemSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  )
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  name: { ...typography.title, color: colors.textPrimary, marginTop: spacing.md },
  rolePill: { backgroundColor: colors.infoBg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full, marginTop: spacing.sm },
  roleText: { ...typography.overline, color: colors.infoText },
  email: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  menu: { marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.infoBg, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  itemSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.lg, backgroundColor: colors.errorBg, borderRadius: radius.md, paddingVertical: 14 },
  logoutText: { ...typography.bodyMedium, color: colors.error },
  footer: { ...typography.overline, textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
})
