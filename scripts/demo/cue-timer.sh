#!/usr/bin/env bash
set -euo pipefail

start="$(date +%s)"
printf '\033[1;36mPREDIA DEMO 5:00 - INICIO\033[0m\n'

cue() {
  local target="$1"
  local label="$2"
  local now elapsed wait
  now="$(date +%s)"
  elapsed="$((now - start))"
  wait="$((target - elapsed))"
  if [ "${wait}" -gt 0 ]; then
    sleep "${wait}"
  fi
  printf '\a\033[1;33m%02d:%02d  %s\033[0m\n' "$((target / 60))" "$((target % 60))" "${label}"
}

cue 40  "Aplicacion web"
cue 100 "Seguridad"
cue 160 "Infraestructura y HTTPS"
cue 210 "Balanceo y monitoreo"
cue 270 "Cierre"
cue 300 "FIN - detener grabacion"
