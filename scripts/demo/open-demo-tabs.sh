#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
require_command google-chrome
require_command tmux
umask 077

"${DEMO_DIR}/start-observability-tunnel.sh"

browser_session="${PREDIA_DEMO_TMUX_SESSION}-browser"
if tmux has-session -t "${browser_session}" 2>/dev/null; then
  die "Ya existe ${browser_session}. Usa stop-demo-browser.sh antes de abrir otro perfil."
fi

profile_dir="$(mktemp -d /tmp/predia-demo-chrome.XXXXXX)"
printf '%s\n' "${profile_dir}" > /tmp/predia-demo-chrome-current

printf -v launch_command \
  'env PREDIA_DEMO_BROWSER_PROFILE=%q bash %q >/tmp/predia-demo-chrome.log 2>&1; browser_rc=$?; printf "Chrome finalizo con codigo %%s\\n" "$browser_rc" >>/tmp/predia-demo-chrome.log; sleep 5; exit "$browser_rc"' \
  "${profile_dir}" \
  "${DEMO_DIR}/run-demo-browser.sh"

tmux new-session -d -s "${browser_session}" "${launch_command}"
for _attempt in $(seq 1 20); do
  if [ -f "${profile_dir}/DevToolsActivePort" ]; then
    debug_port="$(sed -n '1p' "${profile_dir}/DevToolsActivePort")"
    if curl -fsS "http://127.0.0.1:${debug_port}/json/version" >/dev/null 2>&1; then
      ok "Pestanas de demo abiertas en un proceso y perfil temporal separados."
      warn "Autentica Grafana ANTES de grabar y nunca muestres la contrasena."
      exit 0
    fi
  fi
  if ! tmux has-session -t "${browser_session}" 2>/dev/null; then
    break
  fi
  sleep 0.25
done

warn "Chrome no confirmo el perfil temporal; no uses sus pestanas para grabar."
printf 'Consulta /tmp/predia-demo-chrome.log sin mostrarlo durante la grabacion.\n' >&2
tmux kill-session -t "${browser_session}" 2>/dev/null || true
find "${profile_dir}" -depth -delete
exit 1
