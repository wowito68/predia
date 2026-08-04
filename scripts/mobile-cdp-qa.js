#!/usr/bin/env node
const fs = require('fs')
const WebSocket = require('ws')

const BASE = process.env.PREDIA_MOBILE_URL || 'http://127.0.0.1:8082'
const CDP = process.env.PREDIA_CDP_URL || 'http://127.0.0.1:9222'
const OUT = process.env.PREDIA_MOBILE_OUT || '/tmp/predia-mobile-qa'
const CLINICAL_USERNAME = process.env.PREDIA_QA_CLINICAL_USERNAME || 'dr_juan'
const CLINICAL_PASSWORD = process.env.PREDIA_QA_CLINICAL_PASSWORD || 'password123'
const PATIENT_CURP = process.env.PREDIA_QA_PATIENT_CURP || 'ROGJ850515HMCRRN08'
const PATIENT_PIN = process.env.PREDIA_QA_PATIENT_PIN || '123456'
const VIEWPORT_WIDTH = Number(process.env.PREDIA_VIEWPORT_WIDTH || 390)
const VIEWPORT_HEIGHT = Number(process.env.PREDIA_VIEWPORT_HEIGHT || 844)
const COLOR_SCHEME = process.env.PREDIA_COLOR_SCHEME
fs.mkdirSync(OUT, { recursive: true })

async function openTab(url) {
  const res = await fetch(`${CDP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })
  if (!res.ok) throw new Error(`CDP new tab failed: ${res.status}`)
  return res.json()
}

function client(wsUrl) {
  const ws = new WebSocket(wsUrl)
  const pending = new Map()
  const events = []
  let id = 0
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString())
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject, timeout } = pending.get(msg.id)
      pending.delete(msg.id)
      clearTimeout(timeout)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
      return
    }
    events.push(msg)
  })
  const ready = new Promise((resolve, reject) => {
    ws.on('open', resolve)
    ws.on('error', reject)
  })
  async function send(method, params = {}) {
    await ready
    const msgId = ++id
    ws.send(JSON.stringify({ id: msgId, method, params }))
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (pending.has(msgId)) {
          pending.delete(msgId)
          reject(new Error(`Timeout ${method}`))
        }
      }, 60000)
      pending.set(msgId, { resolve, reject, timeout })
    })
  }
  async function evalJs(expression) {
    const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text)
    return res.result.value
  }
  return { send, evalJs, events, close: () => ws.close() }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function waitFor(c, expr, timeout = 60000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const ok = await c.evalJs(`Boolean(${expr})`).catch(() => false)
    if (ok) return
    await wait(300)
  }
  throw new Error(`Timeout waiting for ${expr}`)
}

async function shot(c, name) {
  const data = await c.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  const file = `${OUT}/${name}.png`
  fs.writeFileSync(file, Buffer.from(data.data, 'base64'))
  return file
}

async function fill(c, selector, value) {
  await c.evalJs(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)})
    if (!el) throw new Error('missing selector: ${selector}')
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set
    el.focus()
    if (setter) setter.call(el, ${JSON.stringify(value)})
    else el.value = ${JSON.stringify(value)}
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })()`)
}

async function clickText(c, text) {
  return c.evalJs(`(() => {
    const needle = ${JSON.stringify(text)}
    const visible = [...document.querySelectorAll('[role="button"], button, a, [tabindex="0"], div, span')]
      .filter((el) => {
        if (el.offsetParent === null || el.closest('[aria-hidden="true"]')) return false
        const rect = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth
          && style.visibility !== 'hidden' && style.pointerEvents !== 'none'
      })
    const exact = visible.filter((el) => (el.innerText || el.textContent || '').trim() === needle)
    const matches = exact.length ? exact : visible.filter((el) => (el.innerText || el.textContent || '').trim().includes(needle))
    const all = [...new Set(matches.map((el) => el.closest('[role="button"], button, a, [tabindex="0"]') || el))]
      .sort((a, b) => {
        const ar = a.getBoundingClientRect()
        const br = b.getBoundingClientRect()
        return (ar.width * ar.height) - (br.width * br.height)
      })
    const target = all[0]
    if (!target) return false
    target.click()
    return true
  })()`)
}

