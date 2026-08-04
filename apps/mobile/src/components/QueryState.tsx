import { ReactNode } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { EmptyState } from './ui'
import { spacing, typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

interface Props {
  isLoading: boolean
  isError: boolean
  error?: unknown
  isEmpty?: boolean
  emptyText?: string
  onRetry?: () => void
  children: ReactNode
}

export function QueryState({ isLoading, isError, error, isEmpty, emptyText, onRetry, children }: Props) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={s.loading}>Cargando informacion clinica</Text>
      </View>
    )
  }
  if (isError) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="No se pudo cargar"
        subtitle={(error as Error)?.message ?? 'Intenta nuevamente en unos segundos.'}
        actionLabel={onRetry ? 'Reintentar' : undefined}
        onAction={onRetry}
      />
    )
  }
  if (isEmpty) {
    return <EmptyState title={emptyText ?? 'Sin datos disponibles'} subtitle="Cuando haya informacion nueva aparecera aqui." />
  }
  return <>{children}</>
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, minHeight: 220 },
  loading: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
})
