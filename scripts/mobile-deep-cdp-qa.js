#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
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
const PASSWORD = process.env.PREDIA_QA_CLINICAL_PASSWORD
const PATIENT_CURP = process.env.PREDIA_QA_PATIENT_CURP || 'ROGJ850515HMCRRN08'
const PATIENT_PIN = process.env.PREDIA_QA_PATIENT_PIN
const OUT = process.env.PREDIA_MOBILE_OUT || '/tmp/predia-mobile-deep-qa'
const WIDTH = Number(process.env.PREDIA_VIEWPORT_WIDTH || 320)
const HEIGHT = Number(process.env.PREDIA_VIEWPORT_HEIGHT || 844)
const SCREENSHOT_IMAGE = path.resolve(process.env.PREDIA_QA_IMAGE || 'apps/mobile/assets/icon.png')
const SAVE_VITALS = process.env.PREDIA_QA_SAVE_VITALS !== 'false'
const SAVE_AUTOMONITORING = process.env.PREDIA_QA_SAVE_AUTOMONITORING !== 'false'
const FLOW = process.env.PREDIA_QA_FLOW || 'all'

if (!PASSWORD || !PATIENT_PIN) {
  console.error('Define PREDIA_QA_CLINICAL_PASSWORD y PREDIA_QA_PATIENT_PIN.')
  process.exit(2)
}

fs.mkdirSync(OUT, { recursive: true })

function visibleFilter() {
  return `
    if (element.offsetParent === null || element.closest('[aria-hidden="true"]')) return false
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.pointerEvents !== 'none'
  `
}

async function clickAria(c, label) {
  const clicked = await c.evalJs(`(() => {
    const candidates = [...document.querySelectorAll('[aria-label=${JSON.stringify(label)}]')]
      .filter((element) => { ${visibleFilter()} })
    const target = candidates.at(-1)
    if (!target) return false
    target.scrollIntoView({ block: 'center', inline: 'nearest' })
    target.click()
    return true
  })()`)
  if (!clicked) throw new Error(`No se encontró el control accesible "${label}".`)
}

async function scrollToText(c, text) {
  const found = await c.evalJs(`(() => {
    const needle = ${JSON.stringify(text)}
    const candidates = [...document.querySelectorAll('[role="button"], button, [tabindex="0"], div, span')]
      .filter((element) => { ${visibleFilter()} })
      .filter((element) => (element.innerText || element.textContent || '').trim().includes(needle))
      .sort((left, right) => {
        const a = left.getBoundingClientRect()
        const b = right.getBoundingClientRect()
        return (a.width * a.height) - (b.width * b.height)
      })
    const target = candidates[0]
    if (!target) return false
    target.scrollIntoView({ block: 'center', inline: 'nearest' })
    return true
  })()`)
  if (!found) throw new Error(`No se encontró el texto "${text}".`)
  await wait(250)
}

async function clickCurrentText(c, text) {
  await scrollToText(c, text)
  if (!(await clickText(c, text))) throw new Error(`No se pudo pulsar "${text}".`)
  await wait(250)
}

async function goBack(c) {
  await clickAria(c, 'Volver')
  await wait(450)
}

async function setupTab() {
  const tab = await openTab(BASE)
  const c = client(tab.webSocketDebuggerUrl)
  await c.send('Page.enable')
  await c.send('Runtime.enable')
  await c.send('Network.enable')
  await c.send('Log.enable')
  await c.send('DOM.enable')
  await c.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: true })
  await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })

  const dialogState = { accept: true, index: 0, events: [] }
  const watcher = setInterval(async () => {
    const dialogs = c.events.filter((event) => event.method === 'Page.javascriptDialogOpening')
    if (dialogs.length <= dialogState.index) return
    const dialog = dialogs[dialogState.index]
    dialogState.index += 1
    dialogState.events.push({ message: dialog.params.message, accepted: dialogState.accept })
    await c.send('Page.handleJavaScriptDialog', { accept: dialogState.accept }).catch(() => undefined)
    dialogState.accept = true
  }, 40)

  await waitFor(c, 'document.body && document.body.innerText.length > 0')
  await c.evalJs('localStorage.clear()')
  await c.send('Page.navigate', { url: BASE })
  await waitFor(c, "document.body.innerText.includes('Iniciar sesion')")
  return { c, dialogState, close: () => { clearInterval(watcher); c.close() } }
}

async function loginStaff(c, username) {
  await fill(c, 'input[placeholder="dr_juan"]', username)
  await fill(c, 'input[placeholder="••••••••"]', PASSWORD)
  await clickCurrentText(c, 'Ingresar')
  await waitFor(c, "document.body.innerText.includes('JORNADA EN VIVO')", 45_000)
}

