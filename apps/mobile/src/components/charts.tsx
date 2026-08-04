import { memo, useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import { typography, type AppColors } from '@/theme'
import { useTheme, useThemedStyles } from '@/theme/context'

const VIEW_WIDTH = 320

function pointsFor(values: number[], width: number, height: number, inset = 8) {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 1)
  const usableWidth = width - inset * 2
  const usableHeight = height - inset * 2

  return values.map((value, index) => ({
    x: inset + (values.length === 1 ? usableWidth / 2 : (index / (values.length - 1)) * usableWidth),
    y: inset + usableHeight - ((value - min) / range) * usableHeight,
  }))
}

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index]
    const controlX = (previous.x + point.x) / 2
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`
  }, `M ${points[0].x} ${points[0].y}`)
}

export const Sparkline = memo(function Sparkline({
  data,
  color,
  height = 62,
}: {
  data: number[]
  color?: string
  height?: number
}) {
  const { colors } = useTheme()
  const stroke = color ?? colors.accent
  const points = useMemo(() => pointsFor(data, VIEW_WIDTH, height, 6), [data, height])
  const path = useMemo(() => smoothPath(points), [points])
  const area = points.length > 1
    ? `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
    : ''

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${VIEW_WIDTH} ${height}`} accessibilityLabel="Tendencia de datos">
      <Line x1="0" y1={height - 1} x2={VIEW_WIDTH} y2={height - 1} stroke={colors.border} strokeWidth="1" />
      {area ? <Path d={area} fill={stroke} opacity={0.1} /> : null}
      {path ? <Path d={path} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {points.length ? (
        <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4.5" fill={colors.surface} stroke={stroke} strokeWidth="3" />
      ) : null}
    </Svg>
  )
})

export function RiskRing({
  value,
  label = 'riesgo',
  size = 108,
  color,
}: {
  value: number
  label?: string
  size?: number
  color?: string
}) {
  const { colors } = useTheme()
  const s = useThemedStyles(makeStyles)
  const normalized = Math.max(0, Math.min(100, value))
  const stroke = color ?? (normalized >= 75 ? colors.error : normalized >= 50 ? colors.warning : colors.success)
  const strokeWidth = 9
  const radius = size / 2 - strokeWidth
  const circumference = Math.PI * 2 * radius

  return (
    <View style={[s.ringWrap, { width: size, height: size }]} accessibilityLabel={`${Math.round(normalized)} por ciento de ${label}`}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.surfaceSunken} strokeWidth={strokeWidth} />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - normalized / 100)}
          />
        </G>
      </Svg>
      <View style={s.ringCenter}>
        <Text style={s.ringValue}>{Math.round(normalized)}%</Text>
        <Text style={s.ringLabel}>{label}</Text>
      </View>
    </View>
  )
}

export type TrendPoint = {
  value: number
  secondary?: number | null
  label?: string
}

export const TrendChart = memo(function TrendChart({
  data,
  color,
  secondaryColor,
  reference,
  height = 178,
}: {
  data: TrendPoint[]
  color?: string
  secondaryColor?: string
  reference?: number
  height?: number
}) {
  const { colors } = useTheme()
  const primaryStroke = color ?? colors.accent
  const secondStroke = secondaryColor ?? colors.indigo
  const plotTop = 12
  const plotBottom = height - 30
  const plotHeight = plotBottom - plotTop
  const values = data.flatMap((item) => [item.value, item.secondary].filter((value): value is number => typeof value === 'number'))
  const domain = reference == null ? values : [...values, reference]
  const min = domain.length ? Math.min(...domain) : 0
  const max = domain.length ? Math.max(...domain) : 1
  const padding = Math.max((max - min) * 0.18, 1)
  const low = Math.max(0, min - padding)
  const high = max + padding
  const scaleY = (value: number) => plotTop + plotHeight - ((value - low) / Math.max(high - low, 1)) * plotHeight
  const scaleX = (index: number) => 12 + (data.length <= 1 ? (VIEW_WIDTH - 24) / 2 : (index / (data.length - 1)) * (VIEW_WIDTH - 24))
  const primary = data.map((item, index) => ({ x: scaleX(index), y: scaleY(item.value) }))
  const secondary = data
    .map((item, index) => item.secondary == null ? null : ({ x: scaleX(index), y: scaleY(item.secondary) }))
    .filter((item): item is { x: number; y: number } => item != null)
  const primaryPath = smoothPath(primary)
  const secondaryPath = smoothPath(secondary)

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${VIEW_WIDTH} ${height}`} accessibilityLabel="Grafica de tendencia clinica">
      {[0, 1, 2].map((index) => {
        const y = plotTop + (plotHeight / 2) * index
        return <Line key={index} x1="8" y1={y} x2={VIEW_WIDTH - 8} y2={y} stroke={colors.border} strokeWidth="1" strokeDasharray="3 6" />
      })}
      {reference != null ? (
        <>
          <Line x1="8" y1={scaleY(reference)} x2={VIEW_WIDTH - 8} y2={scaleY(reference)} stroke={colors.warning} strokeWidth="1.5" strokeDasharray="5 5" />
          <Rect x={VIEW_WIDTH - 54} y={scaleY(reference) - 9} width="45" height="18" rx="4" fill={colors.warningBg} />
          <SvgText x={VIEW_WIDTH - 31.5} y={scaleY(reference) + 4} textAnchor="middle" fontSize="9" fontFamily="Inter_600SemiBold" fill={colors.warningText}>meta</SvgText>
        </>
      ) : null}
      {primaryPath ? <Path d={primaryPath} fill="none" stroke={primaryStroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {secondaryPath ? <Path d={secondaryPath} fill="none" stroke={secondStroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {primary.map((point, index) => (
        <Circle key={index} cx={point.x} cy={point.y} r={index === primary.length - 1 ? 4 : 2.5} fill={colors.surface} stroke={primaryStroke} strokeWidth="2" />
      ))}
      {data.map((item, index) => item.label && (index === 0 || index === data.length - 1 || index === Math.floor((data.length - 1) / 2)) ? (
        <SvgText key={`label-${index}`} x={scaleX(index)} y={height - 7} textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'} fontSize="9" fontFamily="Inter_500Medium" fill={colors.textMuted}>{item.label}</SvgText>
      ) : null)}
    </Svg>
  )
})

const makeStyles = (colors: AppColors) => StyleSheet.create({
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringValue: { ...typography.title, color: colors.textPrimary },
  ringLabel: { ...typography.overline, color: colors.textMuted, textTransform: 'uppercase', marginTop: -2 },
})
