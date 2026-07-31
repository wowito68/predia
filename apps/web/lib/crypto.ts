import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const KEY_BYTES = 32
const IV_BYTES = 12
const VERSION = "v1"

function decodeKey(value: string): Buffer {
  const trimmed = value.trim()
  const base64 = Buffer.from(trimmed, "base64")
  if (base64.length === KEY_BYTES) return base64

  const hex = Buffer.from(trimmed, "hex")
  if (hex.length === KEY_BYTES) return hex

  throw new Error("PREDIA_ENCRYPTION_KEY debe ser una llave base64 o hex de 32 bytes")
}

export function getEncryptionKey(explicitKey = process.env.PREDIA_ENCRYPTION_KEY): Buffer {
  if (!explicitKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PREDIA_ENCRYPTION_KEY es obligatoria en producción")
    }
    return Buffer.alloc(KEY_BYTES, 7)
  }
  return decodeKey(explicitKey)
}

export function encryptSensitiveField(plainText: string, explicitKey?: string): string {
  const key = getEncryptionKey(explicitKey)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":")
}

export function decryptSensitiveField(payload: string, explicitKey?: string): string {
  const [version, iv64, tag64, data64] = payload.split(":")
  if (version !== VERSION || !iv64 || !tag64 || !data64) {
    throw new Error("Formato de cifrado inválido")
  }

  const key = getEncryptionKey(explicitKey)
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv64, "base64"))
  decipher.setAuthTag(Buffer.from(tag64, "base64"))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data64, "base64")),
    decipher.final(),
  ])
  return decrypted.toString("utf8")
}