async function loginPatient(c) {
  await clickCurrentText(c, 'Paciente')
  await fill(c, 'input[placeholder="ROGJ850515HMCRRN08"]', PATIENT_CURP)
  await fill(c, 'input[placeholder="••••••"]', PATIENT_PIN)
  await clickCurrentText(c, 'Ingresar')
  await waitFor(c, "document.body.innerText.includes('Tu panorama clínico') || document.body.innerText.includes('No pudimos cargar tu resumen')", 45_000)
}

async function openJuan(c) {
  if (!(await clickTab(c, 'Pacientes'))) throw new Error('No se encontró la pestaña Pacientes.')
  await waitFor(c, "document.body.innerText.includes('Juan Rodríguez')", 45_000)
  await clickCurrentText(c, 'Juan Rodríguez')
  await waitFor(c, "document.body.innerText.includes('Resumen clínico')", 45_000)
}

async function chooseClinicalImage(c) {
  await c.send('Page.setInterceptFileChooserDialog', { enabled: true })
  const before = c.events.filter((event) => event.method === 'Page.fileChooserOpened').length
  await clickCurrentText(c, 'Tomar o elegir foto')
  const start = Date.now()
  while (Date.now() - start < 10_000) {
    const events = c.events.filter((event) => event.method === 'Page.fileChooserOpened')
    if (events.length > before) {
      await c.send('DOM.setFileInputFiles', { files: [SCREENSHOT_IMAGE], backendNodeId: events.at(-1).params.backendNodeId })
      await waitFor(c, "document.body.innerText.includes('Cambiar foto')", 15_000)
      await c.send('Page.setInterceptFileChooserDialog', { enabled: false })
      return
    }
    await wait(100)
  }
  throw new Error('No se abrió el selector de imagen clínica.')
}

async function capture(report, c, name) {
  report.push(await summarize(c, name))
}

