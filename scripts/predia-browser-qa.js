#!/usr/bin/env node
const fs = require("fs")
const WebSocket = require("ws")

const baseUrl = process.env.PREDIA_BASE_URL || "http://127.0.0.1:3002"
const cdpUrl = process.env.PREDIA_CDP_URL || "http://127.0.0.1:9222"
const screenshotsDir = process.env.PREDIA_SCREENSHOTS_DIR || "/tmp/predia-screenshots"

fs.mkdirSync(screenshotsDir, { recursive: true })

async function openTab(url) {
  const res = await fetch(`${cdpUrl}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })
  if (!res.ok) throw new Error(`No se pudo abrir tab CDP: ${res.status}`)
  return res.json()
}

function createClient(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map()
  const events = []

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString())
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(`${msg.error.message}: ${msg.error.data || ""}`))
      else resolve(msg.result)
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
          reject(new Error(`Timeout CDP: ${method}`))
        }
      }, 90000)
    })
  }

  async function evaluate(expression, awaitPromise = true) {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise,
      returnByValue: true,
      userGesture: true,
    })
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "Runtime exception")
    }
    return result.result.value
  }

  return { send, evaluate, events, close: () => ws.close() }
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitFor(client, expression, timeout = 60000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const ok = await client.evaluate(`Boolean(${expression})`).catch(() => false)
    if (ok) return
    await wait(250)
  }
  throw new Error(`Timeout esperando: ${expression}`)
}

async function screenshot(client, name) {
  const shot = await client.send("Page.captureScreenshot", { format: "png", fromSurface: true })
  const file = `${screenshotsDir}/${name}.png`
  fs.writeFileSync(file, Buffer.from(shot.data, "base64"))
  return file
}

async function navigate(client, path, name) {
  await client.send("Page.navigate", { url: `${baseUrl}${path}` })
  await waitFor(client, "document.readyState === 'complete'")
  await wait(1200)
  const state = await client.evaluate(`(() => ({
    path: location.pathname,
    title: document.title,
    h1: document.querySelector('h1')?.innerText || '',
    bodyText: document.body.innerText.slice(0, 500),
    buttons: [...document.querySelectorAll('button')].map((b) => b.innerText || b.getAttribute('aria-label') || b.title || 'icon').slice(0, 20),
    dialogs: document.querySelectorAll('[role="dialog"]').length,
    menus: document.querySelectorAll('[role="menu"], [role="listbox"]').length,
    visibleTextOverflow: [...document.querySelectorAll('button, [role="button"], a')].filter((el) => el.scrollWidth > el.clientWidth + 2).length
  }))()`)
  const file = await screenshot(client, name)
  return { ...state, screenshot: file }
}

async function clickText(client, text) {
  return client.evaluate(`(() => {
    const all = [...document.querySelectorAll('button, a, [role="button"], [role="menuitem"]')]
      .filter((el) => !el.disabled && el.offsetParent !== null)
    const target = all.find((el) => (el.innerText || el.getAttribute('aria-label') || el.title || '').trim().includes(${JSON.stringify(text)}))
    if (!target) return false
    target.click()
    return true
  })()`)
}

async function fill(client, selector, value) {
  await client.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)})
    if (!el) throw new Error('No existe selector ${selector}')
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set
    el.focus()
    if (setter) setter.call(el, ${JSON.stringify(value)})
    else el.value = ${JSON.stringify(value)}
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })()`)
}

