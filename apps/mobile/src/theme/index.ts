export const colors = {
  primary: '#1565C0',
  primaryDark: '#0D47A1',
  primaryLight: '#1E88E5',
  background: '#F2F5F9',
  surface: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  success: '#15803D',
  successBg: '#DCFCE7',
  successText: '#166534',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  warningText: '#92400E',
  error: '#DC2626',
  errorBg: '#FEE2E2',
  errorText: '#991B1B',
  info: '#1D4ED8',
  infoBg: '#DBEAFE',
  infoText: '#1E40AF',
  criticalBg: '#FEE2E2',
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
} as const

export const riskColor = (level: string) => {
  switch (level?.toUpperCase()) {
    case 'MUY_ALTO':
    case 'MUY ALTO': return { bg: '#FEE2E2', text: '#991B1B', label: 'MUY ALTO' }
    case 'ALTO':     return { bg: '#FEE2E2', text: '#DC2626', label: 'ALTO' }
    case 'MEDIO':
    case 'MODERADO': return { bg: '#FEF3C7', text: '#D97706', label: 'MODERADO' }
    default:         return { bg: '#DCFCE7', text: '#15803D', label: 'BAJO' }
  }
}
