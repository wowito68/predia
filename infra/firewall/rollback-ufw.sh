#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Ejecuta este script con sudo." >&2
  exit 1
fi

BACKUP_FILE="${1:?Uso: sudo bash infra/firewall/rollback-ufw.sh /var/backups/predia-firewall/ufw-AAAAMMDDTHHMMSSZ.tar.gz}"
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "No existe el respaldo: ${BACKUP_FILE}" >&2
  exit 1
fi

ufw --force disable || true
tar -xzf "${BACKUP_FILE}" -C /
systemctl restart ufw || true
systemctl restart fail2ban || true
ufw --force enable

echo "Firewall restaurado desde ${BACKUP_FILE}."
ufw status verbose
