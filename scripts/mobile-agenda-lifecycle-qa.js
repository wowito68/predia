#!/usr/bin/env node
const fs = require('fs')
const {
  openTab,
  client,
  wait,
  waitFor,
  shot,
  fill,
  clickText,
  clickTab,
  summarize,
  extractIssues,
} = require('./mobile-cdp-qa')

const BASE = process.env.PREDIA_MOBILE_URL || 'http://127.0.0.1:8082'
const USERNAME = process.env.PREDIA_QA_CLINICAL_USERNAME || 'dr_juan'
const PASSWORD = process.env.PREDIA_QA_CLINICAL_PASSWORD
const APPOINTMENT = process.env.PREDIA_QA_APPOINTMENT_REASON
const OUT = process.env.PREDIA_MOBILE_OUT || '/tmp/predia-mobile-agenda-lifecycle'
const WIDTH = Number(process.env.PREDIA_VIEWPORT_WIDTH || 320)
const HEIGHT = Number(process.env.PREDIA_VIEWPORT_HEIGHT || 844)

if (!PASSWORD || !APPOINTMENT) {
  console.error('Define PREDIA_QA_CLINICAL_PASSWORD y PREDIA_QA_APPOINTMENT_REASON.')
  process.exit(2)
}

fs.mkdirSync(OUT, { recursive: true })

async function clickControlWithin(c, label, context) {
  const clicked = await c.evalJs(`(() => {
    const label = ${JSON.stringify(label)}
    const context = ${JSON.stringify(context)}
    const controls = [...document.querySelectorAll('[role="button"], button, [tabindex="0"]')]
      .filter((element) => element.offsetParent !== null)
      .filter((element) => (element.innerText || element.textContent || '').trim().includes(label))
    const candidates = controls.map((element) => {
      let current = element
      let contextArea = Number.POSITIVE_INFINITY
      while (current && current !== document.body) {
        if ((current.innerText || current.textContent || '').includes(context)) {
          const rect = current.getBoundingClientRect()
          contextArea = Math.min(contextArea, Math.max(1, rect.width * rect.height))
        }
        current = current.parentElement
      }
      return { element, contextArea }
    }).filter((candidate) => Number.isFinite(candidate.contextArea))
      .sort((left, right) => left.contextArea - right.contextArea)
    const target = candidates[0]?.element
    if (!target) return false
    target.click()
    return true
  })()`)
  if (!clicked) throw new Error(`No se encontró "${label}" dentro de "${context}".`)
}

async function hasControlWithin(c, label, context) {
  return c.evalJs(`(() => {
    const label = ${JSON.stringify(label)}
    const context = ${JSON.stringify(context)}
    const areas = [...document.querySelectorAll('[role="button"], button, [tabindex="0"]')]
      .filter((element) => element.offsetParent !== null)
      .filter((element) => (element.innerText || element.textContent || '').trim().includes(label))
      .map((element) => {
        let current = element
        let contextArea = Number.POSITIVE_INFINITY
        while (current && current !== document.body) {
          if ((current.innerText || current.textContent || '').includes(context)) {
            const rect = current.getBoundingClientRect()
            contextArea = Math.min(contextArea, Math.max(1, rect.width * rect.height))
          }
          current = current.parentElement
        }
        return contextArea
      })
    return Math.min(...areas) <= innerWidth * innerHeight
  })()`)
}

async function fillPlaceholderAt(c, placeholder, index, value) {
  await c.evalJs(`(() => {
    const element = [...document.querySelectorAll('input, textarea')]
      .filter((input) => input.placeholder === ${JSON.stringify(placeholder)})[${index}]
    if (!element) throw new Error('No se encontró el campo ${placeholder} #${index}')
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set
    element.focus()
    if (setter) setter.call(element, ${JSON.stringify(value)})
    else element.value = ${JSON.stringify(value)}
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  })()`)
}

async function main() {
  const tab = await openTab(BASE)
  const c = client(tab.webSocketDebuggerUrl)
  await c.send('Page.enable')
  await c.send('Runtime.enable')
  await c.send('Network.enable')
  await c.send('Log.enable')
  await c.send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: true,
  })

  let dialogIndex = 0
  const dialogWatcher = setInterval(async () => {
    const dialogs = c.events.filter((event) => event.method === 'Page.javascriptDialogOpening')
    if (dialogs.length <= dialogIndex) return
    dialogIndex = dialogs.length
    await c.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => undefined)
  }, 50)

  try {
    await waitFor(c, 'document.body && document.body.innerText.length > 0')
    await c.evalJs('localStorage.clear()')
    await c.send('Page.navigate', { url: BASE })
    await waitFor(c, 'document.querySelector(\'input[placeholder="dr_juan"]\')')
    await fill(c, 'input[placeholder="dr_juan"]', USERNAME)
    await fill(c, 'input[placeholder="••••••••"]', PASSWORD)
    await clickText(c, 'Ingresar')
    await waitFor(c, "document.body.innerText.includes('Buenos') || document.body.innerText.includes('Agenda del día')", 45_000)

    if (!(await clickTab(c, 'Agenda'))) throw new Error('No se encontró la pestaña Agenda.')
    await waitFor(c, `document.body.innerText.includes(${JSON.stringify(APPOINTMENT)})`, 45_000)

    if (!(await hasControlWithin(c, 'Finalizar', APPOINTMENT))) {
      await clickControlWithin(c, 'Iniciar', APPOINTMENT)
      await waitFor(c, "document.body.innerText.includes('Consulta iniciada')", 45_000)
    }
    await shot(c, '01-consulta-iniciada')

    await clickControlWithin(c, 'Finalizar', APPOINTMENT)
    await waitFor(c, "document.querySelectorAll('input[placeholder=\"Opcional\"]').length >= 2 && document.querySelector('textarea[placeholder=\"Evolución, acuerdos o indicaciones\"]')")
    await fillPlaceholderAt(c, 'Opcional', 0, 'Seguimiento preventivo QA')
    await fillPlaceholderAt(c, 'Opcional', 1, 'Continuar plan clínico')
    await fillPlaceholderAt(c, 'Evolución, acuerdos o indicaciones', 0, 'Paciente estable. Se revisaron signos, tratamiento y próximos controles.')
    await shot(c, '02-cierre-clinico')
    await clickControlWithin(c, 'Finalizar', 'CIERRE CLÍNICO')
    await waitFor(c, "document.body.innerText.includes('Consulta finalizada')", 45_000)
    await wait(1_000)

    const result = {
      baseUrl: BASE,
      appointment: APPOINTMENT,
      finalScreen: await summarize(c, '03-consulta-finalizada'),
      issues: extractIssues(c.events),
    }
    fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result, null, 2))
  } finally {
    clearInterval(dialogWatcher)
    c.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
