#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${PREDIA_ENV_FILE:-${ROOT_DIR}/.env.production}"

read_env() {
  local key="$1"
  awk -F= -v key="${key}" '
    $0 !~ /^[[:space:]]*#/ && $1 == key {
      value = substr($0, index($0, "=") + 1)
      gsub(/^[[:space:]"'\'' ]+|[[:space:]"'\'' ]+$/, "", value)
      print value
      exit
    }
  ' "${ENV_FILE}"
}

if [ ! -f "${ENV_FILE}" ]; then
  echo "Falta ${ENV_FILE}. Crea el archivo a partir de .env.production.example." >&2
  exit 1
fi

DOMAIN="${PREDIA_DOMAIN:-$(read_env PREDIA_DOMAIN)}"
EMAIL="${LETSENCRYPT_EMAIL:-$(read_env LETSENCRYPT_EMAIL)}"

if [ -z "${DOMAIN}" ] || [ -z "${EMAIL}" ]; then
  echo "PREDIA_DOMAIN y LETSENCRYPT_EMAIL son obligatorios." >&2
  exit 1
fi

PUBLIC_IP="$(curl -4fsS https://checkip.amazonaws.com | tr -d '[:space:]')"
DNS_IPS="$(getent ahostsv4 "${DOMAIN}" | awk '{print $1}' | sort -u)"

if ! grep -Fxq "${PUBLIC_IP}" <<<"${DNS_IPS}"; then
  echo "El DNS de ${DOMAIN} aun no apunta a ${PUBLIC_IP}." >&2
  echo "IPs observadas: ${DNS_IPS:-ninguna}" >&2
  exit 1
fi

sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y certbot

if command -v docker >/dev/null 2>&1; then
  sudo docker compose --env-file "${ENV_FILE}" -f "${ROOT_DIR}/docker-compose.production.yml" stop predia-proxy >/dev/null 2>&1 || true
fi

sudo systemctl stop nginx >/dev/null 2>&1 || true
sudo mkdir -p /var/www/certbot

sudo certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --keep-until-expiring \
  --preferred-challenges http \
  --email "${EMAIL}" \
  -d "${DOMAIN}"

CERT_PATH="/etc/letsencrypt/live/${DOMAIN}"
ALIAS_PATH="/etc/letsencrypt/live/predia"

if [ "${CERT_PATH}" != "${ALIAS_PATH}" ]; then
  if [ -e "${ALIAS_PATH}" ] && [ ! -L "${ALIAS_PATH}" ]; then
    echo "${ALIAS_PATH} existe y no es un enlace simbolico; no se modifico." >&2
    exit 1
  fi
  sudo ln -sfn "${CERT_PATH}" "${ALIAS_PATH}"
fi

sudo install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
sudo tee /etc/letsencrypt/renewal-hooks/deploy/predia-reload-proxy.sh >/dev/null <<'EOF'
#!/usr/bin/env sh
docker kill --signal=HUP predia-proxy >/dev/null 2>&1 || true
EOF
sudo chmod 0755 /etc/letsencrypt/renewal-hooks/deploy/predia-reload-proxy.sh
sudo systemctl enable --now certbot.timer >/dev/null 2>&1 || true

echo "Certificado TLS preparado para ${DOMAIN}."