async function tap(c, x, y) {
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
}

async function clickTab(c, label) {
  const point = await c.evalJs(`(() => {
    const needle = ${JSON.stringify(label)}
    const tabs = [...document.querySelectorAll('a[role="tab"], [role="tab"]')]
    const tab = tabs.find((el) => {
      const text = (el.innerText || el.textContent || '').trim()
      const href = el.getAttribute('href') || ''
      return text.includes(needle) || href.endsWith('/' + needle)
    })
    if (!tab) return null
    const rect = tab.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  })()`)
  if (!point) return false
  await tap(c, point.x, point.y)
  return true
}

async function listTabs() {
  const res = await fetch(`${CDP}/json/list`)
  if (!res.ok) throw new Error(`CDP list tabs failed: ${res.status}`)
  return res.json()
}

async function verifyPrintPopup(c, actionLabel, expectedTitle, expectedFragments) {
  const before = new Set((await listTabs()).map((tab) => tab.id))
  const clicked = await clickText(c, actionLabel)
  if (!clicked) throw new Error(`No pude ejecutar ${actionLabel}`)

  const startedAt = Date.now()
  let target
  while (Date.now() - startedAt < 15000) {
    const tabs = await listTabs()
    target = tabs.find((tab) => tab.type === 'page' && tab.webSocketDebuggerUrl && !before.has(tab.id))
    if (target) break
    await wait(250)
  }
  if (!target) throw new Error(`${actionLabel} no abrió la vista de impresión`)

  const popup = client(target.webSocketDebuggerUrl)
  try {
    await popup.send('Page.enable')
    await popup.send('Runtime.enable')
    await waitFor(popup, "document.readyState === 'complete' && document.body", 15000)
    const document = await popup.evalJs(`(() => ({
      title: document.title,
      text: document.body.innerText,
    }))()`)
    if (!document.title.includes(expectedTitle)) {
      throw new Error(`Título inesperado en ${actionLabel}: ${document.title}`)
    }
    for (const fragment of expectedFragments) {
      if (!document.text.includes(fragment)) {
        throw new Error(`${actionLabel} no contiene: ${fragment}`)
      }
    }
    await popup.evalJs('window.close()').catch(() => undefined)
    return {
      action: actionLabel,
      title: document.title,
      textLength: document.text.length,
      validatedFragments: expectedFragments,
    }
  } finally {
    popup.close()
  }
}

function extractIssues(events) {
  const consoleErrors = []
  const failedRequests = []
  const exceptions = []
  for (const e of events) {
    if (e.method === 'Runtime.exceptionThrown') {
      exceptions.push(e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text)
    }
    if (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(e.params.type)) {
      const text = e.params.args.map((a) => a.value || a.description || a.type).join(' ')
      if (!text.includes('Download the React DevTools')) consoleErrors.push(text)
    }
    if (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level)) {
      consoleErrors.push(e.params.entry.text)
    }
    if (e.method === 'Network.responseReceived') {
      const status = e.params.response.status
      const url = e.params.response.url
      if (status >= 400 && !url.includes('favicon')) failedRequests.push(`${status} ${url}`)
    }
  }
  return {
    consoleErrors: [...new Set(consoleErrors)],
    failedRequests: [...new Set(failedRequests)],
    exceptions: [...new Set(exceptions)],
  }
}

