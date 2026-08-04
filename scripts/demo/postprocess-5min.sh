#!/usr/bin/env bash
set -euo pipefail

INPUT="${1:-}"
OUTPUT="${2:-}"

if [ -z "${INPUT}" ] || [ -z "${OUTPUT}" ]; then
  printf 'Uso: bash scripts/demo/postprocess-5min.sh entrada.mkv salida.mp4\n' >&2
  exit 1
fi
if [ ! -f "${INPUT}" ]; then
  printf 'No existe la grabacion: %s\n' "${INPUT}" >&2
  exit 1
fi
if [ "${INPUT}" = "${OUTPUT}" ]; then
  printf 'La salida debe ser distinta de la entrada.\n' >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1 || ! command -v ffprobe >/dev/null 2>&1; then
  cat >&2 <<'EOF'
FFmpeg no esta instalado. No se instalo automaticamente.

Comandos propuestos, previa autorizacion:
  sudo apt-get update
  sudo apt-get install -y ffmpeg

Justificacion: recortar/remultiplexar la grabacion de OBS a 300 segundos exactos
sin modificar el proyecto ni el VPS.
EOF
  exit 2
fi

duration="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${INPUT}")"
if ! awk -v duration="${duration}" 'BEGIN { exit !(duration >= 300) }'; then
  printf 'La toma dura %s segundos; debe durar al menos 300 para producir 5:00 exactos.\n' "${duration}" >&2
  exit 1
fi

ffmpeg -hide_banner -y \
  -i "${INPUT}" \
  -t 300 \
  -c:v libx264 \
  -preset medium \
  -crf 20 \
  -c:a aac \
  -b:a 160k \
  -movflags +faststart \
  "${OUTPUT}"

printf 'Video generado con limite de 5:00: %s\n' "${OUTPUT}"
