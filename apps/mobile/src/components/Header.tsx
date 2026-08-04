import { useNavigation } from '@react-navigation/native'
import { ScreenHeader } from './Screen'

interface Props {
  title: string
  subtitle?: string
  showBack?: boolean
}

export function Header({ title, subtitle, showBack = false }: Props) {
  const nav = useNavigation<any>()
  return <ScreenHeader title={title} subtitle={subtitle} onBack={showBack ? () => nav.goBack() : undefined} />
}
