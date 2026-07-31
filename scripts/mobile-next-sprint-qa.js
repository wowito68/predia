#!/usr/bin/env node

const fs = require('fs')
const WebSocket = require('ws')

const BASE = process.env.PREDIA_MOBILE_URL || 'http://127.0.0.1:8082'
const CDP = process.env.PREDIA_CDP_URL || 'http://127.0.0.1:9222'
const OUT = process.env.PREDIA_MOBILE_OUT || '/tmp/predia-mobile-next-sprint-qa'

fs.mkdirSync(OUT, { recursive: true })

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function openTab(url) {
  const response = await fetch(`${CDP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })
  if (!response.ok) throw new Error(`No se pudo abrir una pestaña CDP: ${response.status}`)
  return response.json()
}

function createClient(wsUrl) {
  const ws = new WebSocket(wsUrl)
  const pending = new Map()
  const events = []
  let sequence = 0

  ws.on('message', (raw) => {
    const message = JSON.parse(raw.toString())
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id)
      pending.delete(message.id)
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result)
      return
    }
    events.push(message)
  })

  const ready = new Promise((resolve, reject) => {
    ws.on('open', resolve)
    ws.on('error', reject)
  })

  async function send(method, params = {}) {
    await ready
    const id = ++sequence
    ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      setTimeout(() => {
        if (!pending.has(id)) return
        pending.delete(id)
        reject(new Error(`Timeout en ${method}`))
      }, 60_000)
    })
  }

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    })
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
    }
    return result.result.value
  }

  return { send, evaluate, events, close: () => ws.close() }
}

async function waitFor(client, expression, timeout = 60_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeout) {
    if (await client.evaluate(`Boolean(${expression})`).catch(() => false)) return
    await wait(300)
  }
  throw new Error(`Timeout esperando: ${expression}`)
}

async function clickText(client, text) {
  const clicked = await client.evaluate(`(() => {
    const needle = ${JSON.stringify(text)}
    const nodes = [...document.querySelectorAll('[role="button"], button, a, div, span')]
      .filter((node) => node.offsetParent !== null)
      .filter((node) => (node.innerText || node.textContent || '').trim().includes(needle))
      .sort((a, b) => {
        const ar = a.getBoundingClientRect()
        const br = b.getBoundingClientRect()
        return (ar.width * ar.height) - (br.width * br.height)
      })
    if (!nodes[0]) return false
    nodes[0].click()
    return true
  })()`)
  if (!clicked) throw new Error(`No se encontró el control con texto: ${text}`)
}

async function fill(client, placeholder, value) {
  await client.evaluate(`(() => {
    const input = document.querySelector('input[placeholder=${JSON.stringify(placeholder)}]')
    if (!input) throw new Error('No existe el input ${placeholder}')
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set
    input.focus()
    if (setter) setter.call(input, ${JSON.stringify(value)})
    else input.value = ${JSON.stringify(value)}
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })()`)
}

async function screenshot(client, name) {
  await wait(600)
  const image = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  const path = `${OUT}/${name}.png`
  fs.writeFileSync(path, Buffer.from(image.data, 'base64'))
  return path
}

async function snapshot(client, name) {
  const page = await client.evaluate(`(() => ({
    name: ${JSON.stringify(name)},
    path: location.pathname,
    text: document.body.innerText.slice(0, 1800),
    viewport: { width: innerWidth, height: innerHeight },
  }))()`)
  page.screenshot = await screenshot(client, name)
  return page
}

async function resetSession(client) {
  await client.evaluate('localStorage.clear(); sessionStorage.clear()')
  await client.send('Page.navigate', { url: `${BASE}?qa=${Date.now()}` })
  await waitFor(client, "document.body && document.body.innerText.includes('Iniciar Sesión')")
}

async function loginClinical(client, username) {
  await clickText(client, 'Personal clínico')
  await fill(client, 'dr_juan', username)
  await fill(client, '••••••••', 'password123')
  await clickText(client, 'Ingresar')
  await waitFor(client, "document.body.innerText.includes('Tu jornada de hoy')")
}

async function loginPatient(client) {
  await fill(client, 'ROGJ850515HMCRRN08', 'ROGJ850515HMCRRN08')
  await fill(client, '••••••', '123456')
  await clickText(client, 'Ingresar')
  await waitFor(client, "document.body.innerText.includes('Hola, Juan') || document.body.innerText.includes('Tu salud')")
}

async function assertText(client, description, text, present = true) {
  const result = await client.evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`)
  if (result !== present) {
    throw new Error(`${description}: se esperaba que '${text}' ${present ? 'estuviera' : 'no estuviera'} visible`)
  }
  return { description, passed: true }
}

