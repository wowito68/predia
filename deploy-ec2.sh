#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${PREDIA_ENV_FILE:-${ROOT_DIR}/.env.production}"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.production.yml"
export COMPOSE_PROGRESS=plain
export BUILDKIT_PROGRESS=plain

read_env() {
  local key="$1"
  awk -F= -v key="${key}" '
    $0 !~ /^[[:space:]]*#/ && $1 == key {
      value = substr($0, index($0, "=") + 1)
      gsub(/^[[:space:]"'\'' ]+|[[:space:]"'\'' ]+$/, "", value)
      print value
      exit
    }
  ' "${ENV_FILE}"
}

if [ ! -f "${ENV_FILE}" ]; then
  echo "Falta ${ENV_FILE}. Crea el archivo desde .env.production.example." >&2
  exit 1
fi

case "${ENV_FILE}" in
  "${ROOT_DIR}"/*) ENV_CONTAINER_PATH="/workspace/${ENV_FILE#${ROOT_DIR}/}" ;;
  *)
    echo "PREDIA_ENV_FILE debe estar dentro de ${ROOT_DIR}." >&2
    exit 1
    ;;
esac

sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl docker.io docker-compose-v2
sudo systemctl enable --now docker

DOCKER=(sudo docker)
COMPOSE=("${DOCKER[@]}" compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}")

"${DOCKER[@]}" run --rm \
  -v "${ROOT_DIR}:/workspace:ro" \
  -w /workspace \
  node:22-alpine \
  node scripts/validate-production-env.mjs "${ENV_CONTAINER_PATH}"

PREDIA_ENV_FILE="${ENV_FILE}" "${ROOT_DIR}/setup-https.sh"

export PREDIA_ENV_FILE="${ENV_FILE}"
export PREDIA_IMAGE_TAG="${PREDIA_IMAGE_TAG:-$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"

"${COMPOSE[@]}" --profile tools config --quiet
"${COMPOSE[@]}" up -d db
"${COMPOSE[@]}" build predia-api-1 predia-mobile-web predia-migrator
"${COMPOSE[@]}" --profile tools run --rm predia-migrator

if [ "$(read_env SEED_DEMO_DATA)" = "true" ]; then
  "${COMPOSE[@]}" --profile tools run --rm predia-seeder
fi

"${COMPOSE[@]}" up -d --no-build
"${COMPOSE[@]}" ps

DOMAIN="$(read_env PREDIA_DOMAIN)"
for _attempt in $(seq 1 60); do
  if curl -fsS --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/api/ready" >/dev/null; then
    curl -fsS --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/mobile/" >/dev/null
    echo "PREDIA web, API y movil disponibles en https://${DOMAIN}."
    exit 0
  fi
  sleep 5
done

"${COMPOSE[@]}" logs --tail=200 predia-proxy predia-api-1 predia-api-2 predia-mobile-web
echo "El stack no alcanzo readiness dentro del tiempo esperado." >&2
exit 1
