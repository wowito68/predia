import { ReactNode } from 'react'
import { ViewStyle } from 'react-native'
import { PremiumCard } from './ui'

interface Props {
  children: ReactNode
  style?: ViewStyle
}

export function Card({ children, style }: Props) {
  return <PremiumCard style={style}>{children}</PremiumCard>
}
