#!/usr/bin/env bash
set -u -o pipefail

# shellcheck source=./lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

if [ -t 1 ] && [ "${TERM:-dumb}" != "dumb" ]; then
  C_RESET='\033[0m'
  C_DIM='\033[2m'
  C_BOLD='\033[1m'
  C_TEAL='\033[38;5;37m'
  C_BLUE='\033[38;5;75m'
  C_GREEN='\033[38;5;78m'
  C_AMBER='\033[38;5;214m'
  C_RED='\033[38;5;203m'
else
  C_RESET=''
  C_DIM=''
  C_BOLD=''
  C_TEAL=''
  C_BLUE=''
  C_GREEN=''
  C_AMBER=''
  C_RED=''
fi

declare -A RESULTS=()
BATCH_MODE=0

clear_screen() {
  if [ -t 1 ]; then
    printf '\033[2J\033[H'
  fi
}

banner() {
  printf "${C_TEAL}${C_BOLD}+--------------------------------------------------------------------------+${C_RESET}\n"
  printf "${C_TEAL}${C_BOLD}|  PREDIA / CENTRO DE EVIDENCIA TECNICA                                   |${C_RESET}\n"
  printf "${C_TEAL}${C_BOLD}+--------------------------------------------------------------------------+${C_RESET}\n"
  printf "  ${C_DIM}Pruebas seguras | Carga temporal limitada | Sin datos clinicos${C_RESET}\n\n"
}

wrapped_text() {
  printf '%s\n' "$1" | fold -s -w 70 | sed 's/^/  /'
}

describe_evidence() {
  local purpose=''
  local proof=''

  case "$1" in
    crypto)
      purpose='Ejecuta pruebas contra las funciones de PREDIA que generan hashes bcrypt y cifran campos sensibles con AES-256-GCM.'
      proof='Crea contrasenas, llaves y textos nuevos en cada ejecucion. Invoca el codigo de la aplicacion y falla si el hash conserva el texto, si el descifrado no coincide o si una llave incorrecta es aceptada.'
      ;;
    jwt)
      purpose='Valida firma HS256, emisor, audiencia, expiracion y manipulacion. Despues solicita /api/pacientes sin credenciales y con un JWT invalido.'
      proof='La primera parte usa las funciones reales de autenticacion del proyecto. La segunda viaja por HTTPS hasta la API desplegada y comprueba su respuesta HTTP 401 actual.'
      ;;
    firewall)
      purpose='Consulta UFW, Fail2ban y la cadena PREDIA-PRIVATE que protege los puertos publicados por Docker.'
      proof='Se conecta por SSH a la EC2 privada y lee el estado activo del kernel y de systemd. No muestra una copia de configuracion guardada: la prueba falla si las reglas no estan aplicadas ahora.'
      ;;
    tls)
      purpose='Comprueba la redireccion HTTP a HTTPS, consulta readiness y realiza un handshake TLS con SNI para leer el certificado servido.'
      proof='openssl obtiene el certificado directamente de prediaa.duckdns.org:443. El emisor, vigencia y huella corresponden al certificado que recibe un cliente en ese momento.'
      ;;
    balance)
      purpose='Envia doce solicitudes HTTPS a /api/health y agrupa la cabecera X-PREDIA-Instance devuelta por cada respuesta.'
      proof='Cada replica inserta su propio identificador al responder. Observar dos identificadores distintos demuestra trafico atendido por dos procesos reales detras de Nginx.'
      ;;
    monitoring)
      purpose='Consulta la API interna de Prometheus, cuenta sus objetivos activos y verifica la base interna de Grafana.'
      proof='Las respuestas se leen desde los servicios que se ejecutan en la segunda EC2 mediante un tunel SSH. Grafana y Prometheus no estan publicados en Internet.'
      ;;
    pulse)
      purpose='Abre Grafana y genera durante 50 segundos una carga de CPU limitada en la EC2 privada para cambiar la grafica en vivo.'
      proof='La carga se ejecuta como una unidad temporal de systemd con cuota y caducidad. Prometheus recopila la CPU real del host y el script exige observar un incremento antes de aprobar.'
      ;;
    validation)
      purpose='Envia dos escrituras invalidas por curl: un peso de 999 kg y una cita con fecha pasada.'
      proof='La API debe responder HTTP 400 y despues se consulta de nuevo con un marcador unico para confirmar que esos datos no quedaron registrados.'
      ;;
    ufw_verbose)
      purpose='Muestra las reglas activas de UFW con sudo ufw status verbose en el servidor configurado para la demo.'
      proof='La evidencia se obtiene por SSH en vivo contra la EC2. El script falla si UFW no esta activo o si no puede leer las reglas actuales del firewall.'
      ;;
  esac

  printf "${C_AMBER}${C_BOLD}QUE HACE${C_RESET}\n"
  wrapped_text "${purpose}"
  printf "\n${C_TEAL}${C_BOLD}POR QUE ES UNA PRUEBA REAL${C_RESET}\n"
  wrapped_text "${proof}"
  printf '\n'
}

