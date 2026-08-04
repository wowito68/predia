#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${PREDIA_ENV_FILE:-${ROOT_DIR}/.env.production}"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.production.yml"
STATE_DIR="${ROOT_DIR}/.deploy"
PREVIOUS_TAG_FILE="${STATE_DIR}/previous-image-tag"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Falta ${ENV_FILE}." >&2
  exit 1
fi

ROLLBACK_TAG="${1:-}"
if [ -z "${ROLLBACK_TAG}" ] && [ -f "${PREVIOUS_TAG_FILE}" ]; then
  ROLLBACK_TAG="$(tr -d '[:space:]' < "${PREVIOUS_TAG_FILE}")"
fi
if ! [[ "${ROLLBACK_TAG}" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "No hay una etiqueta de rollback valida. Indica una como primer argumento." >&2
  exit 1
fi

DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then
  DOCKER=(sudo docker)
fi
COMPOSE=("${DOCKER[@]}" compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}")

"${DOCKER[@]}" image inspect "predia-web:${ROLLBACK_TAG}" >/dev/null
"${DOCKER[@]}" image inspect "predia-mobile-web:${ROLLBACK_TAG}" >/dev/null

export PREDIA_ENV_FILE="${ENV_FILE}"
export PREDIA_IMAGE_TAG="${ROLLBACK_TAG}"
"${COMPOSE[@]}" up -d --no-build predia-api-1 predia-api-2 predia-mobile-web predia-proxy

DOMAIN="$(awk -F= '$1 == "PREDIA_DOMAIN" { print $2; exit }' "${ENV_FILE}" | tr -d '[:space:]"'\'\'')"
for _attempt in $(seq 1 30); do
  if curl -fsS --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/api/ready" >/dev/null; then
    mkdir -p "${STATE_DIR}"
    printf '%s\n' "${ROLLBACK_TAG}" > "${STATE_DIR}/current-image-tag"
    chmod 600 "${STATE_DIR}/current-image-tag"
    echo "Rollback completado con la etiqueta ${ROLLBACK_TAG}."
    exit 0
  fi
  sleep 2
done

"${COMPOSE[@]}" logs --tail=200 predia-proxy predia-api-1 predia-api-2 predia-mobile-web
echo "Las imagenes anteriores no alcanzaron readiness." >&2
exit 1