function collectIssues(events) {
  const consoleErrors = []
  const consoleWarnings = []
  const failedRequests = []
  const exceptions = []

  for (const event of events) {
    if (event.method === 'Runtime.exceptionThrown') {
      exceptions.push(event.params.exceptionDetails?.exception?.description || event.params.exceptionDetails?.text)
    }
    if (event.method === 'Runtime.consoleAPICalled') {
      const message = event.params.args.map((arg) => arg.value || arg.description || arg.type).join(' ')
      if (event.params.type === 'error') consoleErrors.push(message)
      if (event.params.type === 'warning') consoleWarnings.push(message)
    }
    if (event.method === 'Log.entryAdded') {
      if (event.params.entry.level === 'error') consoleErrors.push(event.params.entry.text)
      if (event.params.entry.level === 'warning') consoleWarnings.push(event.params.entry.text)
    }
    if (event.method === 'Network.responseReceived') {
      const { status, url } = event.params.response
      if (status >= 400 && !url.includes('favicon')) failedRequests.push(`${status} ${url}`)
    }
  }

  const unique = (items) => [...new Set(items.filter(Boolean))]
  return {
    consoleErrors: unique(consoleErrors),
    consoleWarnings: unique(consoleWarnings),
    failedRequests: unique(failedRequests),
    exceptions: unique(exceptions),
  }
}

async function main() {
  const tab = await openTab(BASE)
  const client = createClient(tab.webSocketDebuggerUrl)
  const pages = []
  const assertions = []

  await client.send('Page.enable')
  await client.send('Runtime.enable')
  await client.send('Network.enable')
  await client.send('Log.enable')
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  })

  await resetSession(client)
  await loginClinical(client, 'dr_juan')
  assertions.push(await assertText(client, 'Inicio médico', 'Validar IA'))
  pages.push(await snapshot(client, '01-medico-inicio'))

  await clickText(client, 'Alertas')
  await waitFor(client, "document.body.innerText.includes('Alertas clínicas')")
  await waitFor(client, "document.body.innerText.includes('Acción sugerida') || document.body.innerText.includes('No se pudieron cargar')")
  assertions.push(await assertText(client, 'Alertas con acción', 'Acción sugerida'))
  pages.push(await snapshot(client, '02-medico-alertas'))

  await clickText(client, 'Pacientes')
  await waitFor(client, "document.body.innerText.includes('Juan Rodríguez')")
  await clickText(client, 'Juan Rodríguez')
  await waitFor(client, "document.body.innerText.includes('Acciones clínicas')")
  assertions.push(await assertText(client, 'Permiso médico de consulta', 'Nueva consulta'))
  assertions.push(await assertText(client, 'Permiso médico de receta', 'Nueva receta'))
  pages.push(await snapshot(client, '03-medico-paciente'))

  await clickText(client, 'Ver historial')
  await waitFor(client, "document.body.innerText.includes('Historial clínico')")
  pages.push(await snapshot(client, '04-medico-historial'))

  await resetSession(client)
  await loginClinical(client, 'enf_pedro')
  assertions.push(await assertText(client, 'Inicio enfermería sin IA', 'Validar IA', false))
  pages.push(await snapshot(client, '05-enfermeria-inicio'))

  await clickText(client, 'Pacientes')
  await waitFor(client, "document.body.innerText.includes('Juan Rodríguez')")
  await clickText(client, 'Juan Rodríguez')
  await waitFor(client, "document.body.innerText.includes('Acciones clínicas')")
  assertions.push(await assertText(client, 'Enfermería registra signos', 'Nueva medición'))
  assertions.push(await assertText(client, 'Enfermería sin consulta', 'Nueva consulta', false))
  assertions.push(await assertText(client, 'Enfermería sin receta', 'Nueva receta', false))
  pages.push(await snapshot(client, '06-enfermeria-paciente'))

  await resetSession(client)
  await loginPatient(client)
  await waitFor(client, "document.body.innerText.includes('Accesos rápidos') || document.body.innerText.includes('No pudimos cargar')")
  assertions.push(await assertText(client, 'Inicio paciente', 'Accesos rápidos'))
  pages.push(await snapshot(client, '07-paciente-inicio'))

  for (const [tabLabel, expected, name] of [
    ['Indicadores', 'Mis indicadores', '08-paciente-indicadores'],
    ['Recetas', 'Mis recetas', '09-paciente-recetas'],
    ['Consejos', 'Recomendaciones', '10-paciente-recomendaciones'],
  ]) {
    await clickText(client, tabLabel)
    await waitFor(client, `document.body.innerText.includes(${JSON.stringify(expected)})`)
    pages.push(await snapshot(client, name))
  }

  const issues = collectIssues(client.events)
  const report = { baseUrl: BASE, output: OUT, assertions, pages, issues }
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  client.close()

  if (issues.consoleErrors.length || issues.failedRequests.length || issues.exceptions.length) {
    process.exit(2)
  }
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
