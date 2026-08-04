import { Alert, Platform } from 'react-native'

type AlertButton = {
  text?: string
  style?: 'default' | 'cancel' | 'destructive'
  onPress?: () => void
}

let installed = false

export function installWebAlertSupport() {
  if (installed || Platform.OS !== 'web' || typeof window === 'undefined') return
  installed = true

  ;(Alert as any).alert = (
    title?: string,
    message?: string,
    buttons?: AlertButton[],
  ) => {
    const copy = [title, message].filter(Boolean).join('\n\n')
    const actions = buttons ?? []

    if (actions.length <= 1) {
      window.alert(copy)
      actions[0]?.onPress?.()
      return
    }

    const cancel = actions.find((button) => button.style === 'cancel')
    const confirm = [...actions].reverse().find((button) => button.style !== 'cancel')
    const prompt = confirm?.text ? `${copy}\n\nContinuar con “${confirm.text}”.` : copy
    if (window.confirm(prompt)) confirm?.onPress?.()
    else cancel?.onPress?.()
  }
}
