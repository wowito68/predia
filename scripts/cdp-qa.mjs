// CDP-driven QA walker for PREDIA. Uses Node global WebSocket (Node >=22).
// Logs in via API, injects localStorage token, visits each route,
// captures console errors / failed requests / exceptions, screenshots each page.
import fs from "node:fs"

const BASE = process.env.PREDIA_BASE_URL || "http://127.0.0.1:3002"
const CDP = process.env.PREDIA_CDP_URL || "http://127.0.0.1:9222"
const OUT = process.env.PREDIA_OUT || "/tmp/predia-qa"
fs.mkdirSync(OUT, { recursive: true })

const ROUTES = process.env.PREDIA_ROUTES
  ? process.env.PREDIA_ROUTES.split(",")
  : [
      "/dashboard",
      "/agenda",
      "/pacientes",
      "/nuevo-paciente",
      "/pacientes/1/historial",
      "/pacientes/1/evolucion",
      "/pacientes/1/predicciones",
      "/pacientes/1/editar",
      "/historial",
      "/configuracion",
      "/configuracion/plantillas",
      "/ayuda",
    ]

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: process.env.QA_USER || "dr_juan", password: "password123" }),
  })
  const data = await res.json()
  if (!data.token) throw new Error("Login falló: " + JSON.stringify(data))
  return data
}

function rpc(ws, pending) {
  let id = 0
  return (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const msgId = ++id
      pending.set(msgId, { resolve, reject })
      ws.send(JSON.stringify({ id: msgId, method, params, sessionId }))
    })
}

async function main() {
  const auth = await login()
  const tabRes = await fetch(`${CDP}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" })
  const tab = await tabRes.json()
  const ws = new WebSocket(tab.webSocketDebuggerUrl)
  const pending = new Map()
  let events = []

  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
    } else {
      events.push(msg)
    }
  })
  await new Promise((r, j) => {
    ws.addEventListener("open", r)
    ws.addEventListener("error", j)
  })

  const send = rpc(ws, pending)
  await send("Page.enable")
  await send("Runtime.enable")
  await send("Log.enable")
  await send("Network.enable")
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })

  // Set localStorage token by visiting origin first
  await send("Page.navigate", { url: `${BASE}/login` })
  await new Promise((r) => setTimeout(r, 1500))
  await send("Runtime.evaluate", {
    expression: `localStorage.setItem('token', ${JSON.stringify(auth.token)});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(auth.user))});
      localStorage.setItem('authenticated','true');
      localStorage.setItem('userRole', ${JSON.stringify(auth.user.rol)});`,
  })

  const report = []
  for (const route of ROUTES) {
    events = []
    const consoleErrors = []
    const failedRequests = []
    const exceptions = []
    await send("Page.navigate", { url: `${BASE}${route}` })
    // wait for load
    await new Promise((r) => setTimeout(r, 3500))
    for (const e of events) {
      if (e.method === "Runtime.consoleAPICalled" && e.params.type === "error") {
        consoleErrors.push(e.params.args.map((a) => a.value || a.description || a.type).join(" "))
      }
      if (e.method === "Runtime.exceptionThrown") {
        exceptions.push(e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text)
      }
      if (e.method === "Network.responseReceived") {
        const s = e.params.response.status
        const u = e.params.response.url
        if (s >= 400 && !u.includes("favicon")) failedRequests.push(`${s} ${u.replace(BASE, "")}`)
      }
      if (e.method === "Log.entryAdded" && e.params.entry.level === "error") {
        consoleErrors.push("[log] " + e.params.entry.text)
      }
    }
    // screenshot
    const shot = await send("Page.captureScreenshot", { format: "png" })
    const file = `${OUT}${route.replace(/\//g, "_") || "_root"}.png`
    fs.writeFileSync(file, Buffer.from(shot.data, "base64"))
    report.push({ route, consoleErrors: [...new Set(consoleErrors)], failedRequests: [...new Set(failedRequests)], exceptions: [...new Set(exceptions)], screenshot: file })
    console.log(`✓ ${route}  err:${consoleErrors.length} failed:${failedRequests.length} exc:${exceptions.length}`)
  }

  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  console.log("\n--- ISSUES ---")
  for (const r of report) {
    if (r.consoleErrors.length || r.failedRequests.length || r.exceptions.length) {
      console.log(`\n[${r.route}]`)
      r.exceptions.forEach((e) => console.log("  EXC:", e?.slice(0, 200)))
      r.consoleErrors.forEach((e) => console.log("  ERR:", String(e).slice(0, 200)))
      r.failedRequests.forEach((e) => console.log("  REQ:", e))
    }
  }
  ws.close()
  process.exit(0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
