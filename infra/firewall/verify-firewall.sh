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

