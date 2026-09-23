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
  extractIssues,
} = require('./mobile-cdp-qa')


const BASE = process.env.PREDIA_MOBILE_URL || 'http://127.0.0.1:8082'
const OUT = process.env.PREDIA_MOBILE_OUT || '/tmp/predia-ensanut-mobile-qa'
const USERNAME = process.env.PREDIA_QA_CLINICAL_USERNAME || 'dr_juan'
const PASSWORD = process.env.PREDIA_QA_CLINICAL_PASSWORD || 'password123'
const COLOR_SCHEME = process.env.PREDIA_COLOR_SCHEME || 'light'
fs.mkdirSync(OUT, { recursive: true })


async function scrollToText(c, text) {
  const found = await c.evalJs(`(() => {
    const needle = ${JSON.stringify(text)}
    const elements = [...document.querySelectorAll('[role="button"], button, [tabindex="0"], div, span')]
      .filter((element) => element.offsetParent !== null)
      .filter((element) => (element.innerText || element.textContent || '').trim().includes(needle))
      .sort((left, right) => {
        const a = left.getBoundingClientRect()
        const b = right.getBoundingClientRect()
        return (a.width * a.height) - (b.width * b.height)
      })
    if (!elements[0]) return false
    elements[0].scrollIntoView({ block: 'center', inline: 'nearest' })
    return true
  })()`)
  if (!found) throw new Error(`No se encontró el texto: ${text}`)
  await wait(350)
}


async function clickVisibleText(c, text) {
  await scrollToText(c, text)
  if (!(await clickText(c, text))) throw new Error(`No se pudo pulsar: ${text}`)
  await wait(350)
}


async function resetVisibleScroll(c) {
  await c.evalJs(`(() => {
    window.scrollTo(0, 0)
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0
    for (const element of document.querySelectorAll('*')) {
      if (element.scrollTop > 0) element.scrollTop = 0
      if (element.scrollLeft > 0) element.scrollLeft = 0
    }
  })()`)
  await wait(250)
}


async function viewportAudit(c, label) {
  return c.evalJs(`(() => {
    const viewportWidth = document.documentElement.clientWidth
    const bodyOverflow = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - viewportWidth
    const offenders = [...document.querySelectorAll('body *')]
      .filter((element) => element.offsetParent !== null)
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName,
          text: (element.innerText || element.textContent || '').trim().slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        }
      })
      .filter((item) => item.width > 0 && (item.left < -2 || item.right > viewportWidth + 2))
      .slice(0, 20)
    return { label: ${JSON.stringify(label)}, viewportWidth, bodyOverflow, offenders }
  })()`)
}


async function main() {
  const tab = await openTab(BASE)
  const c = client(tab.webSocketDebuggerUrl)
  const screenshots = []
  const audits = []

  try {
    await c.send('Page.enable')
    await c.send('Runtime.enable')
    await c.send('Network.enable')
    await c.send('Log.enable')
    await c.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    })
    await c.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: COLOR_SCHEME }],
    })

    await waitFor(c, "document.body && document.body.innerText.length > 0", 60_000)
    await c.evalJs('localStorage.clear(); sessionStorage.clear()')
    await c.send('Page.navigate', { url: `${BASE}?ensanutQa=${Date.now()}` })
    await waitFor(c, "document.body.innerText.includes('Iniciar sesion')", 60_000)
    await clickVisibleText(c, 'Personal clínico')
    await fill(c, 'input[placeholder="dr_juan"]', USERNAME)
    await fill(c, 'input[placeholder="••••••••"]', PASSWORD)
    await clickVisibleText(c, 'Ingresar')
    await waitFor(c, "document.body.innerText.includes('JORNADA EN VIVO')", 60_000)

    if (!(await clickTab(c, 'Pacientes'))) throw new Error('No se encontró la pestaña Pacientes.')
    await waitFor(c, "document.body.innerText.includes('Juan Rodríguez')", 60_000)
    await clickVisibleText(c, 'Juan Rodríguez')
    await waitFor(c, "document.body.innerText.includes('Resumen clínico')", 60_000)
    await waitFor(c, "document.body.innerText.includes('Tamizaje ENSANUT')", 60_000)
    await scrollToText(c, 'Tamizaje ENSANUT')
    screenshots.push(await shot(c, '01-expediente-integracion'))
    audits.push(await viewportAudit(c, 'expediente'))

    await clickVisibleText(c, 'Tamizaje ENSANUT')
    await waitFor(c, "document.body.innerText.includes('Prototipo de investigación')", 60_000)
    await resetVisibleScroll(c)
    screenshots.push(await shot(c, '02-tamizaje-formulario'))
    audits.push(await viewportAudit(c, 'formulario'))

    await fill(c, 'input[placeholder="45"]', '66')
    await fill(c, 'input[placeholder="27.8"]', '35')
    await fill(c, 'input[placeholder="94"]', '112')
    await c.evalJs(`(() => {
      const yesButtons = [...document.querySelectorAll('[role="button"], button, [tabindex="0"]')]
        .filter((element) => element.offsetParent !== null)
        .filter((element) => (element.innerText || element.textContent || '').trim() === 'Sí')
      if (yesButtons.length < 2) throw new Error('Faltan controles Sí para antecedentes')
      yesButtons[0].click()
      yesButtons[1].click()
    })()`)
    await clickVisibleText(c, 'Evaluar prioridad de confirmación')
    await waitFor(c, "document.body.innerText.includes('Evidencia temporal')", 60_000)
    await scrollToText(c, 'Conviene solicitar pruebas')
    screenshots.push(await shot(c, '03-tamizaje-resultado'))
    audits.push(await viewportAudit(c, 'resultado'))

    await scrollToText(c, 'Evidencia temporal')
    screenshots.push(await shot(c, '04-evidencia-temporal'))
    audits.push(await viewportAudit(c, 'evidencia-temporal'))

    const assertions = await c.evalJs(`(() => ({
      prioritizesConfirmation: document.body.innerText.includes('PRIORIZAR CONFIRMACIÓN'),
      includesClinicalLimit: document.body.innerText.includes('No diagnostica diabetes'),
      includesTemporalEvidence: document.body.innerText.includes('ENSANUT 2021'),
      includesLockedVersion: document.body.innerText.includes('ensanut-temporal-core-spline-v1'),
    }))()`)
    const issues = extractIssues(c.events)
    const actionableConsoleErrors = issues.consoleErrors.filter((item) =>
      !item.includes('props.pointerEvents is deprecated'),
    )
    const unexpectedNetworkFailures = issues.failedRequests.filter((item) => !item.includes('favicon'))
    const result = {
      baseUrl: BASE,
      colorScheme: COLOR_SCHEME,
      viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
      assertions,
      screenshots,
      audits,
      issues: {
        ...issues,
        consoleErrors: actionableConsoleErrors,
        ignoredDependencyWarnings: issues.consoleErrors.filter((item) =>
          item.includes('props.pointerEvents is deprecated'),
        ),
        failedRequests: unexpectedNetworkFailures,
      },
    }
    fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result, null, 2))

    const assertionsPass = Object.values(assertions).every(Boolean)
    const overflowFree = audits.every((audit) => audit.bodyOverflow <= 2 && audit.offenders.length === 0)
    const issueFree = actionableConsoleErrors.length === 0 && unexpectedNetworkFailures.length === 0 && issues.exceptions.length === 0
    if (!assertionsPass || !overflowFree || !issueFree) process.exitCode = 2
  } finally {
    c.close()
  }
}


main().catch((error) => {
  console.error(error)
  process.exit(1)
})
