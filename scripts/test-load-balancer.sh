#!/usr/bin/env bash
set -euo pipefail

URL="${URL:-http://127.0.0.1:8088/api/health}"
TMP_FILE="$(mktemp)"
trap 'rm -f "${TMP_FILE}"' EXIT

for _ in $(seq 1 12); do
  curl -fsS -D - -o /dev/null "${URL}" | awk 'tolower($1)=="x-predia-instance:" {print $2}' | tr -d '\r' >> "${TMP_FILE}" || true
done

sort "${TMP_FILE}" | uniq -c
COUNT="$(sort -u "${TMP_FILE}" | sed '/^$/d' | wc -l | tr -d ' ')"
if [ "${COUNT}" -lt 2 ]; then
  echo "No se observo mas de una instancia. Verifica docker-compose.rubric.yml." >&2
  exit 1
fi

echo "Balanceador verificado con ${COUNT} instancias."
