import { Feather } from '@expo/vector-icons'
import type { TextStyle } from 'react-native'

type FeatherName = keyof typeof Feather.glyphMap
export type IconName = string

const map: Record<string, FeatherName> = {
  'add-circle-outline': 'plus-circle',
  'alert-circle': 'alert-circle',
  'alert-circle-outline': 'alert-circle',
  'analytics-outline': 'bar-chart-2',
  'barbell-outline': 'activity',
  'body-outline': 'user',
  calendar: 'calendar',
  'calendar-clear-outline': 'calendar',
  'calendar-outline': 'calendar',
  call: 'phone',
  'checkmark-circle-outline': 'check-circle',
  'chevron-back': 'chevron-left',
  'chevron-forward': 'chevron-right',
  'close-circle': 'x-circle',
  'cloud-offline-outline': 'cloud-off',
  'document-text': 'file-text',
  'document-text-outline': 'file-text',
  'file-tray-outline': 'archive',
  'finger-print': 'shield',
  fitness: 'activity',
  'folder-open-outline': 'folder',
  'heart-outline': 'heart',
  'information-circle-outline': 'info',
  'list-outline': 'list',
  'log-out-outline': 'log-out',
  'logo-whatsapp': 'message-circle',
  'medical-outline': 'clipboard',
  mic: 'mic',
  notifications: 'bell',
  'notifications-outline': 'bell',
  person: 'user',
  'person-outline': 'user',
  medkit: 'briefcase',
  'medkit-outline': 'briefcase',
  pulse: 'activity',
  remove: 'minus',
  search: 'search',
  'search-outline': 'search',
  'shield-checkmark-outline': 'shield',
  'shield-outline': 'shield',
  'stats-chart': 'bar-chart-2',
  'stats-chart-outline': 'bar-chart-2',
  time: 'clock',
  'time-outline': 'clock',
  'trending-down': 'trending-down',
  'trending-up': 'trending-up',
  warning: 'alert-triangle',
  'warning-outline': 'alert-triangle',
  'water-outline': 'droplet',
  water: 'droplet',
  home: 'home',
  'home-outline': 'home',
  people: 'users',
  'people-outline': 'users',
  ellipse: 'circle',
  'ellipse-outline': 'circle',
  heart: 'heart',
}

interface IconProps {
  name: IconName
  size?: number
  color?: string
  style?: TextStyle
}

export function Icon({ name, size = 20, color = '#334155', style }: IconProps) {
  return <Feather name={map[name] ?? (name as FeatherName) ?? 'circle'} size={size} color={color} style={style} />
}

export const Ionicons = Icon
