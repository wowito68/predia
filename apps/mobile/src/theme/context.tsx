import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useColorScheme, StyleSheet } from 'react-native'
import { lightColors, darkColors, type AppColors } from './index'

export type ColorScheme = 'light' | 'dark'

interface ThemeValue {
  colors: AppColors
  scheme: ColorScheme
  isDark: boolean
}

const ThemeContext = createContext<ThemeValue>({
  colors: lightColors,
  scheme: 'light',
  isDark: false,
})

/**
 * Provee la paleta activa según el esquema del sistema (claro/oscuro).
 * El valor se memoiza por esquema, de modo que `useThemedStyles` solo
 * recalcula sus StyleSheet cuando realmente cambia el tema.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const scheme: ColorScheme = system === 'dark' ? 'dark' : 'light'
  const value = useMemo<ThemeValue>(
    () => ({
      colors: scheme === 'dark' ? darkColors : lightColors,
      scheme,
      isDark: scheme === 'dark',
    }),
    [scheme],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext)
}

export function useColors(): AppColors {
  return useContext(ThemeContext).colors
}

/**
 * Crea (y memoiza) una hoja de estilos dependiente del tema. Cada pantalla
 * define `const makeStyles = (colors: AppColors) => StyleSheet.create({...})`
 * y la consume con `const s = useThemedStyles(makeStyles)`.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: AppColors) => T,
): T {
  const { colors } = useTheme()
  return useMemo(() => factory(colors), [colors, factory])
}