result_badge() {
  case "${RESULTS[$1]:-}" in
    ok) printf "${C_GREEN}[OK]${C_RESET}" ;;
    fail) printf "${C_RED}[X] ${C_RESET}" ;;
    *) printf "${C_DIM}[ ] ${C_RESET}" ;;
  esac
}

menu() {
  clear_screen
  banner
  printf "  %b  ${C_BOLD}1  Criptografia${C_RESET}        bcrypt + AES-256-GCM\n" "$(result_badge crypto)"
  printf "  %b  ${C_BOLD}2  Proteccion JWT${C_RESET}      firma, expiracion y API HTTP 401\n" "$(result_badge jwt)"
  printf "  %b  ${C_BOLD}3  Firewall${C_RESET}            UFW + Fail2ban + filtro Docker\n" "$(result_badge firewall)"
  printf "  %b  ${C_BOLD}4  Certificado SSL${C_RESET}     HTTPS, issuer y vigencia\n" "$(result_badge tls)"
  printf "  %b  ${C_BOLD}5  Balanceador${C_RESET}         trafico entre replicas reales\n" "$(result_badge balance)"
  printf "  %b  ${C_BOLD}6  Monitoreo${C_RESET}           Prometheus + Grafana\n" "$(result_badge monitoring)"
  printf "  %b  ${C_BOLD}7  Pulso en Grafana${C_RESET}    actualizacion visible en tiempo real\n" "$(result_badge pulse)"
  printf "  %b  ${C_BOLD}8  Validacion API${C_RESET}      datos invalidos no se guardan\n" "$(result_badge validation)"
  printf "  %b  ${C_BOLD}9  UFW verbose${C_RESET}         reglas activas del firewall\n" "$(result_badge ufw_verbose)"
  printf '\n'
  printf "  ${C_BLUE}${C_BOLD}A${C_RESET}  Ejecutar todas las evidencias\n"
  printf "  ${C_BLUE}${C_BOLD}G${C_RESET}  Abrir dashboard de Grafana\n"
  printf "  ${C_DIM}Q  Salir${C_RESET}\n\n"
  printf "${C_TEAL}Selecciona una opcion:${C_RESET} "
}

pause_demo() {
  if [ -t 0 ]; then
    printf "\n${C_DIM}Presiona Enter para volver al panel...${C_RESET}"
    read -r _unused
  fi
}

execute() {
  local key="$1"
  local title="$2"
  shift 2

  if [ "${BATCH_MODE}" -eq 0 ]; then
    clear_screen
    banner
  fi
  printf "${C_BLUE}${C_BOLD}EVIDENCIA / %s${C_RESET}\n\n" "${title}"
  describe_evidence "${key}"
  if "$@"; then
    RESULTS["${key}"]="ok"
    printf "\n${C_GREEN}${C_BOLD}[ VERIFICACION APROBADA ]${C_RESET} %s\n" "${title}"
    return 0
  fi

  RESULTS["${key}"]="fail"
  printf "\n${C_RED}${C_BOLD}[ VERIFICACION FALLIDA ]${C_RESET} %s\n" "${title}" >&2
  return 1
}

