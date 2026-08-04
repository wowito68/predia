#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

: "${PREDIA_DEMO_PUBLIC_SSH_HOST:=ec2-52-15-133-69.us-east-2.compute.amazonaws.com}"
: "${PREDIA_DEMO_PRIVATE_SSH_HOST:=${PREDIA_DEMO_SSH_HOST}}"
: "${PREDIA_DEMO_PUBLIC_SSH_USER:=${PREDIA_DEMO_SSH_USER}}"
: "${PREDIA_DEMO_PRIVATE_SSH_USER:=${PREDIA_DEMO_SSH_USER}}"

MODE="${1:---private}"
case "${MODE}" in
  --private|--public|--both) ;;
  *) die "Uso: bash scripts/demo/ufw-status-demo.sh [--private|--public|--both]" ;;
esac

run_ufw_status() {
  local label="$1"
  local user="$2"
  local host="$3"

  section "UFW activo - ${label}"
  printf 'Servidor: %s@%s\n\n' "${user}" "${host}"
  ssh \
    -i "${PREDIA_DEMO_SSH_KEY}" \
    -o BatchMode=yes \
    -o IdentitiesOnly=yes \
    -o ConnectTimeout=10 \
    -o ServerAliveInterval=15 \
    -o ServerAliveCountMax=2 \
    "${user}@${host}" \
    'sudo ufw status verbose && sudo ufw status | grep -q "^Status: active"'
}

case "${MODE}" in
  --public)
    run_ufw_status "servidor publico" "${PREDIA_DEMO_PUBLIC_SSH_USER}" "${PREDIA_DEMO_PUBLIC_SSH_HOST}"
    ;;
  --both)
    run_ufw_status "servidor publico" "${PREDIA_DEMO_PUBLIC_SSH_USER}" "${PREDIA_DEMO_PUBLIC_SSH_HOST}"
    run_ufw_status "servidor privado" "${PREDIA_DEMO_PRIVATE_SSH_USER}" "${PREDIA_DEMO_PRIVATE_SSH_HOST}"
    ;;
  --private)
    run_ufw_status "servidor privado" "${PREDIA_DEMO_PRIVATE_SSH_USER}" "${PREDIA_DEMO_PRIVATE_SSH_HOST}"
    ;;
esac

section "Resultado"
ok "Reglas activas de UFW consultadas correctamente"
