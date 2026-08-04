#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${PREDIA_PRIVATE_ENV_FILE:-${ROOT_DIR}/.env.private}"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.private.yml"

if [ ! -f "${ENV_FILE}" ]; then
  echo "No existe ${ENV_FILE}. Crea el archivo desde .env.private.example." >&2
  exit 1
fi
if [ "$(stat -c '%a' "${ENV_FILE}")" -gt 600 ]; then
  echo "${ENV_FILE} debe tener permisos 600 o mas restrictivos." >&2
  exit 1
fi

private_ip="$(awk -F= '$1 == "PREDIA_PRIVATE_IP" { print $2; exit }' "${ENV_FILE}" | tr -d '[:space:]')"
if [ -z "${private_ip}" ] || ! hostname -I | tr ' ' '\n' | grep -Fxq "${private_ip}"; then
  echo "PREDIA_PRIVATE_IP no pertenece a este servidor." >&2
  exit 1
fi

cd "${ROOT_DIR}"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" config >/dev/null
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" pull
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d

for _attempt in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:9090/-/ready >/dev/null 2>&1 && \
     curl -fsS http://127.0.0.1:3001/api/health >/dev/null 2>&1 && \
     docker inspect --format '{{.State.Health.Status}}' predia-private-db 2>/dev/null | grep -Fxq healthy; then
    echo "Servidor privado PREDIA listo."
    docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps
    exit 0
  fi
  sleep 2
done

echo "Los servicios privados no alcanzaron readiness." >&2
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps >&2
exit 1