crypto() {
  execute crypto "HASH Y CIFRADO" "${DEMO_DIR}/security-tests.sh" crypto
}

jwt() {
  execute jwt "PROTECCION JWT" "${DEMO_DIR}/jwt-api-demo.sh"
}

firewall() {
  execute firewall "FIREWALL" "${DEMO_DIR}/production-readonly.sh" firewall
}

tls() {
  execute tls "CERTIFICADO SSL" "${DEMO_DIR}/production-readonly.sh" tls
}

balance() {
  execute balance "BALANCEADOR DE CARGA" "${DEMO_DIR}/production-readonly.sh" balance
}

monitoring() {
  execute monitoring "MONITOREO" "${DEMO_DIR}/production-readonly.sh" monitoring
}

pulse() {
  if [ "${BATCH_MODE}" -eq 1 ]; then
    execute pulse "PULSO EN GRAFANA" "${DEMO_DIR}/grafana-live-pulse.sh" --no-open
  else
    execute pulse "PULSO EN GRAFANA" "${DEMO_DIR}/grafana-live-pulse.sh"
  fi
}

validation() {
  execute validation "VALIDACION DE DATOS" "${DEMO_DIR}/data-validation-demo.sh"
}

ufw_verbose() {
  execute ufw_verbose "REGLAS UFW ACTIVAS" "${DEMO_DIR}/ufw-status-demo.sh"
}

all_evidence() {
  local failures=0
  local result=0

  clear_screen
  banner
  printf "${C_BLUE}${C_BOLD}RECORRIDO COMPLETO DE LA RUBRICA${C_RESET}\n\n"
  BATCH_MODE=1
  crypto || failures=$((failures + 1))
  jwt || failures=$((failures + 1))
  firewall || failures=$((failures + 1))
  tls || failures=$((failures + 1))
  balance || failures=$((failures + 1))
  monitoring || failures=$((failures + 1))
  pulse || failures=$((failures + 1))
  validation || failures=$((failures + 1))
  ufw_verbose || failures=$((failures + 1))
  BATCH_MODE=0

  printf '\n'
  if [ "${failures}" -eq 0 ]; then
    printf "${C_GREEN}${C_BOLD}TODAS LAS EVIDENCIAS FUERON APROBADAS${C_RESET}\n"
  else
    printf "${C_RED}${C_BOLD}%d EVIDENCIA(S) REQUIEREN REVISION${C_RESET}\n" "${failures}" >&2
    result=1
  fi
  pause_demo
  return "${result}"
}

case "${1:-interactive}" in
  --all)
    all_evidence
    exit $?
    ;;
  --check-grafana)
    "${DEMO_DIR}/open-grafana.sh" --check
    exit $?
    ;;
  interactive) ;;
  *) die "Uso: bash scripts/demo/predia-live-demo.sh [--all|--check-grafana]" ;;
esac

while true; do
  menu
  if ! read -r choice; then
    printf '\n'
    exit 0
  fi
  case "${choice^^}" in
    1) crypto; pause_demo ;;
    2) jwt; pause_demo ;;
    3) firewall; pause_demo ;;
    4) tls; pause_demo ;;
    5) balance; pause_demo ;;
    6) monitoring; pause_demo ;;
    7) pulse; pause_demo ;;
    8) validation; pause_demo ;;
    9) ufw_verbose; pause_demo ;;
    A) all_evidence ;;
    G) "${DEMO_DIR}/open-grafana.sh"; pause_demo ;;
    Q) clear_screen; exit 0 ;;
    *) printf "\n${C_AMBER}Opcion no reconocida.${C_RESET}\n"; sleep 1 ;;
  esac
done
