import { NextRequest } from "next/server"

describe("autorización de API", () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters"
    process.env.JWT_EXPIRES_IN = "15m"
    process.env.JWT_ISSUER = "predia-api-test"
    process.env.JWT_AUDIENCE = "predia-test"
  })

  it("rechaza un Bearer con firma inválida desde el proxy", async () => {
    const { proxy } = await import("@/proxy")
    const request = new NextRequest("http://localhost/api/catalogos/medicamentos", {
      headers: { Authorization: "Bearer token-falso" },
    })

    expect(proxy(request).status).toBe(401)
  })

  it("acepta en el proxy un token staff firmado y tipado", async () => {
    const { generateToken } = await import("@/lib/auth")
    const { proxy } = await import("@/proxy")
    const token = generateToken({ tipo: "staff", id_usuario: 2, username: "dr_test", rol: "Médico" })
    const request = new NextRequest("http://localhost/api/catalogos/medicamentos", {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(proxy(request).status).toBe(200)
  })

  it("reserva la administración de usuarios al rol Administrador", async () => {
    const { generateToken } = await import("@/lib/auth")
    const { GET } = await import("@/app/api/usuarios/route")
    const token = generateToken({ tipo: "staff", id_usuario: 2, username: "dr_test", rol: "Médico" })
    const request = new NextRequest("http://localhost/api/usuarios", {
      headers: { Authorization: `Bearer ${token}` },
    })

    const response = await GET(request)
    expect(response.status).toBe(403)
  })

  it("la selección pública de usuarios nunca incluye password_hash", async () => {
    const { PUBLIC_USER_SELECT } = await import("@/lib/public-user")

    expect(PUBLIC_USER_SELECT).not.toContain("password_hash")
  })
})
