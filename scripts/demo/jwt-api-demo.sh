#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
require_command curl

section "Proteccion JWT: validacion criptografica"
"${DEMO_DIR}/security-tests.sh" jwt

section "Proteccion JWT: API publicada"
printf 'Endpoint protegido: /api/pacientes\n'
printf 'No se imprime ni utiliza ningun token valido de produccion.\n\n'

body_file="$(mktemp /tmp/predia-jwt-demo.XXXXXX)"
trap 'rm -f "${body_file}"' EXIT

assert_unauthorized() {
  local label="$1"
  shift
  local status
  local response

  status="$(
    curl -sS -o "${body_file}" -w '%{http_code}' "$@" \
      "https://${PREDIA_DEMO_DOMAIN}/api/pacientes"
  )"
  response="$(tr -d '\r\n' < "${body_file}")"
  printf '%-24s HTTP %s  %s\n' "${label}" "${status}" "${response}"
  [ "${status}" = "401" ] || die "La API debio responder HTTP 401."
}

assert_unauthorized "Solicitud sin token"
assert_unauthorized "Token manipulado" \
  -H 'Authorization: Bearer token-de-demostracion-invalido'

ok "La API rechaza solicitudes sin autenticacion o con JWT invalido"
