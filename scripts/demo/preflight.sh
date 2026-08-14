#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

RUN_TESTS=false
if [ "${1:-}" = "--run-tests" ]; then
  RUN_TESTS=true
elif [ "$#" -gt 0 ]; then
  die "Uso: bash scripts/demo/preflight.sh [--run-tests]"
fi

section "Herramientas locales"
for tool in curl openssl ssh git; do
  require_command "${tool}"
  ok "${tool}: $(command -v "${tool}")"
done

activate_node22
require_command node
require_command pnpm
ok "Node $(node --version)"
ok "pnpm $(pnpm --version)"

if command -v xdg-open >/dev/null 2>&1 || \
   command -v google-chrome >/dev/null 2>&1 || \
   command -v firefox >/dev/null 2>&1; then
  ok "Navegador disponible para abrir Grafana"
else
  warn "Grafana funciona, pero debera abrirse manualmente en el navegador."
fi

section "Repositorio"
cd "${ROOT_DIR}"
ok "Raiz: ${ROOT_DIR}"
ok "Commit local: $(git rev-parse --short HEAD)"
ok "Rama: $(git branch --show-current)"
if [ -n "$(git status --short --untracked-files=no)" ]; then
  warn "Hay cambios locales rastreados. No se modificaran ni publicaran durante la demo."
else
  ok "No hay cambios rastreados previos a la preparacion de demo"
fi

section "Acceso remoto de solo lectura"
[ -f "${PREDIA_DEMO_SSH_KEY}" ] || die "No existe la llave SSH configurada."
mode="$(stat -c '%a' "${PREDIA_DEMO_SSH_KEY}")"
if [ "$((10#${mode} % 100))" -ne 0 ]; then
  die "La llave SSH permite acceso a grupo/otros (modo ${mode}). Usa chmod 400 o 600."
fi
ok "Permisos de llave SSH: ${mode}"
if ssh_demo 'true'; then
  ok "Conexion SSH BatchMode disponible"
else
  ssh_access_hint "${PREDIA_DEMO_SSH_TARGET}"
  warn "Se continuara con pruebas publicas; las evidencias de Grafana/firewall remoto requieren autorizar la IP actual."
fi

section "Disponibilidad publica"
http_code="$(curl -sS -o /dev/null -w '%{http_code}' "http://${PREDIA_DEMO_DOMAIN}/")"
https_code="$(curl -sS -o /dev/null -w '%{http_code}' "https://${PREDIA_DEMO_DOMAIN}/")"
ready_code="$(curl -sS -o /dev/null -w '%{http_code}' "https://${PREDIA_DEMO_DOMAIN}/api/ready")"
[ "${http_code}" = "301" ] || die "HTTP no redirige con 301 (resultado ${http_code})."
[ "${https_code}" = "200" ] || die "La web HTTPS no responde 200 (resultado ${https_code})."
[ "${ready_code}" = "200" ] || die "Readiness no responde 200 (resultado ${ready_code})."
ok "HTTP 301 -> HTTPS"
ok "Web HTTPS 200"
ok "API readiness 200"

if [ "${RUN_TESTS}" = true ]; then
  "${DEMO_DIR}/security-tests.sh"
fi

section "Resultado"
ok "Preflight seguro completado; no se escribio en produccion."
