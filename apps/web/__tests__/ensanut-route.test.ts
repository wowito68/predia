import { NextRequest } from "next/server"

jest.mock("@/lib/db", () => ({ queryOne: jest.fn(), query: jest.fn(), transaction: jest.fn() }))

describe("ENSANUT research API", () => {
  const input = { id_paciente: 1, age: 66, female: 0, parent_diabetes: 1, diagnosed_hypertension: 1, bmi: 35, waist_cm: 112 }

  async function setup() {
    const { generateToken } = await import("@/lib/auth")
    const { POST } = await import("@/app/api/predicciones/ensanut/route")
    const { queryOne, query, transaction } = await import("@/lib/db")
    const token = (role: string) => generateToken({ tipo: "staff", id_usuario: 2, username: "qa", rol: role })
    const request = (body: unknown, role: string | null = "Médico", raw = false) => new NextRequest("http://localhost/api/predicciones/ensanut", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(role ? { Authorization: `Bearer ${token(role)}` } : {}) },
      body: raw ? String(body) : JSON.stringify(body),
    })
    return { POST, queryOne: jest.mocked(queryOne), query: jest.mocked(query), transaction: jest.mocked(transaction), request }
  }

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env.JWT_SECRET = "isolated-ensanut-test-secret-at-least-32-bytes"
    process.env.JWT_EXPIRES_IN = "15m"
  })

  it.each([null, "Enfermero"])("rejects missing or insufficient authorization: %s", async (role) => {
    const { POST, queryOne, request } = await setup()
    const response = await POST(request(input, role), {})
    expect(response.status).toBe(role ? 403 : 401)
    expect(queryOne).not.toHaveBeenCalled()
  })

  it.each([{ age: 19 }, { age: 111 }, { bmi: 81 }, { waist_cm: 221 }, { id_paciente: -1 }, { female: 2 }])("rejects invalid ranges before reading the database: %j", async (invalid) => {
    const { POST, queryOne, request } = await setup()
    const response = await POST(request({ ...input, ...invalid }), {})
    expect(response.status).toBe(400)
    expect(queryOne).not.toHaveBeenCalled()
  })

  it("returns 400 for malformed JSON instead of a server error", async () => {
    const { POST, queryOne, request } = await setup()
    expect((await POST(request("{", "Médico", true), {})).status).toBe(400)
    expect(queryOne).not.toHaveBeenCalled()
  })

  it("returns 404 for a missing or inactive patient", async () => {
    const { POST, queryOne, request } = await setup()
    queryOne.mockResolvedValueOnce(null)
    expect((await POST(request(input), {})).status).toBe(404)
  })

  it.each(["Médico", "Administrador"])("returns a nonpersistent result for %s without writing to the database", async (role) => {
    const { POST, queryOne, query, transaction, request } = await setup()
    queryOne.mockResolvedValueOnce({ id_paciente: 1 })
    const response = await POST(request(input, role), {})
    const result = await response.json()
    expect(response.status).toBe(200)
    expect(result.data.persisted).toBe(false)
    expect(result.data.warning).toMatch(/No diagnostica diabetes/i)
    expect(queryOne).toHaveBeenCalledWith(expect.stringContaining("activo = TRUE"), [1])
    expect(query).not.toHaveBeenCalled()
    expect(transaction).not.toHaveBeenCalled()
  })
})
