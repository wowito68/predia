#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

cleanup() {
  "${DEMO_DIR}/stop-observability-tunnel.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

section "Sintaxis de scripts"
for script in "${DEMO_DIR}"/*.sh; do
  bash -n "${script}"
done
ok "Todos los scripts Bash tienen sintaxis valida"

expected_cues="40 100 160 210 270 300"
actual_cues="$(awk '$1 == "cue" { print $2 }' "${DEMO_DIR}/cue-timer.sh" | paste -sd ' ' -)"
[ "${actual_cues}" = "${expected_cues}" ] || die \
  "Los hitos del temporizador no terminan en 5:00 (${actual_cues})."
ok "Temporizador validado: seis hitos y cierre exacto en 300 segundos"

"${DEMO_DIR}/preflight.sh" --run-tests
"${DEMO_DIR}/production-readonly.sh" all
"${DEMO_DIR}/ci-recovery-evidence.sh"
"${DEMO_DIR}/start-observability-tunnel.sh"
activate_node22
node "${DEMO_DIR}/monitoring-summary.mjs"

section "Validacion final"
ok "Ensayo tecnico completado sin escrituras en produccion."
