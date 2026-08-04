const prometheusPort = process.env.PREDIA_DEMO_PROMETHEUS_PORT || "9090"
const grafanaPort = process.env.PREDIA_DEMO_GRAFANA_PORT || "3001"
const domain = process.env.PREDIA_DEMO_DOMAIN || "prediaa.duckdns.org"
const prometheus = `http://127.0.0.1:${prometheusPort}`

async function query(expression) {
  const response = await fetch(`${prometheus}/api/v1/query?query=${encodeURIComponent(expression)}`)
  if (!response.ok) throw new Error(`Prometheus respondio HTTP ${response.status}`)
  const body = await response.json()
  if (body.status !== "success") throw new Error("Prometheus no devolvio una consulta exitosa")
  return body.data.result[0]?.value?.[1] ?? null
}

function number(value, digits = 0) {
  if (value == null || Number.isNaN(Number(value))) return "sin datos"
  return Number(value).toFixed(digits)
}

async function replicaCount() {
  const replicas = new Set()
  for (let request = 0; request < 12; request += 1) {
    const response = await fetch(`https://${domain}/api/health`)
    if (!response.ok) throw new Error(`Health publico respondio HTTP ${response.status}`)
    const instance = response.headers.get("x-predia-instance")
    if (instance) replicas.add(instance)
  }
  return replicas.size
}

async function main() {
  const [allTargets, apiReplicas, memoryRatio, cpuRatio, grafanaResponse] = await Promise.all([
    query("sum(up)"),
    replicaCount(),
    query("1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)"),
    query('1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))'),
    fetch(`http://127.0.0.1:${grafanaPort}/api/health`),
  ])

  if (!grafanaResponse.ok) throw new Error(`Grafana respondio HTTP ${grafanaResponse.status}`)
  const grafana = await grafanaResponse.json()

  console.log("=== RESUMEN DE OBSERVABILIDAD ===")
  console.log(`Targets Prometheus disponibles: ${number(allTargets)}`)
  console.log(`Replicas API disponibles: ${number(apiReplicas)}`)
  console.log(`Memoria usada del servidor privado: ${number(Number(memoryRatio) * 100, 1)}%`)
  console.log(`CPU usada (promedio 5m): ${number(Number(cpuRatio) * 100, 1)}%`)
  console.log(`Grafana: ${grafana.database === "ok" ? "operativo" : "revisar"} (v${grafana.version || "n/d"})`)
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`)
  process.exitCode = 1
})
