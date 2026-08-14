#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

MODE="${1:-open}"
case "${MODE}" in
  open|--check) ;;
  *) die "Uso: bash scripts/demo/open-grafana.sh [--check]" ;;
esac

if ! "${DEMO_DIR}/start-observability-tunnel.sh"; then
  warn "Grafana no se pudo abrir porque el tunel SSH no esta disponible desde esta IP."
  printf 'Ejecuta primero: bash scripts/demo/ssh-access-doctor.sh check\n'
  exit 1
fi

dashboard_url="http://127.0.0.1:${PREDIA_DEMO_GRAFANA_PORT}/d/predia-overview/predia-salud-del-sistema?orgId=1&refresh=5s&from=now-5m&to=now"
curl -fsS "http://127.0.0.1:${PREDIA_DEMO_GRAFANA_PORT}/api/health" >/dev/null

if [ "${MODE}" = "--check" ]; then
  ok "Grafana esta listo en ${dashboard_url}"
  exit 0
fi

if command -v xdg-open >/dev/null 2>&1; then
  nohup xdg-open "${dashboard_url}" >/tmp/predia-grafana-browser.log 2>&1 &
elif command -v google-chrome >/dev/null 2>&1; then
  nohup google-chrome "${dashboard_url}" >/tmp/predia-grafana-browser.log 2>&1 &
elif command -v firefox >/dev/null 2>&1; then
  nohup firefox "${dashboard_url}" >/tmp/predia-grafana-browser.log 2>&1 &
else
  die "No se encontro navegador. Abre manualmente ${dashboard_url}"
fi

ok "Dashboard PREDIA abierto en Grafana"
printf 'El acceso viaja por un tunel SSH; Grafana no esta expuesto a Internet.\n'