async function doctorFlow() {
  const session = await setupTab()
  const { c, dialogState } = session
  const report = []
  try {
    await loginStaff(c, process.env.PREDIA_QA_CLINICAL_USERNAME || 'dr_juan')
    await capture(report, c, 'doctor-01-inicio')

    await clickCurrentText(c, 'Validar IA')
    await waitFor(c, "document.body.innerText.includes('Revisión clínica asistida por IA')", 30_000)
    await capture(report, c, 'doctor-02-validacion-ia')
    dialogState.accept = false
    if (await c.evalJs("document.body.innerText.includes('Confirmar')")) {
      await clickCurrentText(c, 'Confirmar')
      await wait(300)
    }
    await goBack(c)

    if (!(await clickTab(c, 'Agenda'))) throw new Error('No se encontró Agenda.')
    await waitFor(c, "document.body.innerText.includes('Agendadas')", 30_000)
    await clickAria(c, 'Agendar cita')
    await waitFor(c, "document.body.innerText.includes('NUEVA ATENCIÓN')")
    await capture(report, c, 'doctor-03-agenda-crear')
    await clickAria(c, 'Cerrar formulario de cita')

    await clickCurrentText(c, 'Gestionar')
    await waitFor(c, "document.body.innerText.includes('GESTIÓN DE CITA')")
    await capture(report, c, 'doctor-04-agenda-gestionar')
    await clickCurrentText(c, 'Editar datos')
    await waitFor(c, "document.body.innerText.includes('EDITAR ATENCIÓN')")
    await capture(report, c, 'doctor-05-agenda-editar')
    await clickAria(c, 'Cerrar edición de cita')

    await clickCurrentText(c, 'Gestionar')
    await waitFor(c, "document.body.innerText.includes('GESTIÓN DE CITA')")
    await clickCurrentText(c, 'Reagendar')
    await waitFor(c, "document.body.innerText.includes('REAGENDAR ATENCIÓN')")
    await capture(report, c, 'doctor-06-agenda-reagendar')
    await clickAria(c, 'Cerrar edición de cita')

    await clickCurrentText(c, 'Gestionar')
    await waitFor(c, "document.body.innerText.includes('GESTIÓN DE CITA')")
    await clickCurrentText(c, 'Cancelar cita')
    await waitFor(c, "document.body.innerText.includes('CANCELACIÓN')")
    await capture(report, c, 'doctor-07-agenda-cancelar')
    await clickCurrentText(c, 'Conservar')

    await openJuan(c)
    await capture(report, c, 'doctor-08-paciente')

    await clickCurrentText(c, 'Nueva medición')
    await waitFor(c, "document.body.innerText.includes('Signos vitales')")
    await fill(c, 'input[placeholder="82.0"]', '81.8')
    await fill(c, 'input[placeholder="1.72"]', '1.72')
    await fill(c, 'input[placeholder="132"]', '128')
    await fill(c, 'input[placeholder="86"]', '82')
    await fill(c, 'input[placeholder="94"]', '93')
    await fill(c, 'input[placeholder="102"]', '101')
    await fill(c, 'textarea[placeholder="Notas adicionales..."]', 'Registro de control QA móvil; paciente estable.')
    await capture(report, c, 'doctor-09-signos-formulario')
    if (SAVE_VITALS) {
      await clickCurrentText(c, 'Guardar signos vitales')
      await waitFor(c, "document.body.innerText.includes('Medición registrada')", 30_000)
      await shot(c, 'doctor-10-signos-guardados')
      await wait(1_100)
    } else {
      await goBack(c)
    }

    await clickCurrentText(c, 'Ver historial')
    await waitFor(c, "document.body.innerText.includes('LÍNEA DE TIEMPO') || document.body.innerText.includes('Historial clínico')", 30_000)
    await capture(report, c, 'doctor-11-historial')
    await goBack(c)

    await clickCurrentText(c, 'Adjuntar foto clínica')
    await waitFor(c, "document.body.innerText.includes('Captura clínica')")
    await chooseClinicalImage(c)
    await capture(report, c, 'doctor-12-foto-preview')
    await goBack(c)

    await clickCurrentText(c, 'Nueva consulta')
    await waitFor(c, "document.body.innerText.includes('Transcripción')")
    await capture(report, c, 'doctor-13-dictado')
    await goBack(c)

    await clickCurrentText(c, 'Nueva receta')
    await waitFor(c, "document.body.innerText.includes('Firma de receta')")
    await fill(c, 'input[placeholder="Medicamento (ej. Metformina)"]', 'Metformina QA')
    await fill(c, 'input[placeholder="Dosis (850 mg)"]', '500 mg')
    await fill(c, 'input[placeholder="Frecuencia (c/12h)"]', 'c/12h')
    await fill(c, 'input[placeholder="Duración (30 días)"]', '7 días')
    await clickCurrentText(c, 'Agregar medicamento')
    await waitFor(c, "document.body.innerText.includes('Metformina QA')")
    await clickAria(c, 'Eliminar Metformina QA')
    await fill(c, 'input[placeholder="Medicamento (ej. Metformina)"]', 'Metformina QA')
    await fill(c, 'input[placeholder="Dosis (850 mg)"]', '500 mg')
    await fill(c, 'input[placeholder="Frecuencia (c/12h)"]', 'c/12h')
    await fill(c, 'input[placeholder="Duración (30 días)"]', '7 días')
    await clickCurrentText(c, 'Agregar medicamento')
    await capture(report, c, 'doctor-14-receta-formulario')
    dialogState.accept = false
    await clickCurrentText(c, 'Firmar con biometría y emitir')
    await wait(350)
    await goBack(c)
    await goBack(c)

    if (!(await clickTab(c, 'Perfil'))) throw new Error('No se encontró Perfil.')
    await waitFor(c, "document.body.innerText.includes('Notificaciones')")
    await capture(report, c, 'doctor-15-perfil')
    for (const action of ['Notificaciones', 'Seguridad', 'Acerca de PREDIA']) {
      await clickCurrentText(c, action)
      await wait(150)
    }
    dialogState.accept = false
    await clickCurrentText(c, 'Cerrar sesión')
    await wait(250)

    return { report, dialogs: dialogState.events, issues: extractIssues(c.events) }
  } finally {
    session.close()
  }
}

async function nurseFlow() {
  const session = await setupTab()
  const { c } = session
  const report = []
  try {
    await loginStaff(c, process.env.PREDIA_QA_NURSE_USERNAME || 'enf_pedro')
    await capture(report, c, 'nurse-01-inicio')
    await openJuan(c)
    await capture(report, c, 'nurse-02-paciente')
    const forbidden = await c.evalJs("['Nueva consulta','Nueva receta','Validar IA'].filter((label) => document.body.innerText.includes(label))")
    if (forbidden.length) throw new Error(`Acciones médicas visibles para enfermería: ${forbidden.join(', ')}`)
    await clickCurrentText(c, 'Adjuntar foto clínica')
    await waitFor(c, "document.body.innerText.includes('Captura clínica')")
    await capture(report, c, 'nurse-03-foto-clinica')
    await goBack(c)
    await clickCurrentText(c, 'Nueva medición')
    await waitFor(c, "document.body.innerText.includes('Signos vitales')")
    await capture(report, c, 'nurse-04-signos')
    await goBack(c)
    await clickCurrentText(c, 'Ver historial')
    await waitFor(c, "document.body.innerText.includes('Historial clínico')")
    await capture(report, c, 'nurse-05-historial')
    await goBack(c)
    await goBack(c)
    if (!(await clickTab(c, 'Agenda'))) throw new Error('Agenda no disponible para enfermería.')
    await waitFor(c, "document.body.innerText.includes('Agendadas')")
    await capture(report, c, 'nurse-06-agenda')
    if (!(await clickTab(c, 'Perfil'))) throw new Error('Perfil no disponible para enfermería.')
    await capture(report, c, 'nurse-07-perfil')
    return { report, issues: extractIssues(c.events) }
  } finally {
    session.close()
  }
}