async function selectRadixByTrigger(client, triggerId, valueText) {
  await client.evaluate(`document.querySelector(${JSON.stringify(`#${triggerId}`)})?.click()`)
  await waitFor(client, "document.querySelector('[role=\"listbox\"]')")
  const selected = await client.evaluate(`(() => {
    const item = [...document.querySelectorAll('[role="option"]')]
      .find((el) => el.innerText.trim() === ${JSON.stringify(valueText)})
    if (!item) return false
    item.click()
    return true
  })()`)
  if (!selected) throw new Error(`No se pudo seleccionar ${valueText}`)
}

async function main() {
  const tab = await openTab(`${baseUrl}/login`)
  const client = createClient(tab.webSocketDebuggerUrl)
  const consoleErrors = []

  await client.send("Page.enable")
  await client.send("Runtime.enable")
  await client.send("Log.enable")
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })

  const originalPush = client.events.push.bind(client.events)
  client.events.push = (event) => {
    if (event.method === "Runtime.exceptionThrown") {
      consoleErrors.push(event.params.exceptionDetails.text || "exception")
    }
    if (event.method === "Log.entryAdded" && ["error", "warning"].includes(event.params.entry.level)) {
      consoleErrors.push(event.params.entry.text)
    }
    return originalPush(event)
  }

  const results = []
  await navigate(client, "/login", "01-login")
  await fill(client, "#username", "admin_luis")
  await fill(client, "#password", "password123")
  await client.evaluate(`document.querySelector('form')?.requestSubmit()`)
  await waitFor(client, "location.pathname === '/dashboard'", 60000)
  results.push(await navigate(client, "/dashboard", "02-dashboard"))

  const pages = [
    ["/agenda", "03-agenda"],
    ["/pacientes", "04-pacientes"],
    ["/historial", "05-historial"],
    ["/configuracion", "06-configuracion"],
    ["/configuracion/plantillas", "07-plantillas"],
    ["/ayuda", "08-ayuda"],
    ["/pacientes/1/historial", "09-paciente-historial"],
    ["/pacientes/1/evolucion", "10-paciente-evolucion"],
    ["/pacientes/1/predicciones", "11-paciente-predicciones"],
    ["/pacientes/1/editar", "12-paciente-editar"],
  ]
  for (const [path, name] of pages) results.push(await navigate(client, path, name))

  await navigate(client, "/agenda", "13-agenda-before-modal")
  await clickText(client, "Agendar Cita")
  await waitFor(client, "document.querySelector('[role=\"dialog\"]')")
  const agendaModal = await client.evaluate(`(() => ({
    hasSolidDialog: getComputedStyle(document.querySelector('[role="dialog"]')).backgroundColor,
    zIndex: getComputedStyle(document.querySelector('[role="dialog"]')).zIndex,
    text: document.querySelector('[role="dialog"]').innerText.slice(0, 250)
  }))()`)
  await screenshot(client, "14-agenda-modal")
  await clickText(client, "Cancelar")
  await wait(500)

  const unique = Date.now().toString().slice(-8)
  await navigate(client, "/nuevo-paciente", "15-nuevo-paciente")
  await fill(client, "#nombre", "Lucia")
  await fill(client, "#apellido_paterno", "Hernandez")
  await fill(client, "#apellido_materno", "QA")
  await fill(client, "#cedula", `QA${unique}`)
  await selectRadixByTrigger(client, "genero", "Femenino")
  await fill(client, "#fecha_nacimiento", "1988-04-12")
  await fill(client, "#email", `lucia.qa.${unique}@example.com`)
  await fill(client, "#telefono", "+52 55 1234 5678")
  await selectRadixByTrigger(client, "tipo_sangre", "O+")
  await fill(client, "#seguro_medico", "IMSS")
  await fill(client, "#poliza_seguro", `POL-${unique}`)
  await fill(client, "#contacto_emergencia_nombre", "Carlos Hernandez")
  await fill(client, "#contacto_emergencia_telefono", "+52 55 1111 2222")
  await clickText(client, "Registrar Paciente")
  await waitFor(client, "location.pathname.includes('/pacientes/') && location.pathname.endsWith('/historial')", 60000)
  const createdPath = await client.evaluate("location.pathname")
  const createdId = Number(createdPath.split("/")[2])
  results.push({ path: createdPath, h1: "Paciente creado desde navegador", createdId })
  await screenshot(client, "16-paciente-creado-historial")

  await navigate(client, `/pacientes/${createdId}/editar`, "17-editar-creado")
  await fill(client, "#telefono", "+52 55 9999 0000")
  await clickText(client, "Guardar")
  await wait(1500)
  await screenshot(client, "18-editar-guardado")

  await navigate(client, "/configuracion", "19-config-light")
  await clickText(client, "Modo Oscuro")
  await wait(700)
  const dark = await client.evaluate(`document.documentElement.classList.contains('dark')`)
  await screenshot(client, "20-config-dark")

  const summary = {
    baseUrl,
    screenshotsDir,
    results,
    agendaModal,
    darkModeApplied: dark,
    consoleErrors,
  }
  fs.writeFileSync("/tmp/predia-browser-qa-result.json", JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))
  client.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
