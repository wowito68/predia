#!/usr/bin/env node
const fs = require("fs")
const WebSocket = require("ws")

const baseUrl = process.env.PREDIA_BASE_URL || "http://127.0.0.1:3002"
const cdpUrl = process.env.PREDIA_CDP_URL || "http://127.0.0.1:9222"
const out = process.env.PREDIA_PRODUCT_QA_OUT || "/tmp/predia-product-redesign-qa"
fs.mkdirSync(out, { recursive: true })

async function openTab(url) {
  const res = await fetch(`${cdpUrl}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })
  if (!res.ok) throw new Error(`CDP tab failed: ${res.status}`)
  return res.json()
}

function client(wsUrl) {
  const ws = new WebSocket(wsUrl)
  const pending = new Map()
  const events = []
  let id = 0
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString())
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
      return
    }
    events.push(msg)
  })
  const ready = new Promise((resolve, reject) => {
    ws.on("open", resolve)
    ws.on("error", reject)
  })
  async function send(method, params = {}) {
    await ready
    const msgId = ++id
    ws.send(JSON.stringify({ id: msgId, method, params }))
    return new Promise((resolve, reject) => {
      pending.set(msgId, { resolve, reject })
      setTimeout(() => {
        if (pending.has(msgId)) {
          pending.delete(msgId)
          reject(new Error(`Timeout ${method}`))
        }
      }, 60000)
    })
  }
  async function evalJs(expression) {
    const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true })
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text)
    return res.result.value
  }
  return { send, evalJs, events, close: () => ws.close() }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function waitFor(c, expression, timeout = 60000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const ok = await c.evalJs(`Boolean(${expression})`).catch(() => false)
    if (ok) return
    await wait(250)
  }
  throw new Error(`Timeout waiting for ${expression}`)
}

async function fill(c, selector, value) {
  await c.evalJs(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)})
    if (!el) throw new Error('missing selector ${selector}')
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set
    el.focus()
    if (setter) setter.call(el, ${JSON.stringify(value)})
    else el.value = ${JSON.stringify(value)}
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })()`)
}

async function shot(c, name) {
  const data = await c.send("Page.captureScreenshot", { format: "png", fromSurface: true })
  const file = `${out}/${name}.png`
  fs.writeFileSync(file, Buffer.from(data.data, "base64"))
  return file
}

async function navigate(c, path, name, mustContain = "") {
  await c.send("Page.navigate", { url: `${baseUrl}${path}` })
  await waitFor(c, "document.readyState === 'complete'")
  if (mustContain) await waitFor(c, `document.body.innerText.includes(${JSON.stringify(mustContain)})`)
  await wait(900)
  const state = await c.evalJs(`(() => ({
    name: ${JSON.stringify(name)},
    path: location.pathname,
    h1: document.querySelector('h1')?.innerText || '',
    text: document.body.innerText.slice(0, 1000),
    links: [...document.querySelectorAll('a')].map((el) => el.innerText.trim()).filter(Boolean).slice(0, 30),
    buttons: [...document.querySelectorAll('button')].map((el) => el.innerText.trim() || el.title || el.getAttribute('aria-label') || 'icon').slice(0, 30),
    empty: document.body.innerText.trim().length < 80,
  }))()`)
  state.screenshot = await shot(c, name)
  return state
}

function issues(events) {
  const consoleErrors = []
  const failedRequests = []
  const exceptions = []
  for (const event of events) {
    if (event.method === "Runtime.exceptionThrown") exceptions.push(event.params.exceptionDetails?.exception?.description || event.params.exceptionDetails?.text)
    if (event.method === "Log.entryAdded" && ["error", "warning"].includes(event.params.entry.level)) {
      const text = event.params.entry.text
      if (!text.includes("favicon")) consoleErrors.push(text)
    }
    if (event.method === "Network.responseReceived" && event.params.response.status >= 400) {
      const url = event.params.response.url
      if (!url.includes("favicon")) failedRequests.push(`${event.params.response.status} ${url}`)
    }
  }
  return {
    consoleErrors: [...new Set(consoleErrors)],
    failedRequests: [...new Set(failedRequests)],
    exceptions: [...new Set(exceptions)],
  }
}

async function main() {
  const tab = await openTab(`${baseUrl}/login`)
  const c = client(tab.webSocketDebuggerUrl)
  await c.send("Page.enable")
  await c.send("Runtime.enable")
  await c.send("Network.enable")
  await c.send("Log.enable")
  await c.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })

  await navigate(c, "/login", "01-login", "Iniciar")
  await c.evalJs("localStorage.clear()")
  await fill(c, "#username", "admin_luis")
  await fill(c, "#password", "password123")
  await c.evalJs("document.querySelector('form')?.requestSubmit()")
  await waitFor(c, "location.pathname === '/dashboard'")

  const report = []
  report.push(await navigate(c, "/dashboard", "02-inicio", "Panel de Control"))
  report.push(await navigate(c, "/alertas", "03-alertas", "Alertas Clínicas"))
  report.push(await navigate(c, "/analitica", "04-analitica", "Analítica Clínica"))
  report.push(await navigate(c, "/pacientes", "05-pacientes", "Juan"))
  report.push(await navigate(c, "/pacientes/1", "06-patient-overview", "Resumen Clínico"))
  report.push(await navigate(c, "/pacientes/1/evolucion", "07-patient-evolucion", "Evolución Clínica"))
  report.push(await navigate(c, "/pacientes/1/predicciones", "08-patient-ia", "Predicciones de Diabetes"))

  const result = { baseUrl, out, report, issues: issues(c.events) }
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
  c.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
