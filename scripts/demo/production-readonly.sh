#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

MODE="${1:-all}"
case "${MODE}" in
  all|services|firewall|tls|balance|monitoring|recovery) ;;
  *) die "Uso: bash scripts/demo/production-readonly.sh [all|services|firewall|tls|balance|monitoring|recovery]" ;;
esac

services() {
  section "Servicios y redes del servidor privado"
  ssh_demo 'bash -s' <<'REMOTE'
set -euo pipefail
sudo docker ps \
  --filter name=predia \
  --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'

printf '\nRedes Docker (sin inspeccionar variables ni secretos):\n'
for network in \
  predia_predia-public \
  predia_predia-private \
  predia_predia-monitoring \
  predia_predia-admin \
  predia-private_data \
  predia-private_monitoring; do
  sudo docker network inspect "${network}" \
    --format '{{.Name}} internal={{.Internal}} containers={{len .Containers}}' \
    2>/dev/null || true
done
REMOTE
}

firewall() {
  section "Firewall y proteccion SSH"
  ssh_demo 'bash -s' <<'REMOTE'
set -euo pipefail
sudo ufw status verbose | awk '/^Status:|^Logging:|^Default:/'
sudo ufw status | grep -q '^Status: active'
printf '\nFail2ban sshd (sin mostrar IP bloqueadas):\n'
sudo fail2ban-client status sshd | awk -F: '
  /Currently failed|Total failed|Currently banned|Total banned/ {
    gsub(/^[ \t]+/, "", $2)
    print $1 ": " $2
  }
'
systemctl is-active --quiet fail2ban

printf '\nFiltro de contenedores:\n'
docker_rules="$(sudo iptables -S PREDIA-PRIVATE)"
if grep -q -- '-d 169.254.169.254/32 -j DROP' <<<"${docker_rules}"; then
  printf 'Metadata EC2 desde contenedores: BLOQUEADA\n'
else
  printf 'Metadata EC2 desde contenedores: SIN REGLA\n' >&2
  exit 1
fi
if grep -q -- '--dport 3306 -j DROP' <<<"${docker_rules}" && \
   grep -q -- '--dport 3306 -j RETURN' <<<"${docker_rules}"; then
  printf 'MySQL 3306: SOLO SERVIDOR PUBLICO\n'
else
  printf 'MySQL 3306: REGLAS INCOMPLETAS\n' >&2
  exit 1
fi
REMOTE
  ok "Firewall UFW, Fail2ban y filtro Docker verificados"
}

tls() {
  section "HTTPS y disponibilidad"
  redirect="$(curl -sS -o /dev/null -w 'HTTP %{http_code} -> %{redirect_url}' "http://${PREDIA_DEMO_DOMAIN}/")"
  printf '%s\n' "${redirect}"
  curl -fsS "https://${PREDIA_DEMO_DOMAIN}/api/ready"
  printf '\n\nCertificado publico:\n'
  openssl s_client \
    -connect "${PREDIA_DEMO_DOMAIN}:443" \
    -servername "${PREDIA_DEMO_DOMAIN}" \
    </dev/null 2>/dev/null | \
    openssl x509 -noout -subject -issuer -dates -fingerprint -sha256
}

balance() {
  section "Balanceo entre replicas"
  declare -A counts=()
  local instance
  for _request in $(seq 1 12); do
    instance="$(
      curl -fsS -D - -o /dev/null "https://${PREDIA_DEMO_DOMAIN}/api/health" |
        awk 'tolower($1) == "x-predia-instance:" { gsub("\\r", "", $2); print $2 }'
    )"
    [ -n "${instance}" ] || die "La API no devolvio X-PREDIA-Instance."
    counts["${instance}"]="$(( ${counts["${instance}"]:-0} + 1 ))"
  done

  for instance in "${!counts[@]}"; do
    printf '%2d  %s\n' "${counts["${instance}"]}" "${instance}"
  done | sort -k2

  [ "${#counts[@]}" -ge 2 ] || die "Solo se observo una replica."
  ok "Se observaron ${#counts[@]} replicas"
}

monitoring() {
  section "Prometheus y Grafana"
  ssh_demo 'bash -s' <<'REMOTE'
set -euo pipefail
printf 'Prometheus: '
curl -fsS http://127.0.0.1:9090/-/ready
printf '\n'
curl -fsS http://127.0.0.1:9090/api/v1/targets | python3 -c '
import json
import sys

payload = json.load(sys.stdin)
targets = payload["data"]["activeTargets"]
healthy = sum(target.get("health") == "up" for target in targets)
print(f"Objetivos monitoreados: {healthy}/{len(targets)} UP")
if healthy != len(targets):
    raise SystemExit(1)
'
printf '\nGrafana: '
curl -fsS http://127.0.0.1:3001/api/health
printf '\n'
REMOTE
  ok "Prometheus recopila objetivos reales y Grafana responde correctamente"
}

recovery() {
  section "Evidencia de recuperacion"
  printf 'Scripts versionados (no se ejecutan):\n'
  printf '  scripts/backup/production-backup.sh\n'
  printf '  scripts/restore/production-restore.sh\n'
  printf '  scripts/deploy/rollback-production.sh\n\n'
  printf -v remote_command 'PREDIA_REMOTE_DIR=%q bash -s' "${PREDIA_DEMO_REMOTE_DIR}"
  ssh_demo "${remote_command}" <<'REMOTE'
set -u
printf 'Timer de backup habilitado: '
if systemctl is-enabled predia-private-backup.timer >/dev/null 2>&1; then
  printf 'si\n'
else
  printf 'no instalado\n'
fi
printf 'Timer de backup activo: '
if systemctl is-active predia-private-backup.timer >/dev/null 2>&1; then
  printf 'si\n'
else
  printf 'inactivo\n'
fi
printf 'Respaldos encontrados (solo conteo): '
sudo find "${PREDIA_REMOTE_DIR}/backups" -maxdepth 1 -type f -name '*.sql.gz' 2>/dev/null | wc -l
REMOTE
}

if [ "${MODE}" = "all" ]; then
  tls
  services
  firewall
  balance
  monitoring
  recovery
else
  "${MODE}"
fi
