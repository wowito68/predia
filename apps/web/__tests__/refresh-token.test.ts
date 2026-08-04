import { createHash } from "crypto"

const mockQuery = jest.fn()
const mockQueryOne = jest.fn()
const mockTransaction = jest.fn()

jest.mock("@/lib/db", () => ({
  query: mockQuery,
  queryOne: mockQueryOne,
  transaction: mockTransaction,
}))

describe("rotación y revocación de refresh tokens", () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters"
    process.env.JWT_EXPIRES_IN = "15m"
    process.env.JWT_REFRESH_EXPIRES_IN = "7d"
    process.env.JWT_ISSUER = "predia-api-test"
    process.env.JWT_AUDIENCE = "predia-test"
  })

  it("rota una sola vez y no devuelve el refresh token anterior", async () => {
    const execute = jest.fn()
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
    mockTransaction.mockImplementation(async (callback) => callback({ execute }))
    mockQueryOne
      .mockResolvedValueOnce({
        token_hash: "hash-viejo",
        subject_type: "usuario",
        id_usuario: 7,
        id_paciente: null,
        revoked: false,
        expires_at: new Date(Date.now() + 60_000),
      })
      .mockResolvedValueOnce({
        id_usuario: 7,
        username: "dr_test",
        email: "doctor@example.test",
        nombre: "Doctor",
        apellido_paterno: "Prueba",
        nombre_rol: "Médico",
      })

    const { refreshSession } = await import("@/lib/auth")
    const result = await refreshSession("refresh-anterior-seguro-de-prueba-123456")

    expect(result.success).toBe(true)
    expect(result.refreshToken).toBeDefined()
    expect(result.refreshToken).not.toBe("refresh-anterior-seguro-de-prueba-123456")
    expect(execute.mock.calls[0][0]).toContain("revoked = FALSE")
  })

  it("rechaza el replay cuando otro proceso ya reclamó el token", async () => {
    const execute = jest.fn().mockResolvedValueOnce([{ affectedRows: 0 }])
    mockTransaction.mockImplementation(async (callback) => callback({ execute }))
    mockQueryOne
      .mockResolvedValueOnce({
        token_hash: "hash-viejo",
        subject_type: "usuario",
        id_usuario: 7,
        id_paciente: null,
        revoked: false,
        expires_at: new Date(Date.now() + 60_000),
      })
      .mockResolvedValueOnce({
        id_usuario: 7,
        username: "dr_test",
        email: "doctor@example.test",
        nombre: "Doctor",
        apellido_paterno: "Prueba",
        nombre_rol: "Médico",
      })

    const { refreshSession } = await import("@/lib/auth")
    const result = await refreshSession("refresh-anterior-seguro-de-prueba-123456")

    expect(result.success).toBe(false)
    expect(result.message).toContain("utilizado")
  })

  it("revoca por hash y nunca persiste el token en texto plano", async () => {
    const rawToken = "refresh-token-que-no-debe-llegar-a-la-base-123456"
    const expectedHash = createHash("sha256").update(rawToken).digest("hex")
    const { revokeRefreshToken } = await import("@/lib/auth")

    await revokeRefreshToken(rawToken)

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("revoked = TRUE"), [expectedHash])
    expect(JSON.stringify(mockQuery.mock.calls)).not.toContain(rawToken)
  })
})
