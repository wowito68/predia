#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-backups}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL requerido}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

umask 077
mkdir -p "${BACKUP_DIR}"

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

OUT="${BACKUP_DIR}/predia-$(date +%Y%m%d-%H%M%S).sql.gz"
TEMP_OUT="${OUT}.partial"
trap 'rm -f "${TEMP_OUT}"' EXIT

MYSQL_PWD="${PASS}" mysqldump \
  -h "${HOST}" \
  -P "${PORT}" \
  -u "${USER}" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  --no-tablespaces \
  --default-character-set=utf8mb4 \
  "${DB}" | gzip -9 > "${TEMP_OUT}"

gzip -t "${TEMP_OUT}"
mv "${TEMP_OUT}" "${OUT}"
sha256sum "${OUT}" > "${OUT}.sha256"

find "${BACKUP_DIR}" -maxdepth 1 -type f \
  \( -name 'predia-*.sql.gz' -o -name 'predia-*.sql.gz.sha256' \) \
  -mtime "+${BACKUP_RETENTION_DAYS}" -delete

trap - EXIT
echo "Backup verificado: ${OUT}"
echo "Checksum: ${OUT}.sha256"
