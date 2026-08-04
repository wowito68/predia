#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="${ROOT_DIR}/reports"
mkdir -p "${REPORT_DIR}"

set +e
bash "${ROOT_DIR}/scripts/verify-system.sh"
VERIFY_CODE=$?
set -e

node - "${REPORT_DIR}/verify-system.json" "${REPORT_DIR}/rubric-report.json" "${REPORT_DIR}/rubric-report.md" <<'NODE'
const fs = require('fs')
const [verifyPath, jsonPath, mdPath] = process.argv.slice(2)
const verify = fs.existsSync(verifyPath) ? JSON.parse(fs.readFileSync(verifyPath, 'utf8')) : { ok: false, checks: [] }
const passed = verify.checks.filter((c) => c.ok).length
const failed = verify.checks.length - passed
const report = {
  generatedAt: new Date().toISOString(),
  overall: verify.ok ? 'OK' : 'CON_FALLOS',
  passed,
  failed,
  checks: verify.checks,
  requiredDocs: [
    'docs/RUBRICA_CUMPLIMIENTO.md',
    'docs/SEGURIDAD_CRIPTOGRAFICA.md',
    'docs/AUTENTICACION_JWT.md',
    'docs/ARQUITECTURA_INFRAESTRUCTURA.md',
    'docs/MONITOREO.md',
    'docs/FIREWALL.md',
    'docs/SSL_HTTPS.md',
    'docs/BALANCEO_CARGA.md',
    'docs/GUIA_DEMOSTRACION.md'
  ].map((path) => ({ path, exists: fs.existsSync(path) })),
}
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2))
fs.writeFileSync(mdPath, [
  '# PREDIA - Rubric check',
  '',
  `Generado: ${report.generatedAt}`,
  `Estado general: ${report.overall}`,
  `Pruebas exitosas: ${passed}`,
  `Pruebas fallidas: ${failed}`,
  '',
  '## Checks',
  '',
  '| Check | Estado | Exit code |',
  '|---|---|---|',
  ...verify.checks.map((c) => `| ${c.id} | ${c.ok ? 'OK' : 'FALLO'} | ${c.exitCode} |`),
  '',
  '## Documentos requeridos',
  '',
  '| Documento | Existe |',
  '|---|---|',
  ...report.requiredDocs.map((d) => `| ${d.path} | ${d.exists ? 'SI' : 'NO'} |`),
  '',
].join('\n'))
process.exit(report.failed === 0 ? 0 : 1)
NODE

exit "${VERIFY_CODE}"
