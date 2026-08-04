#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

if ssh -S "${PREDIA_DEMO_CONTROL_SOCKET}" -O check "${PREDIA_DEMO_SSH_TARGET}" >/dev/null 2>&1; then
  ssh -S "${PREDIA_DEMO_CONTROL_SOCKET}" -O exit "${PREDIA_DEMO_SSH_TARGET}" >/dev/null
  ok "Tunel local cerrado"
else
  warn "No habia un tunel administrado por scripts/demo activo."
fi
