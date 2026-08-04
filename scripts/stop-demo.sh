#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="${ROOT_DIR}/.tmp/predia-demo"

for name in web mobile; do
  pid_file="${RUN_DIR}/${name}.pid"
  if [ -f "${pid_file}" ]; then
    target="$(cat "${pid_file}")"
    if [[ "${target}" == tmux:* ]]; then
      session="${target#tmux:}"
      if command -v tmux >/dev/null 2>&1 && tmux has-session -t "${session}" 2>/dev/null; then
        echo "Deteniendo ${name} (${session})..."
        tmux kill-session -t "${session}" || true
      fi
    elif kill -0 "${target}" 2>/dev/null; then
      echo "Deteniendo ${name} (${target})..."
      kill -- "-${target}" 2>/dev/null || kill "${target}" || true
    fi
    rm -f "${pid_file}"
  fi
done

if [ "${STOP_DB:-false}" = "true" ] && command -v docker >/dev/null 2>&1; then
  docker compose stop db
fi

echo "Demo detenida."
