#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
require_command curl
require_command python3

: "${PREDIA_DEMO_STAFF_USER:=dr_juan}"
: "${PREDIA_DEMO_STAFF_PASSWORD:=password123}"
: "${PREDIA_DEMO_PATIENT_CURP:=ROGJ850515HMCRRN08}"
: "${PREDIA_DEMO_PATIENT_PIN:=123456}"

API_URL="${PREDIA_DEMO_API_URL:-https://${PREDIA_DEMO_DOMAIN}/api}"
MARKER="PREDIA_VALIDACION_NEGATIVA_$(date +%s)_${RANDOM}"

tmp_dir="$(mktemp -d /tmp/predia-validation-demo.XXXXXX)"
trap 'rm -rf "${tmp_dir}"' EXIT

json_object() {
  python3 - "$@" <<'PY'
import json
import sys

args = sys.argv[1:]
if len(args) % 2:
    raise SystemExit("json_object requiere pares llave/valor")
print(json.dumps(dict(zip(args[0::2], args[1::2]))))
PY
}

curl_json() {
  local method="$1"
  local url="$2"
  local body="$3"
  local token="$4"
  local output="$5"
  local args=(-sS -o "${output}" -w "%{http_code}" -X "${method}" -H "Content-Type: application/json")
  if [ -n "${token}" ]; then
    args+=(-H "Authorization: Bearer ${token}")
  fi
  args+=(--data "${body}" "${url}")
  curl "${args[@]}"
}

curl_get() {
  local url="$1"
  local token="$2"
  local output="$3"
  curl -sS -o "${output}" -w "%{http_code}" \
    -H "Authorization: Bearer ${token}" \
    "${url}"
}

parse_login_token() {
  local file="$1"
  local subject="$2"
  python3 - "${file}" "${subject}" <<'PY'
import json
import sys

path, subject = sys.argv[1], sys.argv[2]
payload = json.load(open(path, encoding="utf-8"))
if not payload.get("success") or not payload.get("token"):
    raise SystemExit(payload.get("error") or "login fallido")
print(payload["token"])
user = payload.get("user") or {}
if subject == "paciente":
    print(user.get("id_paciente") or "")
PY
}

summarize_error() {
  local file="$1"
  python3 - "${file}" <<'PY'
import json
import sys

payload = json.load(open(sys.argv[1], encoding="utf-8"))
print(f"Respuesta API: {payload.get('error') or payload.get('message') or 'sin mensaje'}")
details = payload.get("details") or []
if details:
    first = details[0]
    path = ".".join(str(part) for part in first.get("path", [])) or "payload"
    print(f"Detalle: {path} - {first.get('message', 'sin detalle')}")
PY
}

count_weight_marker() {
  local file="$1"
  python3 - "${file}" "${MARKER}" <<'PY'
import json
import sys

payload = json.load(open(sys.argv[1], encoding="utf-8"))
marker = sys.argv[2]
rows = payload.get("data") or []
matches = [
    row for row in rows
    if row.get("tipo") == "peso"
    and float(row.get("valor") or 0) == 999
    and marker in str(row.get("notas") or "")
]
print(len(matches))
PY
}

count_agenda_marker() {
  local file="$1"
  python3 - "${file}" "${MARKER}" <<'PY'
import json
import sys

payload = json.load(open(sys.argv[1], encoding="utf-8"))
marker = sys.argv[2]
rows = payload.get("data") or []
matches = [
    row for row in rows
    if marker in str(row.get("motivo") or row.get("motivo_consulta") or "")
]
print(len(matches))
PY
}

section "Autenticacion demo sin imprimir secretos"
patient_login_body="$(json_object curp "${PREDIA_DEMO_PATIENT_CURP}" pin "${PREDIA_DEMO_PATIENT_PIN}")"
patient_login_file="${tmp_dir}/patient-login.json"
patient_status="$(curl_json POST "${API_URL}/auth/login-paciente" "${patient_login_body}" "" "${patient_login_file}")"
[ "${patient_status}" = "200" ] || {
  summarize_error "${patient_login_file}" || true
  die "No fue posible autenticar paciente demo; HTTP ${patient_status}."
}
mapfile -t patient_session < <(parse_login_token "${patient_login_file}" paciente)
PATIENT_TOKEN="${patient_session[0]}"
PATIENT_ID="${patient_session[1]}"
[ -n "${PATIENT_ID}" ] || die "El login de paciente no devolvio id_paciente."
ok "Paciente demo autenticado; token oculto"

staff_login_body="$(json_object username "${PREDIA_DEMO_STAFF_USER}" password "${PREDIA_DEMO_STAFF_PASSWORD}")"
staff_login_file="${tmp_dir}/staff-login.json"
staff_status="$(curl_json POST "${API_URL}/auth/login" "${staff_login_body}" "" "${staff_login_file}")"
[ "${staff_status}" = "200" ] || {
  summarize_error "${staff_login_file}" || true
  die "No fue posible autenticar medico demo; HTTP ${staff_status}."
}
STAFF_TOKEN="$(parse_login_token "${staff_login_file}" staff)"
ok "Medico demo autenticado; token oculto"

