#!/usr/bin/env node
// Sondea rutas concretas tras login y guarda screenshots. Uso: node scripts/qa-probe.js /ruta1 /ruta2 ...
const d = require("./qa-driver.js")
const routes = process.argv.slice(2)
const waitMs = parseInt(process.env.PROBE_WAIT || "4000")

;(async () => {
  const tab = await d.openTab(d.baseUrl + "/login")
  const c = d.createClient(tab.webSocketDebuggerUrl)
  await c.send("Page.enable")
  await c.send("Runtime.enable")
  await c.send("Log.enable")
  await c.send("Network.enable")
  await c.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })

  const errors = []
  let cur = "/login"
  c.onEvent((m) => {
    if (m.method === "Runtime.exceptionThrown") errors.push({ p: cur, t: (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || "").slice(0, 200) })
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") errors.push({ p: cur, t: m.params.entry.text.slice(0, 200) })
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400) errors.push({ p: cur, t: `HTTP ${m.params.response.status} ${m.params.response.url}` })
  })

  await c.send("Page.navigate", { url: d.baseUrl + "/login" })
  await d.waitFor(c, "document.readyState==='complete'")
  await d.fill(c, "#username", "admin_luis")
  await d.fill(c, "#password", "password123")
  await c.evaluate("document.querySelector('form')?.requestSubmit()")
  const ok = await d.waitFor(c, "location.pathname==='/dashboard'", 30000)
  if (!ok) { console.log("LOGIN FAILED"); process.exit(1) }

  for (const p of routes) {
    cur = p
    await c.send("Page.navigate", { url: d.baseUrl + p })
    await d.waitFor(c, "document.readyState==='complete'")
    await d.wait(waitMs)
    const s = await c.evaluate("({h1:document.querySelector('h1')?.innerText||'', len:document.body.innerText.length, snippet:document.body.innerText.replace(/\\s+/g,' ').slice(0,200)})").catch((e) => ({ err: e.message }))
    console.log(p, "=>", JSON.stringify(s))
    await d.screenshot(c, "probe-" + p.replace(/[\/\?=&]/g, "_"))
  }
  console.log("\nERRORS:", errors.length)
  for (const e of errors.slice(0, 25)) console.log("  [" + e.p + "]", e.t)
  c.close()
})().catch((e) => { console.error(e); process.exit(1) })
