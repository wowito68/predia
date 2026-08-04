#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="${ROOT_DIR}/.tmp/predia-demo"
WEB_PORT="${WEB_PORT:-3002}"
MOBILE_PORT="${MOBILE_PORT:-8082}"
API_URL="${API_URL:-http://127.0.0.1:${WEB_PORT}/api}"
WEB_SESSION="${WEB_SESSION:-predia-web-demo}"
MOBILE_SESSION="${MOBILE_SESSION:-predia-mobile-demo}"

mkdir -p "${RUN_DIR}" "${ROOT_DIR}/evidence/logs"
cd "${ROOT_DIR}"

echo "== PREDIA demo =="
echo "API:    http://127.0.0.1:${WEB_PORT}"
echo "Movil:  http://localhost:${MOBILE_PORT}"

if command -v docker >/dev/null 2>&1; then
  echo "Levantando MySQL de desarrollo..."
  docker compose up -d db
fi

echo "Generando Prisma y aplicando migraciones..."
pnpm --filter @predia/web exec prisma generate
pnpm --filter @predia/web exec prisma migrate deploy

if [ "${SEED:-true}" = "true" ]; then
  echo "Cargando datos demo..."
  pnpm --filter @predia/web db:seed
fi

start_process() {
  local name="$1"
  local session="$2"
  local pid_file="$3"
  local command="$4"

  if command -v tmux >/dev/null 2>&1; then
    if tmux has-session -t "${session}" 2>/dev/null; then
      echo "${name} ya esta ejecutandose."
    else
      echo "Iniciando ${name}..."
      tmux new-session -d -s "${session}" "${command}"
    fi
    echo "tmux:${session}" > "${pid_file}"
    return
  fi

  if [ -f "${pid_file}" ] && kill -0 "$(cat "${pid_file}")" 2>/dev/null; then
    echo "${name} ya esta ejecutandose."
  else
    echo "Iniciando ${name}..."
    setsid bash -lc "${command}" &
    echo $! > "${pid_file}"
  fi
}

if [ -f "${RUN_DIR}/web.pid" ] && kill -0 "$(cat "${RUN_DIR}/web.pid")" 2>/dev/null; then
  echo "Web/API ya esta ejecutandose."
else
  start_process "Web/API" "${WEB_SESSION}" "${RUN_DIR}/web.pid" "cd '${ROOT_DIR}' && pnpm --filter @predia/web exec next dev -p '${WEB_PORT}' > '${ROOT_DIR}/evidence/logs/web-demo.log' 2>&1"
fi

if [ -f "${RUN_DIR}/mobile.pid" ] && kill -0 "$(cat "${RUN_DIR}/mobile.pid")" 2>/dev/null; then
  echo "Expo Web ya esta ejecutandose."
else
  start_process "Expo Web" "${MOBILE_SESSION}" "${RUN_DIR}/mobile.pid" "cd '${ROOT_DIR}/apps/mobile' && EXPO_PUBLIC_API_URL='${API_URL}' npm run web -- --port '${MOBILE_PORT}' --host localhost > '${ROOT_DIR}/evidence/logs/mobile-demo.log' 2>&1"
fi

echo "Listo. Ejecuta: bash scripts/verify-system.sh"
