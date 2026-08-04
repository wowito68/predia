#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${PREDIA_DOMAIN:-prediaa.duckdns.org}"
PRIVATE_HOST="${PREDIA_PRIVATE_HOST:-ec2-18-222-145-243.us-east-2.compute.amazonaws.com}"
PRIVATE_USER="${PREDIA_PRIVATE_USER:-ubuntu}"
SSH_KEY="${PREDIA_SSH_KEY:-${HOME}/Descargas/PREDIA.pem}"

section() {
  printf '\n\033[1;36m=== %s ===\033[0m\n' "$1"
}

[ -f "${SSH_KEY}" ] || {
  echo "No existe ${SSH_KEY}." >&2
  exit 1
}

ssh_private() {
  ssh -i "${SSH_KEY}" \
    -o BatchMode=yes \
    -o IdentitiesOnly=yes \
    -o ConnectTimeout=10 \
    "${PRIVATE_USER}@${PRIVATE_HOST}" "$@"
}

section "Servidor publico"
curl -fsS -o /dev/null -w 'Web HTTPS: %{http_code}\n' "https://${DOMAIN}/"
curl -fsS "https://${DOMAIN}/api/ready" |
  node -e 'let b="";process.stdin.on("data",c=>b+=c);process.stdin.on("end",()=>{const x=JSON.parse(b);console.log(`API: ${x.status}; base de datos: ${x.database}`)})'

declare -A replicas=()
for _request in $(seq 1 12); do
  instance="$(curl -fsS -D - -o /dev/null "https://${DOMAIN}/api/health" |
    awk 'tolower($1) == "x-predia-instance:" {gsub("\\r", "", $2); print $2}')"
  replicas["${instance}"]="$(( ${replicas["${instance}"]:-0} + 1 ))"
done
for instance in "${!replicas[@]}"; do
  printf '%s: %d respuestas\n' "${instance}" "${replicas["${instance}"]}"
done | sort
[ "${#replicas[@]}" -eq 2 ]

section "Servidor privado"
ssh_private 'bash -s' <<'REMOTE'
set -euo pipefail
printf 'Hostname: %s\n' "$(hostname)"
printf 'IP privada: %s\n' "$(hostname -I | awk '{print $1}')"
cd /home/ubuntu/predia-private
docker compose --env-file .env.private -f docker-compose.private.yml ps --format json |
  python3 -c 'import json,sys; rows=[json.loads(x) for x in sys.stdin if x.strip()]; [print("%s: %s/%s" % (x["Service"], x["State"], x.get("Health", "n/a") or "n/a")) for x in sorted(rows,key=lambda y:y["Service"])]'

printf '\nObjetivos Prometheus:\n'
curl -fsS 'http://127.0.0.1:9090/api/v1/targets?state=active' |
  python3 -c 'import json,sys; d=json.load(sys.stdin); [print("%s: %s" % (x["labels"].get("job"), x["health"])) for x in sorted(d["data"]["activeTargets"],key=lambda y:y["labels"].get("job",""))]'

sudo iptables -C DOCKER-USER -j PREDIA-PRIVATE
sudo iptables -C PREDIA-PRIVATE -d 169.254.169.254/32 -j DROP
printf 'UFW: %s\n' "$(sudo ufw status | awk 'NR==1 {print $2}')"
printf 'Fail2ban: %s\n' "$(systemctl is-active fail2ban)"
printf 'Backup diario: %s/%s; copias verificadas: %s\n' \
  "$(systemctl is-enabled predia-private-backup.timer)" \
  "$(systemctl is-active predia-private-backup.timer)" \
  "$(sudo find /home/ubuntu/predia-private/backups -maxdepth 1 -type f -name 'predia-*.sql.gz' | wc -l)"
REMOTE

section "Superficie publica del servidor privado"
for port in 80 443 3001 3306 9090; do
  if timeout 1 bash -c "</dev/tcp/${PRIVATE_HOST}/${port}" 2>/dev/null; then
    printf 'Puerto %s: EXPUESTO\n' "${port}"
    exit 1
  fi
  printf 'Puerto %s: cerrado\n' "${port}"
done

printf '\n\033[32mOK: arquitectura fisica de dos servidores validada.\033[0m\n'