async function adminFlow() {
  const session = await setupTab()
  const { c } = session
  const report = []
  try {
    await loginStaff(c, process.env.PREDIA_QA_ADMIN_USERNAME || 'admin_luis')
    await capture(report, c, 'admin-01-inicio')
    for (const tab of ['Agenda', 'Pacientes', 'Alertas', 'Perfil']) {
      if (!(await clickTab(c, tab))) throw new Error(`Pestaña ${tab} no disponible para administración.`)
      await wait(600)
      await capture(report, c, `admin-${tab.toLowerCase()}`)
    }
    return { report, issues: extractIssues(c.events) }
  } finally {
    session.close()
  }
}

async function patientFlow() {
  const session = await setupTab()
  const { c, dialogState } = session
  const report = []
  try {
    await loginPatient(c)
    await capture(report, c, 'patient-01-inicio')

    await clickCurrentText(c, 'Expediente')
    await waitFor(c, "document.body.innerText.includes('Mi expediente')")
    for (const tab of ['Alergias', 'Patologías', 'Consultas', 'Todo']) {
      if (!(await clickText(c, tab))) throw new Error(`No se pudo activar la categoría ${tab}.`)
      await wait(150)
    }
    await capture(report, c, 'patient-02-expediente')
    await goBack(c)

    await clickCurrentText(c, 'Registrar')
    await waitFor(c, "document.body.innerText.includes('Automonitoreo')")
    await fill(c, 'input[placeholder="Ej. 110 (mg/dL)"]', '112')
    if (SAVE_AUTOMONITORING) {
      await clickAria(c, 'Registrar Glucosa capilar')
      await waitFor(c, "document.body.innerText.includes('Registro guardado')", 30_000)
    }
    await capture(report, c, 'patient-03-automonitoreo')
    await goBack(c)

    if (!(await clickTab(c, 'Indicadores'))) throw new Error('No se encontró Indicadores.')
    await waitFor(c, "document.body.innerText.includes('Mis indicadores')")
    await capture(report, c, 'patient-04-indicadores')
    await clickCurrentText(c, 'Ver tendencias')
    await waitFor(c, "document.body.innerText.includes('Evolución de tus indicadores')")
    for (const period of ['7 días', '30 días', '90 días']) await clickCurrentText(c, period)
    await capture(report, c, 'patient-05-tendencias')
    await goBack(c)

    if (!(await clickTab(c, 'Consejos'))) throw new Error('No se encontró Consejos.')
    await waitFor(c, "document.body.innerText.includes('Qué puedes hacer ahora') || document.body.innerText.includes('Sin indicaciones registradas')")
    await clickCurrentText(c, 'Entender mi resultado')
    await waitFor(c, "document.body.innerText.includes('Mis resultados IA')")
    await capture(report, c, 'patient-06-resultados')
    await goBack(c)
    await clickCurrentText(c, 'Revisar próximas citas')
    await waitFor(c, "document.body.innerText.includes('Mis citas')")
    await capture(report, c, 'patient-07-citas')
    await goBack(c)

    if (!(await clickTab(c, 'Inicio'))) throw new Error('No se encontró Inicio.')
    dialogState.accept = false
    await clickAria(c, 'Cerrar sesión')
    await wait(250)
    return { report, dialogs: dialogState.events, issues: extractIssues(c.events) }
  } finally {
    session.close()
  }
}

async function main() {
  const result = {
    baseUrl: BASE,
    viewport: { width: WIDTH, height: HEIGHT },
  }
  const run = async (name, flow) => {
    if (FLOW !== 'all' && FLOW !== name) return
    result[name] = await flow()
    fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(result, null, 2))
  }
  await run('doctor', doctorFlow)
  await run('nurse', nurseFlow)
  await run('admin', adminFlow)
  await run('patient', patientFlow)
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
