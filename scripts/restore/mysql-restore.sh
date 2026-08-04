#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${DATABASE_URL:?DATABASE_URL requerido}"
BACKUP_FILE="${1:?Uso: scripts/restore/mysql-restore.sh backups/predia-YYYYmmdd-HHMMSS.sql.gz}"

if [ "${CONFIRM_RESTORE:-}" != "yes" ]; then
  echo "Restaurar sobrescribe datos. Reejecuta con CONFIRM_RESTORE=yes." >&2
  exit 1
fi

node - "${DATABASE_URL}" > /tmp/predia-db-env <<'NODE'
const url = new URL(process.argv[2])
console.log(`HOST=${url.hostname}`)
console.log(`PORT=${url.port || 3306}`)
console.log(`USER=${decodeURIComponent(url.username)}`)
console.log(`PASS=${decodeURIComponent(url.password)}`)
console.log(`DB=${url.pathname.replace('/', '')}`)
NODE
set -a
. /tmp/predia-db-env
set +a
rm -f /tmp/predia-db-env

gzip -dc "${BACKUP_FILE}" | MYSQL_PWD="${PASS}" mysql -h "${HOST}" -P "${PORT}" -u "${USER}" "${DB}"
echo "Restauracion completada desde ${BACKUP_FILE}"
