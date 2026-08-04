#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
require_command tmux

session="${PREDIA_DEMO_TMUX_SESSION}"
demo_shell="env PS1='PREDIA demo > ' bash --noprofile --norc"
if tmux has-session -t "${session}" 2>/dev/null; then
  warn "La sesion ${session} ya existe. No se modifico."
  printf 'Abrir con: tmux attach -t %s\n' "${session}"
  exit 0
fi

tmux new-session -d -s "${session}" -n guion -c "${ROOT_DIR}" "${demo_shell}"
tmux send-keys -t "${session}:guion" \
  "less scripts/demo/demo-script.md" Enter

tmux new-window -d -t "${session}" -n seguridad -c "${ROOT_DIR}" "${demo_shell}"
tmux send-keys -t "${session}:seguridad" \
  "bash scripts/demo/security-tests.sh"

tmux new-window -d -t "${session}" -n infraestructura -c "${ROOT_DIR}" "${demo_shell}"
tmux send-keys -t "${session}:infraestructura" \
  "bash scripts/infra/verify-two-server-architecture.sh"

tmux new-window -d -t "${session}" -n tls-balanceo -c "${ROOT_DIR}" "${demo_shell}"
tmux send-keys -t "${session}:tls-balanceo" \
  "bash scripts/demo/production-readonly.sh tls && bash scripts/demo/production-readonly.sh balance"

tmux new-window -d -t "${session}" -n monitoreo -c "${ROOT_DIR}" "${demo_shell}"
tmux send-keys -t "${session}:monitoreo" \
  "bash scripts/demo/start-observability-tunnel.sh && node scripts/demo/monitoring-summary.mjs"

tmux new-window -d -t "${session}" -n evidencia -c "${ROOT_DIR}" "${demo_shell}"
tmux send-keys -t "${session}:evidencia" \
  "bash scripts/demo/ci-recovery-evidence.sh"

tmux set-option -t "${session}" status on
tmux set-option -t "${session}" status-style 'bg=#123f4a,fg=#ffffff'
tmux select-window -t "${session}:guion"

ok "Sesion tmux preparada; solo el guion se abrio automaticamente."
printf 'Los demas comandos estan escritos pero NO ejecutados.\n'
printf 'Abrir con: tmux attach -t %s\n' "${session}"
