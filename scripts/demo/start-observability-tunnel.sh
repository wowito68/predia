#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_command ssh
require_command curl
[ -f "${PREDIA_DEMO_SSH_KEY}" ] || die "No existe la llave SSH configurada."

if ssh -S "${PREDIA_DEMO_CONTROL_SOCKET}" -O check "${PREDIA_DEMO_SSH_TARGET}" >/dev/null 2>&1; then
  ok "El tunel de observabilidad ya esta activo"
  exit 0
fi

if [ -S "${PREDIA_DEMO_CONTROL_SOCKET}" ]; then
  warn "El socket de tunel existia pero no respondia; se limpiara."
  rm -f "${PREDIA_DEMO_CONTROL_SOCKET}"
fi

for port in "${PREDIA_DEMO_GRAFANA_PORT}" "${PREDIA_DEMO_PROMETHEUS_PORT}"; do
  if ss -H -lnt "sport = :${port}" | grep -q .; then
    if curl -fsS "http://127.0.0.1:${PREDIA_DEMO_GRAFANA_PORT}/api/health" >/dev/null 2>&1 && \
       curl -fsS "http://127.0.0.1:${PREDIA_DEMO_PROMETHEUS_PORT}/-/ready" >/dev/null 2>&1; then
      ok "Grafana y Prometheus ya responden en puertos locales; reutilizando tunel existente"
      exit 0
    fi
    warn "Puerto local ${port} ocupado por otro proceso:"
    ss -H -lntp "sport = :${port}" || true
    die "Libera el puerto o cambia PREDIA_DEMO_GRAFANA_PORT/PREDIA_DEMO_PROMETHEUS_PORT."
  fi
done

ssh_log="$(mktemp /tmp/predia-ssh-tunnel.XXXXXX.log)"
trap 'rm -f "${ssh_log}"' EXIT

if ! ssh \
  -i "${PREDIA_DEMO_SSH_KEY}" \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o ConnectTimeout=10 \
  -o ExitOnForwardFailure=yes \
  -M \
  -S "${PREDIA_DEMO_CONTROL_SOCKET}" \
  -fN \
  -L "127.0.0.1:${PREDIA_DEMO_GRAFANA_PORT}:127.0.0.1:3001" \
  -L "127.0.0.1:${PREDIA_DEMO_PROMETHEUS_PORT}:127.0.0.1:9090" \
  "${PREDIA_DEMO_SSH_TARGET}" 2>"${ssh_log}"; then
  cat "${ssh_log}" >&2
  ssh_access_hint "${PREDIA_DEMO_SSH_TARGET}"
  die "No se pudo abrir el tunel de observabilidad."
fi

for _attempt in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:${PREDIA_DEMO_PROMETHEUS_PORT}/-/ready" >/dev/null && \
     curl -fsS "http://127.0.0.1:${PREDIA_DEMO_GRAFANA_PORT}/api/health" >/dev/null; then
    ok "Tunel activo: Grafana 127.0.0.1:${PREDIA_DEMO_GRAFANA_PORT}"
    ok "Tunel activo: Prometheus 127.0.0.1:${PREDIA_DEMO_PROMETHEUS_PORT}"
    exit 0
  fi
  sleep 0.25
done

die "El tunel inicio, pero los servicios no respondieron a tiempo."
