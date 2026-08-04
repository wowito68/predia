#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
require_command google-chrome

profile_dir="${PREDIA_DEMO_BROWSER_PROFILE:?Falta PREDIA_DEMO_BROWSER_PROFILE}"

exec google-chrome \
  --user-data-dir="${profile_dir}" \
  --remote-debugging-port=0 \
  --no-first-run \
  --no-default-browser-check \
  --disable-sync \
  --class=PREDIA-Demo \
  --new-window \
  "https://${PREDIA_DEMO_DOMAIN}/" \
  "https://${PREDIA_DEMO_DOMAIN}/login" \
  "http://127.0.0.1:${PREDIA_DEMO_GRAFANA_PORT}/d/predia-overview/predia-salud-del-sistema?orgId=1&refresh=15s" \
  "https://github.com/wowito68/predia/actions/workflows/main.yml"
