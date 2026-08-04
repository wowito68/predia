describe("aislamiento de tokens por tipo de usuario", () => {
  const previousSecret = process.env.JWT_SECRET

  beforeEach(() => {
    jest.resetModules()
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters"
  })

  afterAll(() => {
    process.env.JWT_SECRET = previousSecret
  })

  it("acepta un token de personal en endpoints internos", () => {
    const { generateToken, verifyToken } = require("@/lib/auth")
    const token = generateToken({
      tipo: "staff",
      id_usuario: 7,
      username: "dr_test",
      rol: "Médico",
    })

    expect(verifyToken(token)).toMatchObject({ id_usuario: 7, rol: "Médico" })
  })

  it("rechaza un token de paciente en endpoints exclusivos de personal", () => {
    const { generatePacienteToken, verifyToken } = require("@/lib/auth")
    const token = generatePacienteToken({
      tipo: "paciente",
      id_paciente: 23,
      rol: "PACIENTE",
    })

    expect(verifyToken(token)).toBeNull()
  })
})
