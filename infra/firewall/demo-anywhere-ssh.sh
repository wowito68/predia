#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Ejecuta este script con sudo." >&2
  exit 1
fi

MODE="${1:-enable}"
case "${MODE}" in
  enable|disable|status) ;;
  *)
    echo "Uso: sudo bash infra/firewall/demo-anywhere-ssh.sh [enable|disable|status]" >&2
    exit 1
    ;;
esac

SSH_PORT="${SSH_PORT:-}"
if [ -z "${SSH_PORT}" ]; then
  SSH_PORT="$(sshd -T 2>/dev/null | awk '$1 == "port" { print $2; exit }')"
  SSH_PORT="${SSH_PORT:-22}"
fi

case "${MODE}" in
  enable)
    sshd -t
    if sshd -T | awk '
      $1 == "passwordauthentication" && $2 != "no" { bad = 1 }
      $1 == "permitrootlogin" && $2 != "no" { bad = 1 }
      END { exit bad }
    '; then
      :
    else
      echo "SSH no esta endurecido: PasswordAuthentication y PermitRootLogin deben estar en no." >&2
      exit 1
    fi

    ufw limit "${SSH_PORT}/tcp" comment "PREDIA demo SSH temporal any network"
    ufw --force enable
    echo "SSH temporal desde cualquier red habilitado con rate limit de UFW."
    ;;
  disable)
    ufw delete limit "${SSH_PORT}/tcp" || true
    echo "Regla temporal de SSH desde cualquier red retirada si existia."
    ;;
  status)
    ufw status verbose
    ;;
esac
