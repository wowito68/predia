#!/usr/bin/env bash
set -euo pipefail

echo "== UFW status =="
ufw status verbose || true

echo
echo "== Fail2ban sshd =="
fail2ban-client status sshd || true

echo
echo "== Puertos escuchando =="
ss -ltnp || true

echo
echo "== Reglas UFW agregadas =="
ufw show added || true

echo
echo "== Ultimos bloqueos UFW =="
journalctl -k --since "30 minutes ago" --no-pager | grep -F "[UFW BLOCK]" | tail -n 30 || true
