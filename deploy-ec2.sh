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
DEPLOY_STATE_DIR="${ROOT_DIR}/.deploy"
CURRENT_TAG_FILE="${DEPLOY_STATE_DIR}/current-image-tag"
PREVIOUS_TAG_FILE="${DEPLOY_STATE_DIR}/previous-image-tag"
mkdir -p "${DEPLOY_STATE_DIR}" "${ROOT_DIR}/backups"
chmod 700 "${DEPLOY_STATE_DIR}" "${ROOT_DIR}/backups"

if [ -f "${CURRENT_TAG_FILE}" ]; then
  CURRENT_TAG="$(tr -d '[:space:]' < "${CURRENT_TAG_FILE}")"
  if [ -n "${CURRENT_TAG}" ] && [ "${CURRENT_TAG}" != "${PREDIA_IMAGE_TAG}" ]; then
    printf '%s\n' "${CURRENT_TAG}" > "${PREVIOUS_TAG_FILE}"
    chmod 600 "${PREVIOUS_TAG_FILE}"
  fi
fi

"${COMPOSE[@]}" --profile tools config --quiet
"${COMPOSE[@]}" up -d db

MYSQL_ROOT_PASSWORD="$(read_env MYSQL_ROOT_PASSWORD)"
MYSQL_EXPORTER_PASSWORD="$(read_env MYSQL_EXPORTER_PASSWORD)"
if ! [[ "${MYSQL_EXPORTER_PASSWORD}" =~ ^[A-Za-z0-9_-]{20,}$ ]]; then
  echo "MYSQL_EXPORTER_PASSWORD no cumple el formato seguro esperado." >&2
  exit 1
fi
"${COMPOSE[@]}" exec -T -e MYSQL_PWD="${MYSQL_ROOT_PASSWORD}" db mysql -uroot --execute="
  CREATE USER IF NOT EXISTS 'predia_exporter'@'%' IDENTIFIED BY '${MYSQL_EXPORTER_PASSWORD}' WITH MAX_USER_CONNECTIONS 3;
  ALTER USER 'predia_exporter'@'%' IDENTIFIED BY '${MYSQL_EXPORTER_PASSWORD}' WITH MAX_USER_CONNECTIONS 3;
  GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'predia_exporter'@'%';
  FLUSH PRIVILEGES;
"

PREDIA_ENV_FILE="${ENV_FILE}" BACKUP_DIR="${ROOT_DIR}/backups" \
  "${ROOT_DIR}/scripts/backup/production-backup.sh"

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
    printf '%s\n' "${PREDIA_IMAGE_TAG}" > "${CURRENT_TAG_FILE}"
    chmod 600 "${CURRENT_TAG_FILE}"

    sed \
      -e "s|@PREDIA_ROOT@|${ROOT_DIR}|g" \
      -e "s|@PREDIA_ENV_FILE@|${ENV_FILE}|g" \
      -e "s|@BACKUP_DIR@|${ROOT_DIR}/backups|g" \
      "${ROOT_DIR}/infra/systemd/predia-backup.service.in" | \
      sudo tee /etc/systemd/system/predia-backup.service >/dev/null
    sudo install -m 0644 \
      "${ROOT_DIR}/infra/systemd/predia-backup.timer" \
      /etc/systemd/system/predia-backup.timer
    sudo systemctl daemon-reload
    sudo systemctl enable --now predia-backup.timer

    echo "PREDIA web, API y movil disponibles en https://${DOMAIN}."
    exit 0
  fi
  sleep 5
done

"${COMPOSE[@]}" logs --tail=200 predia-proxy predia-api-1 predia-api-2 predia-mobile-web
echo "El stack no alcanzo readiness dentro del tiempo esperado." >&2
exit 1
