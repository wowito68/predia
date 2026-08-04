#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
activate_node22

MODE="${1:-all}"
tests=()
case "${MODE}" in
  all)
    tests=(security-crypto security-jwt refresh-token)
    coverage="bcrypt, AES-256-GCM, JWT y rotacion/replay de refresh tokens"
    ;;
  crypto)
    tests=(security-crypto)
    coverage="hash bcrypt y cifrado autenticado AES-256-GCM"
    ;;
  jwt)
    tests=(security-jwt)
    coverage="firma HS256, emisor, audiencia, expiracion y rechazo de manipulacion"
    ;;
  *)
    die "Uso: bash scripts/demo/security-tests.sh [all|crypto|jwt]"
    ;;
esac

section "Pruebas locales de seguridad: ${MODE}"
printf 'Cobertura: %s.\n' "${coverage}"
printf 'Las pruebas usan llaves efimeras y mocks; no consultan produccion.\n\n'

case "${MODE}" in
  crypto)
    printf 'Codigo ejercitado: apps/web/lib/auth.ts y apps/web/lib/crypto.ts\n\n'
    ;;
  jwt)
    printf 'Codigo ejercitado: generacion y verificacion JWT en apps/web/lib/auth.ts\n\n'
    ;;
  all)
    printf 'Codigo ejercitado: autenticacion, criptografia y rotacion de sesion de PREDIA\n\n'
    ;;
esac

cd "${ROOT_DIR}"
NODE_ENV=test \
JWT_SECRET=predia_demo_secret_only_for_isolated_tests \
JWT_EXPIRES_IN=15m \
JWT_ISSUER=predia-demo \
JWT_AUDIENCE=predia-demo \
pnpm --filter @predia/web exec jest --runInBand \
  --verbose "${tests[@]}"

case "${MODE}" in
  crypto)
    ok "bcrypt genera un hash con salt y valida sin almacenar la contrasena"
    ok "AES-256-GCM cifra, descifra y rechaza una llave incorrecta"
    ;;
  jwt)
    ok "JWT HS256 valida firma, emisor, audiencia y expiracion"
    ok "JWT alterados, vencidos o firmados con otro algoritmo son rechazados"
    ;;
  all)
    ok "Hash, cifrado, JWT y rotacion de refresh tokens verificados"
    ;;
esac

ok "Pruebas de seguridad completadas"
