#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-backups}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL requerido}"
mkdir -p "${BACKUP_DIR}"

node - "${DATABASE_URL}" > "${BACKUP_DIR}/.db-env" <<'NODE'
const url = new URL(process.argv[2])
console.log(`HOST=${url.hostname}`)
console.log(`PORT=${url.port || 3306}`)
console.log(`USER=${decodeURIComponent(url.username)}`)
console.log(`PASS=${decodeURIComponent(url.password)}`)
console.log(`DB=${url.pathname.replace('/', '')}`)
NODE
set -a
. "${BACKUP_DIR}/.db-env"
set +a
rm -f "${BACKUP_DIR}/.db-env"

OUT="${BACKUP_DIR}/predia-$(date +%Y%m%d-%H%M%S).sql.gz"
MYSQL_PWD="${PASS}" mysqldump -h "${HOST}" -P "${PORT}" -u "${USER}" --single-transaction --routines --triggers "${DB}" | gzip > "${OUT}"
echo "Backup creado: ${OUT}"
