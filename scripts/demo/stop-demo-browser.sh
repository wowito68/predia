#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

browser_session="${PREDIA_DEMO_TMUX_SESSION}-browser"
profile_pointer="/tmp/predia-demo-chrome-current"
if tmux has-session -t "${browser_session}" 2>/dev/null; then
  tmux kill-session -t "${browser_session}"
  ok "Navegador aislado de demo cerrado"
else
  warn "No habia una sesion de navegador de demo activa."
fi

if [ -f "${profile_pointer}" ]; then
  profile_dir="$(sed -n '1p' "${profile_pointer}")"
  case "${profile_dir}" in
    /tmp/predia-demo-chrome.*)
      if [ -d "${profile_dir}" ] && [ -O "${profile_dir}" ]; then
        for _attempt in $(seq 1 20); do
          if ! pgrep -f -- "[g]oogle-chrome.*--user-data-dir=${profile_dir}" >/dev/null; then
            break
          fi
          sleep 0.25
        done
        if pgrep -f -- "[g]oogle-chrome.*--user-data-dir=${profile_dir}" >/dev/null; then
          die "Chrome sigue usando el perfil temporal; vuelve a ejecutar este script."
        fi
        if ! find "${profile_dir}" -depth -delete; then
          die "No se pudo eliminar completamente el perfil temporal; vuelve a ejecutar este script."
        fi
        ok "Perfil temporal y cookies locales eliminados"
      fi
      ;;
    *)
      die "La referencia del perfil temporal no es segura: ${profile_dir}"
      ;;
  esac
  unlink "${profile_pointer}"
fi
