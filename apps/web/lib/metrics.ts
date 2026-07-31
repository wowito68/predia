type AuthRole = "usuario" | "paciente"

const startedAt = Date.now()

const globalMetrics = globalThis as unknown as {
  prediaMetrics?: {
    authAttempts: Record<string, number>
    httpRequests: Record<string, number>
    httpDurations: Record<string, number>
  }
}

const metrics = globalMetrics.prediaMetrics ?? {
  authAttempts: {},
  httpRequests: {},
  httpDurations: {},
}

if (!globalMetrics.prediaMetrics) globalMetrics.prediaMetrics = metrics

function inc(map: Record<string, number>, key: string, value = 1) {
  map[key] = (map[key] ?? 0) + value
}

export function recordAuthAttempt(role: AuthRole, success: boolean) {
  inc(metrics.authAttempts, `${role}:${success ? "success" : "failure"}`)
}

export async function measureHttp<T>(
  route: string,
  method: string,
  fn: () => Promise<{ status: number; value: T }>,
): Promise<T> {
  const started = Date.now()
  try {
    const result = await fn()
    const labels = `${method}:${route}:${result.status}`
    inc(metrics.httpRequests, labels)
    inc(metrics.httpDurations, labels, Date.now() - started)
    return result.value
  } catch (error) {
    const labels = `${method}:${route}:500`
    inc(metrics.httpRequests, labels)
    inc(metrics.httpDurations, labels, Date.now() - started)
    throw error
  }
}

function line(name: string, labels: Record<string, string>, value: number) {
  const labelText = Object.entries(labels)
    .map(([key, labelValue]) => `${key}="${labelValue.replace(/"/g, '\\"')}"`)
    .join(",")
  return `${name}{${labelText}} ${value}`
}

export function renderPrometheusMetrics() {
  const memory = process.memoryUsage()
  const lines = [
    "# HELP predia_app_up PREDIA application health flag.",
    "# TYPE predia_app_up gauge",
    "predia_app_up 1",
    "# HELP predia_app_uptime_seconds PREDIA process uptime in seconds.",
    "# TYPE predia_app_uptime_seconds gauge",
    `predia_app_uptime_seconds ${Math.floor((Date.now() - startedAt) / 1000)}`,
    "# HELP predia_process_memory_bytes Node.js process memory usage.",
    "# TYPE predia_process_memory_bytes gauge",
    line("predia_process_memory_bytes", { type: "rss" }, memory.rss),
    line("predia_process_memory_bytes", { type: "heap_used" }, memory.heapUsed),
    line("predia_process_memory_bytes", { type: "heap_total" }, memory.heapTotal),
    "# HELP predia_auth_attempts_total Authentication attempts by role and result.",
    "# TYPE predia_auth_attempts_total counter",
  ]

  for (const [key, value] of Object.entries(metrics.authAttempts)) {
    const [role, result] = key.split(":")
    lines.push(line("predia_auth_attempts_total", { role, result }, value))
  }

  lines.push("# HELP predia_http_requests_total HTTP requests observed by instrumented API routes.")
  lines.push("# TYPE predia_http_requests_total counter")
  for (const [key, value] of Object.entries(metrics.httpRequests)) {
    const [method, route, status] = key.split(":")
    lines.push(line("predia_http_requests_total", { method, route, status }, value))
  }

  lines.push("# HELP predia_http_request_duration_ms_sum Sum of HTTP durations in milliseconds by instrumented route.")
  lines.push("# TYPE predia_http_request_duration_ms_sum counter")
  for (const [key, value] of Object.entries(metrics.httpDurations)) {
    const [method, route, status] = key.split(":")
    lines.push(line("predia_http_request_duration_ms_sum", { method, route, status }, value))
  }

  return `${lines.join("\n")}\n`
}

