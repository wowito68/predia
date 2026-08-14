#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_command curl
require_command ssh

: "${PREDIA_DEMO_PUBLIC_SSH_HOST:=ec2-52-15-133-69.us-east-2.compute.amazonaws.com}"
: "${PREDIA_DEMO_PRIVATE_SSH_HOST:=${PREDIA_DEMO_SSH_HOST}}"
: "${PREDIA_DEMO_PUBLIC_SSH_USER:=${PREDIA_DEMO_SSH_USER}}"
: "${PREDIA_DEMO_PRIVATE_SSH_USER:=${PREDIA_DEMO_SSH_USER}}"

MODE="${1:-check}"
case "${MODE}" in
  check|check-private|check-public|check-both|allow-private|allow-public|allow-both|revoke-private|revoke-public|revoke-both|allow-private-anywhere|allow-public-anywhere|allow-both-anywhere|revoke-private-anywhere|revoke-public-anywhere|revoke-both-anywhere) ;;
  *)
    die "Uso: bash scripts/demo/ssh-access-doctor.sh [check|check-private|check-public|check-both|allow-private|allow-public|allow-both|revoke-private|revoke-public|revoke-both|allow-private-anywhere|allow-public-anywhere|allow-both-anywhere|revoke-private-anywhere|revoke-public-anywhere|revoke-both-anywhere]"
    ;;
esac

CURRENT_IP="$(current_public_ip || true)"
[ -n "${CURRENT_IP}" ] || die "No pude detectar tu IP publica actual."
CURRENT_CIDR="${CURRENT_IP}/32"

probe_ssh() {
  local label="$1"
  local user="$2"
  local host="$3"

  printf '\n%s\n' "=== SSH ${label} ==="
  printf 'Objetivo: %s@%s\n' "${user}" "${host}"
  if timeout 6 bash -c "</dev/tcp/${host}/22" 2>/dev/null; then
    ok "Puerto 22 accesible desde ${CURRENT_CIDR}"
  else
    warn "Puerto 22 no responde desde ${CURRENT_CIDR}"
    return 1
  fi

  if ssh \
    -i "${PREDIA_DEMO_SSH_KEY}" \
    -o BatchMode=yes \
    -o IdentitiesOnly=yes \
    -o ConnectTimeout=8 \
    "${user}@${host}" 'true'; then
    ok "Login SSH con llave disponible"
  else
    warn "El puerto abre, pero el login SSH con llave no completo"
    return 1
  fi
}

aws_sg_change() {
  local action="$1"
  local label="$2"
  local group_id="$3"
  local cidr="${4:-${CURRENT_CIDR}}"
  [ -n "${group_id}" ] || die "Falta el Security Group para ${label}. Configura PREDIA_DEMO_PUBLIC_SECURITY_GROUP o PREDIA_DEMO_PRIVATE_SECURITY_GROUP."
  require_command aws

  section "${action} SSH ${label}"
  printf 'Security Group: %s\n' "${group_id}"
  printf 'CIDR: %s\n' "${cidr}"
  if [ "${cidr}" = "0.0.0.0/0" ]; then
    warn "Modo demo-anywhere: SSH quedara accesible desde cualquier red. Usalo solo temporalmente y revocalo al terminar."
  fi

  if [ "${action}" = "allow" ]; then
    if aws ec2 authorize-security-group-ingress \
      --region "${PREDIA_DEMO_AWS_REGION}" \
      --group-id "${group_id}" \
      --protocol tcp \
      --port 22 \
      --cidr "${cidr}"; then
      ok "SSH autorizado para ${cidr}"
    else
      warn "AWS no aplico la regla; puede existir ya o faltan permisos."
    fi
  else
    if aws ec2 revoke-security-group-ingress \
      --region "${PREDIA_DEMO_AWS_REGION}" \
      --group-id "${group_id}" \
      --protocol tcp \
      --port 22 \
      --cidr "${cidr}"; then
      ok "SSH revocado para ${cidr}"
    else
      warn "AWS no revoco la regla; puede no existir o faltar permisos."
    fi
  fi
}

section "IP publica actual"
printf '%s\n' "${CURRENT_CIDR}"

