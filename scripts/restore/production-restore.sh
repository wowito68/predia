#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${PREDIA_ENV_FILE:-${ROOT_DIR}/.env.production}"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.production.yml"
BACKUP_FILE="${1:?Uso: CONFIRM_RESTORE=yes scripts/restore/production-restore.sh backups/predia-...sql.gz}"

if [ "${CONFIRM_RESTORE:-}" != "yes" ]; then
  echo "La restauracion modifica produccion. Reejecuta con CONFIRM_RESTORE=yes." >&2
  exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
  echo "Falta el archivo de entorno ${ENV_FILE}." >&2
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "No existe el respaldo ${BACKUP_FILE}." >&2
  exit 1
fi

gzip -t "${BACKUP_FILE}"
if [ -f "${BACKUP_FILE}.sha256" ]; then
  sha256sum --check "${BACKUP_FILE}.sha256"
fi

DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then
  DOCKER=(sudo docker)
fi
COMPOSE=("${DOCKER[@]}" compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}")

if [ "${SKIP_PRE_RESTORE_BACKUP:-no}" != "yes" ]; then
  PREDIA_ENV_FILE="${ENV_FILE}" "${ROOT_DIR}/scripts/backup/production-backup.sh"
fi

gzip -dc "${BACKUP_FILE}" | "${COMPOSE[@]}" exec -T db sh -euc '
  MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql \
    -uroot \
    --default-character-set=utf8mb4 \
    "$MYSQL_DATABASE"
'

echo "Restauracion de produccion completada desde ${BACKUP_FILE}."
