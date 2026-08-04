#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="${ROOT_DIR}/reports"
EVIDENCE_DIR="${ROOT_DIR}/evidence"
API_BASE="${API_BASE:-http://127.0.0.1:3002}"
MOBILE_URL="${MOBILE_URL:-http://localhost:8082}"
mkdir -p "${REPORT_DIR}" "${EVIDENCE_DIR}"

STATUS_JSON="${REPORT_DIR}/verify-system.json"
: > "${REPORT_DIR}/verify-system.log"

run_check() {
  local id="$1"
  local command="$2"
  echo "== ${id}: ${command}" | tee -a "${REPORT_DIR}/verify-system.log"
  set +e
  bash -lc "${command}" >> "${REPORT_DIR}/verify-system.log" 2>&1
  local code=$?
  set -e
  echo "${id}:${code}" >> "${REPORT_DIR}/verify-system.status"
  return 0
}

rm -f "${REPORT_DIR}/verify-system.status"

run_check "node" "node --version"
run_check "pnpm" "pnpm --version"
run_check "web-tsc" "npx tsc -p apps/web/tsconfig.json --noEmit"
run_check "mobile-tsc" "npx tsc -p apps/mobile/tsconfig.json --noEmit"
run_check "web-tests" "pnpm --filter @predia/web exec jest --runInBand"
run_check "prisma-validate" "pnpm --filter @predia/web exec prisma validate"
run_check "api-health" "curl -fsS ${API_BASE}/api/health | tee ${EVIDENCE_DIR}/api-health.json"
run_check "api-metrics" "curl -fsS ${API_BASE}/api/metrics | tee ${EVIDENCE_DIR}/api-metrics.prom | grep -q predia_app_up"
run_check "mobile-url" "curl -fsS ${MOBILE_URL} >/dev/null"

node - "${REPORT_DIR}/verify-system.status" "${STATUS_JSON}" <<'NODE'
const fs = require('fs')
const [statusPath, outPath] = process.argv.slice(2)
const rows = fs.existsSync(statusPath)
  ? fs.readFileSync(statusPath, 'utf8').trim().split('\n').filter(Boolean)
  : []
const checks = rows.map((row) => {
  const [id, code] = row.split(':')
  return { id, ok: Number(code) === 0, exitCode: Number(code) }
})
const ok = checks.every((check) => check.ok)
fs.writeFileSync(outPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  ok,
  checks,
}, null, 2))
process.exit(ok ? 0 : 1)
NODE
