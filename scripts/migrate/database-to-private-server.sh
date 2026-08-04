#!/usr/bin/env bash
set -euo pipefail

PUBLIC_HOST="${PREDIA_PUBLIC_HOST:-ec2-52-15-133-69.us-east-2.compute.amazonaws.com}"
PRIVATE_HOST="${PREDIA_PRIVATE_HOST:-ec2-18-222-145-243.us-east-2.compute.amazonaws.com}"
SSH_USER="${PREDIA_SSH_USER:-ubuntu}"
SSH_KEY="${PREDIA_SSH_KEY:-${HOME}/Descargas/PREDIA.pem}"
PRIVATE_IP="${PREDIA_PRIVATE_IP:-172.31.45.164}"
PUBLIC_ROOT="${PREDIA_PUBLIC_ROOT:-/home/ubuntu/predia}"
PRIVATE_ROOT="${PREDIA_PRIVATE_ROOT:-/home/ubuntu/predia-private}"

if [ "${CONFIRM_DB_MIGRATION:-}" != "yes" ] || [ "${CONFIRM_DB_CUTOVER:-}" != "yes" ]; then
  cat >&2 <<'EOF'
Esta operacion copia la base productiva y cambia DATABASE_URL en el servidor publico.
Requiere las dos confirmaciones explicitas:

  CONFIRM_DB_MIGRATION=yes CONFIRM_DB_CUTOVER=yes \
    bash scripts/migrate/database-to-private-server.sh
EOF
  exit 1
fi

[ -f "${SSH_KEY}" ] || {
  echo "No existe ${SSH_KEY}." >&2
  exit 1
}

ssh_host() {
  local host="$1"
  shift
  ssh -i "${SSH_KEY}" \
    -o BatchMode=yes \
    -o IdentitiesOnly=yes \
    -o ConnectTimeout=10 \
    "${SSH_USER}@${host}" "$@"
}

echo "Verificando acceso y conectividad privada..."
ssh_host "${PUBLIC_HOST}" true
ssh_host "${PRIVATE_HOST}" true
ssh_host "${PUBLIC_HOST}" \
  "timeout 5 bash -c '</dev/tcp/${PRIVATE_IP}/3306'"

source_tables="$(ssh_host "${PUBLIC_HOST}" \
  "sudo docker exec predia-db-private sh -c 'mysql -N -u root -p\"\$MYSQL_ROOT_PASSWORD\" -e \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=\\\"\$MYSQL_DATABASE\\\"\"'")"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${PRIVATE_ROOT}/backups/pre-cutover-${timestamp}.sql.gz"

echo "Creando respaldo consistente y restaurandolo en el servidor privado..."
ssh_host "${PRIVATE_HOST}" "install -d -m 0700 '${PRIVATE_ROOT}/backups'"
ssh_host "${PUBLIC_HOST}" \
  "sudo docker exec predia-db-private sh -c 'exec mysqldump --single-transaction --quick --routines --triggers --events --hex-blob --add-drop-table -u root -p\"\$MYSQL_ROOT_PASSWORD\" \"\$MYSQL_DATABASE\"'" |
  gzip -1 |
  ssh_host "${PRIVATE_HOST}" \
    "umask 077; tee '${backup_file}' | gunzip | docker exec -i predia-private-db sh -c 'exec mysql -u root -p\"\$MYSQL_ROOT_PASSWORD\" \"\$MYSQL_DATABASE\"'"

ssh_host "${PRIVATE_HOST}" \
  "gzip -t '${backup_file}' && sha256sum '${backup_file}' > '${backup_file}.sha256'"

destination_tables="$(ssh_host "${PRIVATE_HOST}" \
  "docker exec predia-private-db sh -c 'mysql -N -u root -p\"\$MYSQL_ROOT_PASSWORD\" -e \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=\\\"\$MYSQL_DATABASE\\\"\"'")"
if [ "${source_tables}" != "${destination_tables}" ] || [ "${source_tables}" -eq 0 ]; then
  echo "La validacion estructural fallo: origen=${source_tables}, destino=${destination_tables}." >&2
  exit 1
fi

echo "Aplicando cutover de DATABASE_URL..."
env_backup="${PUBLIC_ROOT}/.env.production.pre-private-${timestamp}"
ssh_host "${PUBLIC_HOST}" "PUBLIC_ROOT='${PUBLIC_ROOT}' PRIVATE_IP='${PRIVATE_IP}' ENV_BACKUP='${env_backup}' bash -s" <<'REMOTE'
set -euo pipefail
cd "${PUBLIC_ROOT}"
cp --preserve=mode,ownership,timestamps .env.production "${ENV_BACKUP}"
python3 - .env.production "${PRIVATE_IP}" <<'PY'
import pathlib
import sys
from urllib.parse import urlsplit, urlunsplit

path = pathlib.Path(sys.argv[1])
private_ip = sys.argv[2]
lines = path.read_text().splitlines()
updated = False

for index, line in enumerate(lines):
    if not line.startswith("DATABASE_URL="):
        continue
    value = line.split("=", 1)[1].strip()
    quote = value[0] if value[:1] in {"'", '"'} and value[-1:] == value[0] else ""
    raw = value[1:-1] if quote else value
    parsed = urlsplit(raw)
    userinfo = parsed.netloc.rsplit("@", 1)[0]
    replacement = urlunsplit((parsed.scheme, f"{userinfo}@{private_ip}:3306", parsed.path, parsed.query, parsed.fragment))
    lines[index] = f"DATABASE_URL={quote}{replacement}{quote}"
    updated = True
    break

if not updated:
    raise SystemExit("DATABASE_URL no existe en .env.production")

temporary = path.with_suffix(".production.tmp")
temporary.write_text("\n".join(lines) + "\n")
temporary.chmod(0o600)
temporary.replace(path)
PY

sudo docker compose --env-file .env.production -f docker-compose.production.yml \
  up -d --no-deps --force-recreate predia-api-1 predia-api-2
REMOTE

rollback() {
  echo "Readiness fallo; restaurando DATABASE_URL anterior." >&2
  ssh_host "${PUBLIC_HOST}" \
    "cd '${PUBLIC_ROOT}' && cp '${env_backup}' .env.production && sudo docker compose --env-file .env.production -f docker-compose.production.yml up -d --no-deps --force-recreate predia-api-1 predia-api-2" || true
}

for _attempt in $(seq 1 60); do
  if curl -fsS "https://prediaa.duckdns.org/api/ready" |
    grep -q '"database":"ok"'; then
    echo "Cutover completado. Respaldo privado: ${backup_file}"
    echo "La base local publica permanece intacta como rollback temporal."
    exit 0
  fi
  sleep 2
done

rollback
exit 1
