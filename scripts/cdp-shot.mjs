// Targeted screenshotter: node cdp-shot.mjs <route> <outfile> [dark] [waitMs]
import fs from "node:fs"
const BASE = "http://127.0.0.1:3002", CDP = "http://127.0.0.1:9222"
const [route, outfile, mode = "light", waitMs = "6000"] = process.argv.slice(2)
const dark = mode === "dark"
const login = await (await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "dr_juan", password: "password123" }) })).json()
const tab = await (await fetch(CDP + "/json/new?" + encodeURIComponent("about:blank"), { method: "PUT" })).json()
const ws = new WebSocket(tab.webSocketDebuggerUrl)
const pending = new Map(); let id = 0
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result); pending.delete(m.id) } })
await new Promise((r) => ws.addEventListener("open", r))
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, { resolve: r }); ws.send(JSON.stringify({ id: i, method, params })) })
await send("Page.enable")
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: Number(process.env.H || 1000), deviceScaleFactor: 1, mobile: false })
await send("Page.navigate", { url: BASE + "/login" })
await new Promise((r) => setTimeout(r, 1500))
await send("Runtime.evaluate", {
  expression: `localStorage.setItem('token', ${JSON.stringify(login.token)});
    localStorage.setItem('user', ${JSON.stringify(JSON.stringify(login.user))});
    localStorage.setItem('authenticated','true');
    localStorage.setItem('userRole', ${JSON.stringify(login.user.rol)});
    localStorage.setItem('theme', ${JSON.stringify(dark ? "dark" : "light")});`,
})
await send("Page.navigate", { url: BASE + route })
await new Promise((r) => setTimeout(r, Number(waitMs)))
const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true })
fs.writeFileSync(outfile, Buffer.from(shot.data, "base64"))
console.log("saved", outfile)
ws.close(); process.exit(0)
