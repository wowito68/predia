#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Ejecuta este script con sudo." >&2
  exit 1
fi

ADMIN_CIDR="${ADMIN_CIDR:?Define ADMIN_CIDR con la IP autorizada para SSH}"
PUBLIC_SERVER_CIDR="${PUBLIC_SERVER_CIDR:?Define PUBLIC_SERVER_CIDR con la IP privada del servidor publico}"
SSH_PORT="${SSH_PORT:-22}"

for cidr in "${ADMIN_CIDR}" "${PUBLIC_SERVER_CIDR}"; do
  if ! [[ "${cidr}" =~ ^[0-9a-fA-F:.]+/[0-9]+$ ]]; then
    echo "CIDR no valido: ${cidr}" >&2
    exit 1
  fi
done

command -v ufw >/dev/null 2>&1 || {
  echo "UFW no esta instalado." >&2
  exit 1
}
command -v fail2ban-client >/dev/null 2>&1 || {
  echo "Fail2ban no esta instalado." >&2
  exit 1
}
command -v docker >/dev/null 2>&1 || {
  echo "Docker no esta instalado." >&2
  exit 1
}

backup_dir="/var/backups/predia-private-firewall"
backup_file="${backup_dir}/ufw-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
install -d -m 0700 "${backup_dir}"
umask 077
tar -czf "${backup_file}" /etc/ufw /etc/default/ufw /etc/fail2ban 2>/dev/null || true
ufw status verbose > "${backup_file%.tar.gz}.status.txt" 2>&1 || true
iptables-save > "${backup_file%.tar.gz}.iptables" 2>/dev/null || true

sshd -t
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw default deny routed
ufw logging low
ufw allow from "${ADMIN_CIDR}" to any port "${SSH_PORT}" proto tcp comment "SSH administracion"
ufw allow from "${PUBLIC_SERVER_CIDR}" to any port "${SSH_PORT}" proto tcp comment "SSH desde servidor publico"
ufw allow from "${PUBLIC_SERVER_CIDR}" to any port 3306 proto tcp comment "MySQL desde servidor publico"
ufw --force enable

install -d -m 0755 /etc/predia-private
printf 'PUBLIC_SERVER_CIDR=%s\nMYSQL_PORT=3306\n' "${PUBLIC_SERVER_CIDR}" \
  > /etc/predia-private/firewall.env
chmod 0600 /etc/predia-private/firewall.env
install -m 0755 infra/firewall/private-docker-filter.sh \
  /usr/local/sbin/predia-private-docker-filter
install -m 0644 infra/firewall/predia-private-docker-firewall.service \
  /etc/systemd/system/predia-private-docker-firewall.service
install -m 0644 infra/firewall/fail2ban-sshd.conf \
  /etc/fail2ban/jail.d/predia-sshd.conf

systemctl daemon-reload
systemctl enable --now fail2ban
systemctl enable --now predia-private-docker-firewall.service

echo "Firewall privado aplicado. Respaldo: ${backup_file}"
ufw status verbose
