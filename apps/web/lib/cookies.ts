import { stringifySetCookie, type SerializeOptions } from "cookie"

export function serialize(name: string, value: string, options: SerializeOptions = {}) {
  return stringifySetCookie({ name, value, ...options })
}