section "Validacion de peso fuera de rango"
before_weight_file="${tmp_dir}/weight-before.json"
before_weight_status="$(curl_get "${API_URL}/pacientes/${PATIENT_ID}/automonitoreo?tipo=peso&dias=1" "${PATIENT_TOKEN}" "${before_weight_file}")"
[ "${before_weight_status}" = "200" ] || die "No se pudo leer automonitoreo antes; HTTP ${before_weight_status}."
before_weight_matches="$(count_weight_marker "${before_weight_file}")"
printf 'Coincidencias antes con marcador demo: %s\n' "${before_weight_matches}"

weight_body="$(python3 - "${MARKER}" <<'PY'
import json
import sys

print(json.dumps({
    "tipo": "peso",
    "valor": 999,
    "unidad": "kg",
    "notas": f"{sys.argv[1]} peso invalido"
}))
PY
)"
weight_file="${tmp_dir}/weight-invalid.json"
printf "curl -X POST '%s/pacientes/%s/automonitoreo' -H 'Authorization: Bearer <JWT paciente>' -d '%s'\n" \
  "${API_URL}" "${PATIENT_ID}" "${weight_body}"
weight_status="$(curl_json POST "${API_URL}/pacientes/${PATIENT_ID}/automonitoreo" "${weight_body}" "${PATIENT_TOKEN}" "${weight_file}")"
printf 'HTTP recibido: %s\n' "${weight_status}"
summarize_error "${weight_file}"
[ "${weight_status}" = "400" ] || die "El peso fuera de rango debio ser rechazado con HTTP 400."

after_weight_file="${tmp_dir}/weight-after.json"
after_weight_status="$(curl_get "${API_URL}/pacientes/${PATIENT_ID}/automonitoreo?tipo=peso&dias=1" "${PATIENT_TOKEN}" "${after_weight_file}")"
[ "${after_weight_status}" = "200" ] || die "No se pudo leer automonitoreo despues; HTTP ${after_weight_status}."
after_weight_matches="$(count_weight_marker "${after_weight_file}")"
printf 'Coincidencias despues con marcador demo: %s\n' "${after_weight_matches}"
[ "${after_weight_matches}" = "${before_weight_matches}" ] || die "El peso invalido quedo registrado."
ok "Peso 999 kg rechazado y no persistido"

section "Validacion de cita en fecha pasada"
before_agenda_file="${tmp_dir}/agenda-before.json"
before_agenda_status="$(curl_get "${API_URL}/agenda" "${STAFF_TOKEN}" "${before_agenda_file}")"
[ "${before_agenda_status}" = "200" ] || die "No se pudo leer agenda antes; HTTP ${before_agenda_status}."
before_agenda_matches="$(count_agenda_marker "${before_agenda_file}")"
printf 'Citas antes con marcador demo: %s\n' "${before_agenda_matches}"

past_date="$(date -u -d '5 minutes ago' '+%Y-%m-%dT%H:%M:%SZ')"
appointment_body="$(python3 - "${PATIENT_ID}" "${past_date}" "${MARKER}" <<'PY'
import json
import sys

print(json.dumps({
    "id_paciente": int(sys.argv[1]),
    "fecha": sys.argv[2],
    "motivo": f"{sys.argv[3]} cita fecha pasada"
}))
PY
)"
appointment_file="${tmp_dir}/appointment-invalid.json"
printf "curl -X POST '%s/agenda' -H 'Authorization: Bearer <JWT medico>' -d '%s'\n" \
  "${API_URL}" "${appointment_body}"
appointment_status="$(curl_json POST "${API_URL}/agenda" "${appointment_body}" "${STAFF_TOKEN}" "${appointment_file}")"
printf 'HTTP recibido: %s\n' "${appointment_status}"
summarize_error "${appointment_file}"
[ "${appointment_status}" = "400" ] || die "La cita en fecha pasada debio ser rechazada con HTTP 400."

after_agenda_file="${tmp_dir}/agenda-after.json"
after_agenda_status="$(curl_get "${API_URL}/agenda" "${STAFF_TOKEN}" "${after_agenda_file}")"
[ "${after_agenda_status}" = "200" ] || die "No se pudo leer agenda despues; HTTP ${after_agenda_status}."
after_agenda_matches="$(count_agenda_marker "${after_agenda_file}")"
printf 'Citas despues con marcador demo: %s\n' "${after_agenda_matches}"
[ "${after_agenda_matches}" = "${before_agenda_matches}" ] || die "La cita invalida quedo registrada."
ok "Cita en fecha pasada rechazada y no persistida"

section "Resultado"
ok "Validaciones de servidor demostradas: datos invalidos no se guardan"
