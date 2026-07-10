export const lightColors = {
  primary: '#123F4A',
  primaryDark: '#082B34',
  primaryLight: '#2D6874',
  accent: '#087E8B',
  accentSoft: '#DDF2F2',
  indigo: '#5267C9',
  indigoSoft: '#E9ECFA',
  coral: '#D5635B',
  coralSoft: '#FBE8E5',
  background: '#F3F7F6',
  surface: '#FFFFFF',
  surfaceMuted: '#EAF1F0',
  surfaceSunken: '#DDE8E6',
  elevated: '#FFFFFF',
  textPrimary: '#10272D',
  textSecondary: '#53686D',
  textMuted: '#7E9195',
  border: '#D8E3E1',
  borderStrong: '#B9CBC8',
  success: '#197A68',
  successBg: '#DDF1EA',
  successText: '#145E51',
  warning: '#B66E24',
  warningBg: '#FAECD7',
  warningText: '#824A14',
  error: '#C44E62',
  errorBg: '#F8E2E7',
  errorText: '#8D3042',
  info: '#3E6FA6',
  infoBg: '#E3EDF7',
  infoText: '#31577F',
  criticalBg: '#F8E2E7',
} as const

export const darkColors = {
  primary: '#8BD3D1',
  primaryDark: '#102F36',
  primaryLight: '#B9E7E4',
  accent: '#56C1C7',
  accentSoft: '#163A3E',
  indigo: '#9AA8F1',
  indigoSoft: '#252C4A',
  coral: '#F08A80',
  coralSoft: '#492B2C',
  background: '#0C171B',
  surface: '#132329',
  surfaceMuted: '#1A3036',
  surfaceSunken: '#213A40',
  elevated: '#183038',
  textPrimary: '#F2F8F7',
  textSecondary: '#B5C8C9',
  textMuted: '#81999C',
  border: '#284148',
  borderStrong: '#3A5A61',
  success: '#65C6A8',
  successBg: '#173A32',
  successText: '#A6E3CF',
  warning: '#E6AE69',
  warningBg: '#422F1C',
  warningText: '#F3D2A6',
  error: '#F08A9C',
  errorBg: '#46252F',
  errorText: '#F4B7C2',
  info: '#8AB8E8',
  infoBg: '#1E3348',
  infoText: '#B9D6F3',
  criticalBg: '#46252F',
} as const

export const colors = lightColors

// Ambas paletas comparten exactamente las mismas claves: este tipo describe
// cualquiera de las dos (valores ensanchados a string para que light y dark
// sean intercambiables) y es el contrato de los estilos dependientes del tema.
export type AppColors = { readonly [K in keyof typeof lightColors]: string }

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const

// Escala de radios real y progresiva (xs → 2xl). Antes md/lg/xl/xxl colapsaban
// todos a 8px (escala falsa). md = radio de tarjetas/botones/inputs (estándar
// premium), lg = contenedores grandes, xl/xxl = sheets, modales y heroes.
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
} as const

export const typography = {
  family: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    display: 'Inter_800ExtraBold',
  },
  display: { fontSize: 32, lineHeight: 38, fontFamily: 'Inter_800ExtraBold' },
  headline: { fontSize: 27, lineHeight: 33, fontFamily: 'Inter_700Bold' },
  title: { fontSize: 21, lineHeight: 27, fontFamily: 'Inter_700Bold' },
  body: { fontSize: 16, lineHeight: 23, fontFamily: 'Inter_400Regular' },
  bodyMedium: { fontSize: 16, lineHeight: 23, fontFamily: 'Inter_500Medium' },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium' },
  overline: { fontSize: 11, lineHeight: 14, fontFamily: 'Inter_700Bold' },
} as const

export const fontSize = {
  xs: typography.overline.fontSize,
  sm: typography.caption.fontSize,
  md: typography.body.fontSize,
  lg: 18,
  xl: typography.title.fontSize,
  xxl: typography.headline.fontSize,
  xxxl: typography.display.fontSize,
} as const

// Sombras suaves y escalonadas inspiradas en iOS: color frío (slate 900),
// opacidades bajas y desenfoques amplios para evitar el "drop shadow" pesado.
// `card` y `floating` se conservan como alias por compatibilidad.
export const shadows = {
  none: {},
  xs: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 2,
  },
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.1,
    shadowRadius: 36,
    elevation: 5,
  },
} as const

// Riesgo clínico mapeado a tokens semánticos del tema activo (no a hex fijos),
// para que las píldoras de riesgo respeten claro/oscuro. `c` por defecto es la
// paleta clara para llamadas fuera de contexto de tema.
export function riskColor(level: string | null | undefined, c: AppColors = lightColors) {
  switch (level?.toUpperCase()) {
    case 'MUY_ALTO':
    case 'MUY ALTO':
      return { bg: c.errorBg, text: c.errorText, label: 'MUY ALTO' }
    case 'ALTO':
      return { bg: c.warningBg, text: c.warningText, label: 'ALTO' }
    case 'MEDIO':
    case 'MODERADO':
      return { bg: c.infoBg, text: c.infoText, label: 'MODERADO' }
    default:
      return { bg: c.successBg, text: c.successText, label: 'BAJO' }
  }
}

export const paletteDescription = {
  primary: 'Slate / Indigo',
  secondary: 'Blue Gray',
  success: 'Emerald',
  warning: 'Amber',
  danger: 'Rose',
  lightBackground: 'Gray 50',
  darkBackground: 'Zinc / Slate',
} as const
