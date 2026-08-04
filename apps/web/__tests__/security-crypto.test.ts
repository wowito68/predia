import { randomBytes } from "crypto"
import {
  decryptSensitiveField,
  decryptSensitiveFieldIfNeeded,
  encryptSensitiveField,
  isEncryptedSensitiveField,
} from "@/lib/crypto"
import { hashPassword, verifyPassword } from "@/lib/auth"

describe("Seguridad criptografica", () => {
  it("almacena contrasenas como hash bcrypt y valida credenciales", async () => {
    const hash = await hashPassword("password123")

    expect(hash).not.toBe("password123")
    expect(hash).toMatch(/^\$2[aby]\$/)
    await expect(verifyPassword("password123", hash)).resolves.toBe(true)
    await expect(verifyPassword("incorrecta", hash)).resolves.toBe(false)
  })

  it("cifra y descifra datos sensibles con AES-256-GCM", () => {
    const key = randomBytes(32).toString("base64")
    const encrypted = encryptSensitiveField("CURP-SENSIBLE-TEST", key)

    expect(encrypted).not.toContain("CURP-SENSIBLE-TEST")
    expect(decryptSensitiveField(encrypted, key)).toBe("CURP-SENSIBLE-TEST")
  })

  it("rechaza descifrado con llave incorrecta", () => {
    const key = randomBytes(32).toString("base64")
    const wrongKey = randomBytes(32).toString("base64")
    const encrypted = encryptSensitiveField("dato clinico", key)

    expect(() => decryptSensitiveField(encrypted, wrongKey)).toThrow()
  })

  it("mantiene compatibilidad de lectura y detecta campos cifrados", () => {
    const key = randomBytes(32).toString("base64")
    const encrypted = encryptSensitiveField("nota de automonitoreo", key)

    expect(isEncryptedSensitiveField(encrypted)).toBe(true)
    expect(isEncryptedSensitiveField("nota historica")).toBe(false)
    expect(decryptSensitiveFieldIfNeeded(encrypted, key)).toBe("nota de automonitoreo")
    expect(decryptSensitiveFieldIfNeeded("nota historica", key)).toBe("nota historica")
  })
})