async function summarize(c, name) {
  await wait(3000)
  const summary = await c.evalJs(`(() => ({
    name: ${JSON.stringify(name)},
    path: location.pathname,
    text: document.body.innerText.slice(0, 800),
    buttons: [...new Set([...document.querySelectorAll('[role="button"], button, [tabindex="0"]')])].filter((el) => {
      if (el.offsetParent === null || el.closest('[aria-hidden="true"]')) return false
      const rect = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth
        && style.visibility !== 'hidden' && style.pointerEvents !== 'none'
    }).map((el) => (el.innerText || el.textContent || '').trim()).filter(Boolean).slice(0, 30),
    inputs: [...document.querySelectorAll('input, textarea')].map((el) => el.placeholder || el.type || 'input'),
    layout: (() => {
      const visible = [...document.querySelectorAll('*')].filter((el) => {
        const rect = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight
          && rect.right > 0 && rect.left < innerWidth && !el.closest('[aria-hidden="true"]')
          && style.display !== 'none' && style.visibility !== 'hidden'
      })
      const describe = (el) => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        text: (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 80),
        rect: (() => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) } })(),
      })
      const outOfBounds = visible.filter((el) => {
        const rect = el.getBoundingClientRect()
        return rect.left < -1 || rect.right > innerWidth + 1
      }).map(describe).slice(0, 20)
      const smallTargets = visible.filter((el) => {
        if (!el.matches('[role="button"], button, a, [tabindex="0"]')) return false
        const rect = el.getBoundingClientRect()
        return rect.width < 44 || rect.height < 44
      }).map(describe).slice(0, 20)
      return {
        viewport: { width: innerWidth, height: innerHeight },
        documentWidth: document.documentElement.scrollWidth,
        outOfBounds,
        smallTargets,
      }
    })(),
  }))()`)
  summary.screenshot = await shot(c, name)
  return summary
}

