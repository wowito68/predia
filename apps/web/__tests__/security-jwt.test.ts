import jwt from "jsonwebtoken"

const payload = {
  tipo: "staff" as const,
  id_usuario: 1,
  username: "dr_juan",
  rol: "Médico",
}

describe("JWT", () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.JWT_SECRET = "test_secret_32_bytes_minimum_value"
    process.env.JWT_EXPIRES_IN = "15m"
    process.env.JWT_ISSUER = "predia-api-test"
    process.env.JWT_AUDIENCE = "predia-test"
  })

  it("valida un token firmado por PREDIA", async () => {
    const { generateToken, verifyToken } = await import("@/lib/auth")
    const token = generateToken(payload)
    const decoded = verifyToken(token)

    expect(decoded?.id_usuario).toBe(1)
    expect(decoded?.username).toBe("dr_juan")
    expect(decoded).not.toHaveProperty("email")
    expect(decoded).not.toHaveProperty("nombre_completo")
  })

  it("rechaza un token manipulado", async () => {
    const { generateToken, verifyToken } = await import("@/lib/auth")
    const token = generateToken(payload)
    const manipulated = `${token.slice(0, -3)}abc`

    expect(verifyToken(manipulated)).toBeNull()
  })

  it("rechaza un token expirado", async () => {
    process.env.JWT_EXPIRES_IN = "1ms"
    const { generateToken, verifyToken } = await import("@/lib/auth")
    const token = generateToken(payload)
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(verifyToken(token)).toBeNull()
  })

  it("rechaza algoritmos JWT distintos de HS256", async () => {
    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      algorithm: "HS384",
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      expiresIn: "15m",
    })
    const { verifyToken } = await import("@/lib/auth")

    expect(verifyToken(token)).toBeNull()
  })
})
