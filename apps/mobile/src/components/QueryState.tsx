import { ReactNode } from 'react'
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, fontSize, spacing, radius } from '@/theme'

interface Props {
  isLoading: boolean
  isError: boolean
  error?: unknown
  isEmpty?: boolean
  emptyText?: string
  onRetry?: () => void
  children: ReactNode
}

/** Envoltura estándar de estados de carga/error/vacío para pantallas con datos. */
export function QueryState({ isLoading, isError, error, isEmpty, emptyText, onRetry, children }: Props) {
  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }
  if (isError) {
    return (
      <View style={s.center}>
        <Text style={s.errIcon}>⚠️</Text>
        <Text style={s.errText}>{(error as Error)?.message ?? 'Ocurrió un error'}</Text>
        {onRetry && (
          <TouchableOpacity style={s.retry} onPress={onRetry}>
            <Text style={s.retryText}>Reintentar</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }
  if (isEmpty) {
    return (
      <View style={s.center}>
        <Text style={s.emptyText}>{emptyText ?? 'Sin datos disponibles'}</Text>
      </View>
    )
  }
  return <>{children}</>
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, minHeight: 200 },
  errIcon: { fontSize: 28, marginBottom: 8 },
  errText: { color: colors.errorText, fontSize: fontSize.sm, textAlign: 'center', marginBottom: 12 },
  retry: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center' },
})
