#!/usr/bin/env node
// Recorre las pestañas del expediente del paciente 1, captura errores y verifica fondos de modales/dropdowns.
const d = require("./qa-driver.js")

const TABS = [
  "Resumen Clínico", "Consultas", "Recetas", "Documentos",
  "Patologías", "Alergias", "Vacunas", "Fracturas",
  "Heredofamiliares", "Imágenes", "Signos Vitales", "Riesgo Diabético",
]

;(async () => {
  const tab = await d.openTab(d.baseUrl + "/login")
  const c = d.createClient(tab.webSocketDebuggerUrl)
  await c.send("Page.enable"); await c.send("Runtime.enable"); await c.send("Log.enable"); await c.send("Network.enable")
  await c.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })

  const errors = []
  let cur = "/login"
  c.onEvent((m) => {
    if (m.method === "Runtime.exceptionThrown") errors.push(`[${cur}] EXC ${(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || "").slice(0,160)}`)
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") errors.push(`[${cur}] CONSOLE ${m.params.entry.text.slice(0,160)}`)
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400) errors.push(`[${cur}] ${m.params.response.status} ${m.params.response.url}`)
  })

  await c.send("Page.navigate", { url: d.baseUrl + "/login" })
  await d.waitFor(c, "document.readyState==='complete'")
  await d.fill(c, "#username", "admin_luis"); await d.fill(c, "#password", "password123")
  await c.evaluate("document.querySelector('form')?.requestSubmit()")
  await d.waitFor(c, "location.pathname==='/dashboard'", 30000)

  cur = "/pacientes/1/historial"
  await c.send("Page.navigate", { url: d.baseUrl + cur })
  await d.waitFor(c, "document.readyState==='complete'")
  await d.wait(3500)

  for (const t of TABS) {
    const clicked = await d.clickText(c, t)
    await d.wait(1500)
    const info = await c.evaluate(`(() => {
      const main = document.querySelector('main') || document.body
      const txt = main.innerText.replace(/\\s+/g,' ')
      // contar botones de acción visibles en el panel
      const addBtns = [...document.querySelectorAll('button')].filter(b=>/agregar|añadir|nuev|registrar|\\+/i.test(b.innerText)&&b.offsetParent!==null).map(b=>b.innerText.trim()).slice(0,6)
      return { len: txt.length, snippet: txt.slice(0,160), addBtns }
    })()`).catch(e=>({err:e.message}))
    console.log(`TAB ${t} (clicked=${clicked}):`, JSON.stringify(info))
    await d.screenshot(c, "exp-" + t.replace(/[^a-zA-Z]/g,"_"))
  }

  // Probar un modal "Agregar" en Alergias y revisar fondo
  await d.clickText(c, "Alergias"); await d.wait(1200)
  const opened = await c.evaluate(`(() => {
    const b=[...document.querySelectorAll('button')].find(x=>/agregar|añadir|nueva|registrar/i.test(x.innerText)&&x.offsetParent!==null)
    if(!b) return false; b.click(); return b.innerText.trim()
  })()`)
  await d.wait(1200)
  const dlg = await c.evaluate(`(() => {
    const el=document.querySelector('[role="dialog"]'); if(!el) return {present:false}
    const cs=getComputedStyle(el); return {present:true, bg:cs.backgroundColor, z:cs.zIndex, opacity:cs.opacity, text:el.innerText.replace(/\\s+/g,' ').slice(0,120)}
  })()`)
  console.log("ALERGIA MODAL open=", JSON.stringify(opened), "dialog=", JSON.stringify(dlg))
  await d.screenshot(c, "exp-modal-alergia")
  // cerrar
  await c.evaluate("document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
  await d.wait(500)

  console.log("\nERRORS:", errors.length)
  for (const e of errors.slice(0,30)) console.log("  " + e)
  c.close()
})().catch(e=>{console.error(e);process.exit(1)})
