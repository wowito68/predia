#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Ejecuta este script con sudo." >&2
  exit 1
fi

SSH_PORT="${SSH_PORT:-}"
ADMIN_CIDR="${ADMIN_CIDR:-}"

if [ -z "${SSH_PORT}" ]; then
  SSH_PORT="$(sshd -T 2>/dev/null | awk '$1 == "port" { print $2; exit }')"
  SSH_PORT="${SSH_PORT:-22}"
fi
if ! [[ "${SSH_PORT}" =~ ^[0-9]+$ ]] || [ "${SSH_PORT}" -lt 1 ] || [ "${SSH_PORT}" -gt 65535 ]; then
  echo "SSH_PORT no es valido: ${SSH_PORT}" >&2
  exit 1
fi

if [ -z "${ADMIN_CIDR}" ] && [ -n "${SSH_CONNECTION:-}" ]; then
  ADMIN_IP="${SSH_CONNECTION%% *}"
  if [[ "${ADMIN_IP}" == *:* ]]; then
    ADMIN_CIDR="${ADMIN_IP}/128"
  else
    ADMIN_CIDR="${ADMIN_IP}/32"
  fi
fi

if [ -z "${ADMIN_CIDR}" ]; then
  echo "Define ADMIN_CIDR con la IP/CIDR autorizada para SSH, por ejemplo: ADMIN_CIDR=203.0.113.10/32" >&2
  exit 1
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y ufw fail2ban

BACKUP_DIR="/var/backups/predia-firewall"
BACKUP_FILE="${BACKUP_DIR}/ufw-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
install -d -m 0700 "${BACKUP_DIR}"
umask 077
tar -czf "${BACKUP_FILE}" /etc/ufw /etc/default/ufw /etc/fail2ban/jail.d 2>/dev/null || true
ufw status verbose > "${BACKUP_FILE%.tar.gz}.status.txt" 2>&1 || true
iptables-save > "${BACKUP_FILE%.tar.gz}.iptables" 2>/dev/null || true

rollback_on_error() {
  echo "La aplicacion del firewall fallo. Restaurando ${BACKUP_FILE}." >&2
  bash infra/firewall/rollback-ufw.sh "${BACKUP_FILE}" || true
}
trap rollback_on_error ERR

sshd -t

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw logging low

ufw allow from "${ADMIN_CIDR}" to any port "${SSH_PORT}" proto tcp comment "SSH administracion PREDIA"
ufw allow 80/tcp comment "HTTP ACME/redirect"
ufw allow 443/tcp comment "HTTPS PREDIA"

ufw deny 3306/tcp comment "MySQL privado"
ufw deny 3000/tcp comment "Backend privado"
ufw deny 9090/tcp comment "Prometheus privado"
ufw deny 3001/tcp comment "Grafana privado"
ufw deny 8080/tcp comment "Mobile web privado"
ufw deny 9100/tcp comment "Node exporter privado"
ufw deny 20241/tcp comment "Cloudflared metrics privado"

install -m 0644 infra/firewall/fail2ban-sshd.conf /etc/fail2ban/jail.d/predia-sshd.conf
systemctl enable --now fail2ban
ufw --force enable

trap - ERR

echo "Firewall PREDIA aplicado."
echo "Respaldo: ${BACKUP_FILE}"
echo "Rollback: sudo bash infra/firewall/rollback-ufw.sh '${BACKUP_FILE}'"
ufw status verbose
