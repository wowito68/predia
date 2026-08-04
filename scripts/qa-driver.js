#!/usr/bin/env node
// CDP driver usando WebSocket nativo de Node. Reutilizable para QA de PREDIA.
const fs = require("fs")

const baseUrl = process.env.PREDIA_BASE_URL || "http://127.0.0.1:3002"
const cdpUrl = process.env.PREDIA_CDP_URL || "http://127.0.0.1:9222"
const shotsDir = process.env.PREDIA_SCREENSHOTS_DIR || "/tmp/predia-shots"
const qaUsername = process.env.PREDIA_QA_USERNAME || "admin_luis"
const qaPassword = process.env.PREDIA_QA_PASSWORD || "password123"
fs.mkdirSync(shotsDir, { recursive: true })

async function openTab(url) {
  const res = await fetch(`${cdpUrl}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })
  if (!res.ok) throw new Error(`No se pudo abrir tab CDP: ${res.status}`)
  return res.json()
}

function createClient(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map()
  const listeners = []
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject, timeout } = pending.get(msg.id)
      pending.delete(msg.id)
      clearTimeout(timeout)
      if (msg.error) reject(new Error(`${msg.error.message}: ${msg.error.data || ""}`))
      else resolve(msg.result)
      return
    }
    for (const l of listeners) l(msg)
  })
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve)
    ws.addEventListener("error", (e) => reject(new Error("WS error")))
  })
  async function send(method, params = {}) {
    await ready
    const msgId = ++id
    ws.send(JSON.stringify({ id: msgId, method, params }))
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (pending.has(msgId)) { pending.delete(msgId); reject(new Error(`Timeout CDP: ${method}`)) }
      }, 60000)
      pending.set(msgId, { resolve, reject, timeout })
    })
  }
  async function evaluate(expression, awaitPromise = true) {
    const r = await send("Runtime.evaluate", { expression, awaitPromise, returnByValue: true, userGesture: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || "Runtime exception")
    return r.result.value
  }
  return { send, evaluate, onEvent: (l) => listeners.push(l), close: () => ws.close() }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function waitFor(client, expr, timeout = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const ok = await client.evaluate(`Boolean(${expr})`).catch(() => false)
    if (ok) return true
    await wait(200)
  }
  return false
}
async function screenshot(client, name) {
  const shot = await client.send("Page.captureScreenshot", { format: "png", fromSurface: true })
  fs.writeFileSync(`${shotsDir}/${name}.png`, Buffer.from(shot.data, "base64"))
}
async function fill(client, selector, value) {
  return client.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)})
    if (!el) return false
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set
    el.focus(); if (setter) setter.call(el, ${JSON.stringify(value)}); else el.value = ${JSON.stringify(value)}
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  })()`)
}
async function clickText(client, text) {
  return client.evaluate(`(() => {
    const all = [...document.querySelectorAll('button, a, [role="button"], [role="menuitem"], [role="tab"]')].filter(el => !el.disabled && el.offsetParent !== null)
    const t = all.find(el => (el.innerText || el.getAttribute('aria-label') || el.title || '').trim().includes(${JSON.stringify(text)}))
    if (!t) return false; t.click(); return true
  })()`)
}

module.exports = { baseUrl, openTab, createClient, wait, waitFor, screenshot, fill, clickText }

// Si se ejecuta directo: hace un crawl de todas las rutas y reporta errores.
if (require.main === module) {
  const PAGES = [
    "/dashboard", "/agenda", "/pacientes", "/nuevo-paciente", "/historial",
    "/configuracion", "/configuracion/plantillas", "/ayuda",
    "/pacientes/1/historial", "/pacientes/1/evolucion", "/pacientes/1/predicciones", "/pacientes/1/editar",
  ]
  ;(async () => {
    const tab = await openTab(`${baseUrl}/login`)
    const client = createClient(tab.webSocketDebuggerUrl)
    await client.send("Page.enable")
    await client.send("Runtime.enable")
    await client.send("Log.enable")
    await client.send("Network.enable")
    await client.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })

    const consoleErrors = []
    const netErrors = []
    let currentPath = "/login"
    client.onEvent((msg) => {
      if (msg.method === "Runtime.exceptionThrown") consoleErrors.push({ path: currentPath, text: msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text })
      if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") consoleErrors.push({ path: currentPath, text: msg.params.entry.text })
      if (msg.method === "Network.responseReceived") {
        const s = msg.params.response.status
        if (s >= 400) netErrors.push({ path: currentPath, url: msg.params.response.url, status: s })
      }
    })

    async function go(path, name) {
      currentPath = path
      await client.send("Page.navigate", { url: `${baseUrl}${path}` })
      await waitFor(client, "document.readyState === 'complete'")
      await wait(1500)
      const state = await client.evaluate(`(() => ({
        path: location.pathname,
        h1: document.querySelector('h1')?.innerText || '',
        bodyLen: document.body.innerText.length,
        bodySnippet: document.body.innerText.slice(0, 200),
        deadButtons: [...document.querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent !== null && !b.getAttribute('type') && b.innerText && !b.onclick).length,
        emptyState: /no hay|sin datos|0 result|no se encontr|error/i.test(document.body.innerText.slice(0,400))
      }))()`).catch((e) => ({ error: e.message }))
      await screenshot(client, name)
      return { name, ...state }
    }

    // Login
    await go("/login", "01-login")
    await fill(client, "#username", qaUsername)
    await fill(client, "#password", qaPassword)
    await client.evaluate(`document.querySelector('form')?.requestSubmit()`)
    const logged = await waitFor(client, "location.pathname === '/dashboard'", 30000)

    const results = [{ login: logged ? "OK" : "FALLÓ" }]
    let i = 2
    for (const p of PAGES) {
      const n = String(i++).padStart(2, "0") + "-" + p.replace(/\//g, "_")
      results.push(await go(p, n))
    }

    const summary = { loginOk: logged, results, consoleErrors, netErrors }
    fs.writeFileSync("/tmp/predia-qa-result.json", JSON.stringify(summary, null, 2))
    console.log(JSON.stringify({ loginOk: logged, pages: results.map(r => ({ name: r.name, h1: r.h1, bodyLen: r.bodyLen, err: r.error })), consoleErrors, netErrors }, null, 2))
    client.close()
  })().catch((e) => { console.error(e); process.exit(1) })
}
