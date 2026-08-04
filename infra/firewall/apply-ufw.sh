#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Ejecuta este script con sudo." >&2
  exit 1
fi

SSH_PORT="${SSH_PORT:-22}"
ADMIN_CIDR="${ADMIN_CIDR:-}"

if [ -z "${ADMIN_CIDR}" ]; then
  echo "Define ADMIN_CIDR con la IP/CIDR autorizada para SSH, por ejemplo: ADMIN_CIDR=203.0.113.10/32" >&2
  exit 1
fi

apt-get update
apt-get install -y ufw fail2ban

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw logging on

ufw allow from "${ADMIN_CIDR}" to any port "${SSH_PORT}" proto tcp comment "SSH administracion PREDIA"
ufw allow 80/tcp comment "HTTP ACME/redirect"
ufw allow 443/tcp comment "HTTPS PREDIA"

ufw deny 3306/tcp comment "MySQL privado"
ufw deny 3000/tcp comment "Backend privado"
ufw deny 9090/tcp comment "Prometheus privado"
ufw deny 3001/tcp comment "Grafana privado"

install -m 0644 infra/firewall/fail2ban-sshd.conf /etc/fail2ban/jail.d/predia-sshd.conf
systemctl enable --now fail2ban
ufw --force enable

echo "Firewall PREDIA aplicado."
ufw status verbose

