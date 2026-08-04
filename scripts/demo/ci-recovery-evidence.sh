#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

section "CI/CD versionado"
printf 'Workflow: .github/workflows/main.yml\n'
awk '
  /^jobs:/ { in_jobs=1; next }
  in_jobs && /^  [a-zA-Z0-9-]+:/ {
    name=$1
    sub(/:$/, "", name)
    print "  - " name
  }
' "${ROOT_DIR}/.github/workflows/main.yml"

section "Ultimas ejecuciones push en main"
curl -fsSL \
  'https://api.github.com/repos/wowito68/predia/actions/workflows/main.yml/runs?branch=main&event=push&per_page=5' |
  node -e '
    let input = ""
    process.stdin.on("data", (chunk) => { input += chunk })
    process.stdin.on("end", () => {
      const body = JSON.parse(input)
      for (const run of (body.workflow_runs || []).slice(0, 3)) {
        console.log(`  ${run.head_sha.slice(0, 7)}  ${run.status}/${run.conclusion || "pendiente"}  ${run.html_url}`)
      }
    })
  '

section "Backup y recuperacion como codigo"
grep -nE 'single-transaction|gzip -t|sha256sum' \
  "${ROOT_DIR}/scripts/backup/production-backup.sh"
grep -nE 'CONFIRM_RESTORE|sha256sum --check|SKIP_PRE_RESTORE_BACKUP' \
  "${ROOT_DIR}/scripts/restore/production-restore.sh"
grep -nE 'ROLLBACK_TAG|image inspect|api/ready' \
  "${ROOT_DIR}/scripts/deploy/rollback-production.sh"

printf '\nNo se ejecuto workflow, backup, restore, rollback ni despliegue.\n'