case "${MODE}" in
  check|check-private)
    status=0
    probe_ssh "servidor privado" "${PREDIA_DEMO_PRIVATE_SSH_USER}" "${PREDIA_DEMO_PRIVATE_SSH_HOST}" || status=1
    if [ "${status}" -ne 0 ]; then
      ssh_access_hint "${PREDIA_DEMO_SSH_TARGET}"
      exit "${status}"
    fi
    ;;
  check-public)
    status=0
    probe_ssh "servidor publico" "${PREDIA_DEMO_PUBLIC_SSH_USER}" "${PREDIA_DEMO_PUBLIC_SSH_HOST}" || status=1
    if [ "${status}" -ne 0 ]; then
      ssh_access_hint "${PREDIA_DEMO_PUBLIC_SSH_USER}@${PREDIA_DEMO_PUBLIC_SSH_HOST}"
      exit "${status}"
    fi
    ;;
  check-both)
    status=0
    probe_ssh "servidor privado" "${PREDIA_DEMO_PRIVATE_SSH_USER}" "${PREDIA_DEMO_PRIVATE_SSH_HOST}" || status=1
    probe_ssh "servidor publico" "${PREDIA_DEMO_PUBLIC_SSH_USER}" "${PREDIA_DEMO_PUBLIC_SSH_HOST}" || status=1
    if [ "${status}" -ne 0 ]; then
      ssh_access_hint "${PREDIA_DEMO_SSH_TARGET}"
      exit "${status}"
    fi
    ;;
  allow-private)
    aws_sg_change allow "servidor privado" "${PREDIA_DEMO_PRIVATE_SECURITY_GROUP}"
    ;;
  allow-private-anywhere)
    aws_sg_change allow "servidor privado" "${PREDIA_DEMO_PRIVATE_SECURITY_GROUP}" "0.0.0.0/0"
    ;;
  allow-public)
    aws_sg_change allow "servidor publico" "${PREDIA_DEMO_PUBLIC_SECURITY_GROUP}"
    ;;
  allow-public-anywhere)
    aws_sg_change allow "servidor publico" "${PREDIA_DEMO_PUBLIC_SECURITY_GROUP}" "0.0.0.0/0"
    ;;
  allow-both)
    aws_sg_change allow "servidor privado" "${PREDIA_DEMO_PRIVATE_SECURITY_GROUP}"
    aws_sg_change allow "servidor publico" "${PREDIA_DEMO_PUBLIC_SECURITY_GROUP}"
    ;;
  allow-both-anywhere)
    aws_sg_change allow "servidor privado" "${PREDIA_DEMO_PRIVATE_SECURITY_GROUP}" "0.0.0.0/0"
    aws_sg_change allow "servidor publico" "${PREDIA_DEMO_PUBLIC_SECURITY_GROUP}" "0.0.0.0/0"
    ;;
  revoke-private)
    aws_sg_change revoke "servidor privado" "${PREDIA_DEMO_PRIVATE_SECURITY_GROUP}"
    ;;
  revoke-private-anywhere)
    aws_sg_change revoke "servidor privado" "${PREDIA_DEMO_PRIVATE_SECURITY_GROUP}" "0.0.0.0/0"
    ;;
  revoke-public)
    aws_sg_change revoke "servidor publico" "${PREDIA_DEMO_PUBLIC_SECURITY_GROUP}"
    ;;
  revoke-public-anywhere)
    aws_sg_change revoke "servidor publico" "${PREDIA_DEMO_PUBLIC_SECURITY_GROUP}" "0.0.0.0/0"
    ;;
  revoke-both)
    aws_sg_change revoke "servidor privado" "${PREDIA_DEMO_PRIVATE_SECURITY_GROUP}"
    aws_sg_change revoke "servidor publico" "${PREDIA_DEMO_PUBLIC_SECURITY_GROUP}"
    ;;
  revoke-both-anywhere)
    aws_sg_change revoke "servidor privado" "${PREDIA_DEMO_PRIVATE_SECURITY_GROUP}" "0.0.0.0/0"
    aws_sg_change revoke "servidor publico" "${PREDIA_DEMO_PUBLIC_SECURITY_GROUP}" "0.0.0.0/0"
    ;;
esac

section "Resultado"
ok "Doctor de acceso terminado"
