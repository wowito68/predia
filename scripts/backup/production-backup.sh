#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${PREDIA_ENV_FILE:-${ROOT_DIR}/.env.production}"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.production.yml"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Falta el archivo de entorno ${ENV_FILE}." >&2
  exit 1
fi

if ! [[ "${BACKUP_RETENTION_DAYS}" =~ ^[0-9]+$ ]]; then
  echo "BACKUP_RETENTION_DAYS debe ser un entero no negativo." >&2
  exit 1
fi

DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then
  DOCKER=(sudo docker)
fi
COMPOSE=("${DOCKER[@]}" compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}")

umask 077
mkdir -p "${BACKUP_DIR}"

OUT="${BACKUP_DIR}/predia-$(date -u +%Y%m%d-%H%M%S)-utc.sql.gz"
TEMP_OUT="${OUT}.partial"
trap 'rm -f "${TEMP_OUT}"' EXIT

"${COMPOSE[@]}" exec -T db sh -euc '
  MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump \
    -uroot \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --events \
    --hex-blob \
    --no-tablespaces \
    --default-character-set=utf8mb4 \
    "$MYSQL_DATABASE"
' | gzip -9 > "${TEMP_OUT}"

gzip -t "${TEMP_OUT}"
mv "${TEMP_OUT}" "${OUT}"
sha256sum "${OUT}" > "${OUT}.sha256"

find "${BACKUP_DIR}" -maxdepth 1 -type f \
  \( -name 'predia-*.sql.gz' -o -name 'predia-*.sql.gz.sha256' \) \
  -mtime "+${BACKUP_RETENTION_DAYS}" -delete

trap - EXIT
echo "Backup de produccion verificado: ${OUT}"
echo "Checksum: ${OUT}.sha256"
