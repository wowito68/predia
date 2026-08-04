#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
require_command obs

args=()
if [ "${1:-}" = "--start-recording" ]; then
  [ "${CONFIRM_SAFE_DESKTOP:-}" = "yes" ] || die \
    "Para iniciar grabacion define CONFIRM_SAFE_DESKTOP=yes despues de cerrar contenido sensible."
  args+=(--startrecording)
elif [ "$#" -gt 0 ]; then
  die "Uso: bash scripts/demo/launch-obs.sh [--start-recording]"
fi

nohup obs "${args[@]}" >/tmp/predia-demo-obs.log 2>&1 &
ok "OBS iniciado."
if [ "${#args[@]}" -eq 0 ]; then
  printf 'Revisa la fuente de captura y comienza manualmente cuando el escritorio sea seguro.\n'
else
  warn "Grabacion solicitada; detenla manualmente en OBS al llegar a 5:00."
fi