async function main() {
  const tab = await openTab(BASE)
  const c = client(tab.webSocketDebuggerUrl)
  await c.send('Page.enable')
  await c.send('Runtime.enable')
  await c.send('Network.enable')
  await c.send('Log.enable')
  await c.send('Emulation.setDeviceMetricsOverride', {
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    deviceScaleFactor: 2,
    mobile: true,
  })
  if (COLOR_SCHEME === 'light' || COLOR_SCHEME === 'dark') {
    await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: COLOR_SCHEME }] })
  }

  await c.send('Page.navigate', { url: BASE })
  await waitFor(c, "document.body")
  await c.evalJs("localStorage.clear()")
  await c.send('Page.navigate', { url: BASE })
  await waitFor(c, "document.body && document.body.innerText.includes('PREDIA')")
  const report = []
  const documents = []
  report.push(await summarize(c, '01-login'))

  await clickText(c, 'Personal clínico')
  await waitFor(c, 'document.querySelector(\'input[placeholder="dr_juan"]\')')
  await fill(c, 'input[placeholder="dr_juan"]', CLINICAL_USERNAME)
  await fill(c, 'input[placeholder="••••••••"]', CLINICAL_PASSWORD)
  await clickText(c, 'Ingresar')
  await waitFor(c, "document.body.innerText.includes('Inicio') || document.body.innerText.includes('Buenos')")
  report.push(await summarize(c, '02-inicio'))

  for (const [label, name, expected] of [
    ['Agenda', '03-agenda', "document.title.includes('Agenda') || document.body.innerText.includes('citas activas')"],
    ['Pacientes', '04-pacientes', "document.title.includes('Pacientes') || document.body.innerText.includes('Cartera') || document.body.innerText.includes('Buscar paciente')"],
    ['Alertas', '06-alertas', "document.title.includes('Alertas') || document.body.innerText.includes('Prioridad') || document.body.innerText.includes('alertas')"],
    ['Perfil', '07-perfil', "document.title.includes('Perfil') || document.body.innerText.includes('Cerrar sesión') || document.body.innerText.includes('Cuenta')"],
  ]) {
    await waitFor(c, `[...document.querySelectorAll('a[role="tab"], [role="tab"]')].some((el) => ((el.innerText || el.textContent || '').trim().includes(${JSON.stringify(label)})))`, 15000)
    const clicked = await clickTab(c, label)
    if (!clicked) throw new Error(`No pude abrir tab ${label}`)
    await waitFor(c, expected, 15000)
    if (label === 'Agenda') {
      await waitFor(c, "document.body.innerText.includes('Juan Rodríguez') || document.body.innerText.includes('Agenda disponible') || document.body.innerText.includes('No se pudo cargar la agenda')", 45000)
    }
    report.push(await summarize(c, name))
    if (label === 'Pacientes') {
      await waitFor(c, "document.body.innerText.includes('Juan') || document.body.innerText.includes('Sin resultados') || document.body.innerText.includes('No se pudieron cargar')")
      await clickText(c, 'Juan Rodríguez')
      await waitFor(c, "document.body.innerText.includes('Resumen clínico') || document.body.innerText.includes('No se pudo')")
      await waitFor(c, "document.body.innerText.includes('Acciones clínicas') || document.body.innerText.includes('No se pudo')")
      report.push(await summarize(c, '05-paciente-detalle'))
      if (await c.evalJs("document.body.innerText.includes('Exportar PDF')")) {
        documents.push(await verifyPrintPopup(c, 'Exportar PDF', 'Resumen clínico', ['PREDIA', 'Juan Rodríguez']))
      }
      await c.send('Page.navigate', { url: BASE })
      await waitFor(c, "document.body.innerText.includes('Inicio') || document.body.innerText.includes('Buenos')")
    }
  }

  await c.evalJs("localStorage.clear()")
  await c.send('Page.navigate', { url: BASE })
  await waitFor(c, "document.body && document.body.innerText.includes('PREDIA')")
  await clickText(c, 'Paciente')
  await waitFor(c, 'document.querySelector(\'input[placeholder="ROGJ850515HMCRRN08"]\')')
  await fill(c, 'input[placeholder="ROGJ850515HMCRRN08"]', PATIENT_CURP)
  await fill(c, 'input[placeholder="••••••"]', PATIENT_PIN)
  await clickText(c, 'Ingresar')
  await waitFor(c, "document.body.innerText.includes('Tu panorama clínico') || document.body.innerText.includes('No pudimos cargar tu resumen')", 45000)
  report.push(await summarize(c, '08-paciente-inicio'))

  for (const [label, name, expected] of [
    ['Indicadores', '09-paciente-indicadores', "document.title.includes('Indicadores') || document.body.innerText.includes('Mis indicadores')"],
    ['Recetas', '10-paciente-recetas', "document.title.includes('Recetas') || document.body.innerText.includes('Mis recetas')"],
    ['Consejos', '11-paciente-consejos', "document.title.includes('Recomendaciones') || document.body.innerText.includes('Recomendaciones')"],
  ]) {
    await waitFor(c, `[...document.querySelectorAll('a[role="tab"], [role="tab"]')].some((el) => ((el.innerText || el.textContent || '').trim().includes(${JSON.stringify(label)})))`, 15000)
    const clicked = await clickTab(c, label)
    if (!clicked) throw new Error(`No pude abrir tab paciente ${label}`)
    await waitFor(c, expected, 15000)
    if (label === 'Indicadores') {
      await waitFor(c, "document.body.innerText.includes('COBERTURA DE MONITOREO') || document.body.innerText.includes('Glucosa') || document.body.innerText.includes('No se pudieron cargar tus indicadores')", 45000)
    }
    if (label === 'Recetas') {
      await waitFor(c, "document.body.innerText.includes('Metformina') || document.body.innerText.includes('No tienes recetas') || document.body.innerText.includes('No se pudo')", 45000)
      if (await c.evalJs("document.body.innerText.includes('Metformina')")) {
        documents.push(await verifyPrintPopup(c, 'PDF', 'Receta médica', ['PREDIA', 'Metformina']))
      }
    }
    if (label === 'Consejos') {
      await waitFor(c, "document.body.innerText.includes('Qué puedes hacer ahora') || document.body.innerText.includes('Sin indicaciones registradas') || document.body.innerText.includes('No se pudieron cargar tus recomendaciones')", 45000)
    }
    report.push(await summarize(c, name))
  }

  const issues = extractIssues(c.events)
  const result = { baseUrl: BASE, out: OUT, report, documents, issues }
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
  c.close()
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

module.exports = {
  openTab,
  client,
  wait,
  waitFor,
  shot,
  fill,
  clickText,
  clickTab,
  listTabs,
  summarize,
  extractIssues,
}
