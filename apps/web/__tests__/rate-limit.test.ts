import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit"

describe("authentication rate limit", () => {
  it("allows a fresh attempt after a successful login resets the client bucket", () => {
    const client = `qa-${Date.now()}`

    expect(checkRateLimit(client, 2, 60_000).allowed).toBe(true)
    expect(checkRateLimit(client, 2, 60_000).allowed).toBe(true)
    expect(checkRateLimit(client, 2, 60_000).allowed).toBe(false)

    resetRateLimit(client)

    expect(checkRateLimit(client, 2, 60_000).allowed).toBe(true)
  })
})
