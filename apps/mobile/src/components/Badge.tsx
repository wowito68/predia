import { ViewStyle } from 'react-native'
import { StatusBadge } from './ui'

type Variant = 'success' | 'warning' | 'error' | 'info' | 'default'

interface Props {
  label: string
  variant?: Variant
  style?: ViewStyle
}

const tone: Record<Variant, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'info',
  default: 'neutral',
}

export function Badge({ label, variant = 'default', style }: Props) {
  return <StatusBadge label={label} tone={tone[variant]} style={style} />
}
