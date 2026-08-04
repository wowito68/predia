#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
require_command curl
require_command python3

MODE="${1:-open}"
case "${MODE}" in
  open)
    "${DEMO_DIR}/open-grafana.sh"
    ;;
  --no-open)
    "${DEMO_DIR}/start-observability-tunnel.sh"
    ;;
  *)
    die "Uso: bash scripts/demo/grafana-live-pulse.sh [--no-open]"
    ;;
esac

query_cpu() {
  curl -fsS --get \
    --data-urlencode 'query=100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[1m])))' \
    "http://127.0.0.1:${PREDIA_DEMO_PROMETHEUS_PORT}/api/v1/query" |
    python3 -c '
import json
import sys

result = json.load(sys.stdin)["data"]["result"]
if not result:
    raise SystemExit("Prometheus no devolvio la metrica de CPU")
print(result[0]["value"][1])
'
}

section "Pulso controlado para Grafana"
printf 'Se generara carga de CPU limitada en la EC2 privada.\n'
printf 'No se modifican datos clinicos, la base de datos ni la configuracion del firewall.\n'
printf 'systemd detendra la carga automaticamente despues de 50 segundos.\n\n'

before="$(query_cpu)"
printf 'CPU antes del pulso: %.1f%%\n' "${before}"

unit="predia-grafana-pulse-$(date +%s)"
ssh_demo \
  "sudo systemd-run --quiet --collect --unit=${unit} --property=RuntimeMaxSec=50s --property=CPUQuota=85% /bin/bash -c 'while :; do :; done'"

cleanup_pulse() {
  ssh_demo "sudo systemctl stop ${unit}.service" >/dev/null 2>&1 || true
}
trap cleanup_pulse INT TERM

ssh_demo "sudo systemctl is-active --quiet ${unit}.service"
ok "Pulso ${unit} iniciado con limite de CPU y tiempo"

after="${before}"
detected=false
for attempt in $(seq 1 7); do
  printf '\rEsperando recopilacion de Prometheus: %2d/35 s' "$((attempt * 5))"
  sleep 5
  after="$(query_cpu)"
  if python3 - "${before}" "${after}" <<'PY'
import sys
raise SystemExit(0 if float(sys.argv[2]) >= float(sys.argv[1]) + 3 else 1)
PY
  then
    detected=true
    break
  fi
done
printf '\n'

if [ "${detected}" != true ]; then
  cleanup_pulse
  die "Prometheus no reflejo el incremento de CPU dentro de 35 segundos."
fi

printf 'CPU observada durante el pulso: %.1f%%\n' "${after}"
ok "Grafana recibe la nueva muestra; el panel CPU en vivo se actualiza cada 5 segundos"
printf 'La carga terminara sola y la grafica mostrara despues el descenso.\n'
