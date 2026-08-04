#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Ejecuta este script con sudo." >&2
  exit 1
fi

PUBLIC_SERVER_CIDR="${PUBLIC_SERVER_CIDR:?Define PUBLIC_SERVER_CIDR, por ejemplo 172.31.37.174/32}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
CHAIN="PREDIA-PRIVATE"

iptables -N "${CHAIN}" 2>/dev/null || true
iptables -F "${CHAIN}"
iptables -A "${CHAIN}" -d 169.254.169.254/32 -j DROP
iptables -A "${CHAIN}" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -A "${CHAIN}" -p tcp -s "${PUBLIC_SERVER_CIDR}" --dport "${MYSQL_PORT}" -j RETURN
iptables -A "${CHAIN}" -p tcp --dport "${MYSQL_PORT}" -j DROP
iptables -A "${CHAIN}" -j RETURN

while iptables -C DOCKER-USER -j "${CHAIN}" 2>/dev/null; do
  iptables -D DOCKER-USER -j "${CHAIN}"
done
iptables -I DOCKER-USER 1 -j "${CHAIN}"

echo "Filtro Docker aplicado: MySQL solo desde ${PUBLIC_SERVER_CIDR}."
