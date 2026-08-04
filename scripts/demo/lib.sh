#!/usr/bin/env bash

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${DEMO_DIR}/../.." && pwd)"

if [ -n "${PREDIA_DEMO_CONFIG:-}" ]; then
  if [ ! -f "${PREDIA_DEMO_CONFIG}" ]; then
    printf 'No existe PREDIA_DEMO_CONFIG=%s\n' "${PREDIA_DEMO_CONFIG}" >&2
    exit 1
  fi
  # El archivo local solo debe contener configuracion no sensible.
  # shellcheck source=/dev/null
  source "${PREDIA_DEMO_CONFIG}"
fi

: "${PREDIA_DEMO_DOMAIN:=prediaa.duckdns.org}"
: "${PREDIA_DEMO_SSH_HOST:=ec2-18-222-145-243.us-east-2.compute.amazonaws.com}"
: "${PREDIA_DEMO_SSH_USER:=ubuntu}"
: "${PREDIA_DEMO_SSH_KEY:=${HOME}/Descargas/PREDIA.pem}"
: "${PREDIA_DEMO_REMOTE_DIR:=/home/ubuntu/predia-private}"
: "${PREDIA_DEMO_GRAFANA_PORT:=3001}"
: "${PREDIA_DEMO_PROMETHEUS_PORT:=9090}"
: "${PREDIA_DEMO_TMUX_SESSION:=predia-demo}"

PREDIA_DEMO_SSH_TARGET="${PREDIA_DEMO_SSH_USER}@${PREDIA_DEMO_SSH_HOST}"
PREDIA_DEMO_CONTROL_SOCKET="/tmp/predia-demo-private-ssh-control"

section() {
  printf '\n\033[1;36m=== %s ===\033[0m\n' "$1"
}

ok() {
  printf '\033[32mOK\033[0m  %s\n' "$1"
}

warn() {
  printf '\033[33mAVISO\033[0m  %s\n' "$1" >&2
}

die() {
  printf '\033[31mERROR\033[0m  %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Falta el comando requerido: $1"
}

activate_node22() {
  local major=""
  if command -v node >/dev/null 2>&1; then
    major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
  fi
  if [ "${major}" = "22" ]; then
    return
  fi

  local candidate
  for candidate in "${HOME}"/.nvm/versions/node/v22*/bin; do
    if [ -x "${candidate}/node" ]; then
      export PATH="${candidate}:${PATH}"
      return
    fi
  done
  die "PREDIA requiere Node 22 y no se encontro una instalacion compatible."
}

ssh_demo() {
  ssh \
    -i "${PREDIA_DEMO_SSH_KEY}" \
    -o BatchMode=yes \
    -o IdentitiesOnly=yes \
    -o ConnectTimeout=10 \
    -o ServerAliveInterval=15 \
    -o ServerAliveCountMax=2 \
    "${PREDIA_DEMO_SSH_TARGET}" "$@"
}
