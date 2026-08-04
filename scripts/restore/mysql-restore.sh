#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${DATABASE_URL:?DATABASE_URL requerido}"
BACKUP_FILE="${1:?Uso: scripts/restore/mysql-restore.sh backups/predia-YYYYmmdd-HHMMSS.sql.gz}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "No existe el respaldo: ${BACKUP_FILE}" >&2
  exit 1
fi

if [ "${CONFIRM_RESTORE:-}" != "yes" ]; then
  echo "Restaurar sobrescribe datos. Reejecuta con CONFIRM_RESTORE=yes." >&2
  exit 1
fi

gzip -t "${BACKUP_FILE}"
if [ -f "${BACKUP_FILE}.sha256" ]; then
  sha256sum --check "${BACKUP_FILE}.sha256"
fi

mapfile -d '' -t DB_PARTS < <(node - "${DATABASE_URL}" <<'NODE'
const url = new URL(process.argv[2])
if (url.protocol !== 'mysql:') throw new Error('DATABASE_URL debe usar mysql://')
const values = [
  url.hostname,
  url.port || '3306',
  decodeURIComponent(url.username),
  decodeURIComponent(url.password),
  decodeURIComponent(url.pathname.replace(/^\//, '')),
]
if (values.some((value) => !value)) throw new Error('DATABASE_URL incompleta')
process.stdout.write(`${values.join('\0')}\0`)
NODE
)

if [ "${#DB_PARTS[@]}" -ne 5 ]; then
  echo "No se pudo interpretar DATABASE_URL." >&2
  exit 1
fi

HOST="${DB_PARTS[0]}"
PORT="${DB_PARTS[1]}"
USER="${DB_PARTS[2]}"
PASS="${DB_PARTS[3]}"
DB="${DB_PARTS[4]}"

gzip -dc "${BACKUP_FILE}" | MYSQL_PWD="${PASS}" mysql -h "${HOST}" -P "${PORT}" -u "${USER}" "${DB}"
echo "Restauracion completada desde ${BACKUP_FILE}"
