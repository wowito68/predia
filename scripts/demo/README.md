# Demostracion tecnica en vivo de PREDIA

Panel local para presentar seguridad e infraestructura sin abrir archivos de configuracion, imprimir secretos ni modificar datos clinicos. Las opciones 1 a 6 y 9 son de solo lectura; la opcion 7 crea una carga temporal limitada en la EC2 de monitoreo.

## Inicio rapido

Desde la raiz del repositorio:

```bash
./scripts/demo/predia-live-demo.sh
```

El panel permite demostrar por separado:

1. Hash bcrypt y cifrado autenticado AES-256-GCM.
2. Firma y validacion JWT, mas rechazo HTTP 401 de la API publicada.
3. UFW, Fail2ban y filtrado de red para contenedores.
4. Redireccion HTTPS, estado de la API y certificado TLS real.
5. Distribucion de solicitudes entre las replicas de la API.
6. Salud de Prometheus y Grafana en el servidor privado.
7. Pulso controlado para observar una grafica de Grafana cambiar en vivo.
8. Validaciones de servidor que rechazan datos clinicos invalidos.
9. Reglas activas de UFW con `sudo ufw status verbose`.

La opcion `A` ejecuta el recorrido completo. La opcion `P` ejecuta solo evidencias publicas cuando todavia no tienes SSH por cambio de IP. La opcion `D` diagnostica tu IP publica actual y el acceso SSH cuando cambias de red. Cada evidencia aprobada queda marcada en el menu durante la sesion.

## Por que las evidencias son reales

El panel no reproduce capturas ni imprime resultados escritos manualmente. Cada opcion obtiene evidencia nueva durante la ejecucion:

| Evidencia | Comprobacion real |
|---|---|
| bcrypt y AES-256-GCM | Jest importa las funciones de produccion, genera datos efimeros y prueba casos correctos y manipulados. |
| JWT | Se ejercita el verificador del proyecto y se realizan solicitudes HTTPS a la API desplegada esperando HTTP 401. |
| Firewall | SSH consulta el estado activo de UFW, Fail2ban e iptables en la segunda EC2. |
| SSL | OpenSSL negocia TLS con el dominio y lee el certificado entregado en ese instante. |
| Balanceador | Doce solicitudes reales cuentan la cabecera emitida por cada replica de Next.js. |
| Monitoreo | Se consulta la API activa de Prometheus y la salud interna de Grafana por un tunel SSH. |
| Pulso en Grafana | systemd genera carga de CPU con cuota y caducidad; Prometheus debe detectar el incremento real. |
| Validacion API | curl intenta guardar datos invalidos y la API debe responder HTTP 400; despues se consulta que no exista el marcador demo. |
| UFW verbose | SSH ejecuta `sudo ufw status verbose` en el servidor configurado para la demo, y falla si UFW no esta activo. |

Todos los chequeos tienen condiciones de fallo. Si un token invalido fuera aceptado, una regla no estuviera aplicada, el certificado no respondiera, solo existiera una replica o un objetivo de Prometheus estuviera caido, la evidencia se marca como fallida y el modo `--all` devuelve un codigo distinto de cero.

## Abrir Grafana

```bash
./scripts/demo/open-grafana.sh
```

El comando reutiliza o crea el tunel SSH y abre directamente `PREDIA - Salud del sistema`. Grafana permanece enlazado a `127.0.0.1` en el servidor privado y no se expone a Internet.

Para validar el acceso sin abrir el navegador:

```bash
bash scripts/demo/open-grafana.sh --check
```

Si cambiaste de red y Grafana no abre, primero ejecuta:

```bash
bash scripts/demo/ssh-access-doctor.sh check
```

El diagnostico imprime tu IP publica actual. Si tienes AWS CLI configurado, puedes autorizar temporalmente esa IP para SSH al servidor privado con:

```bash
bash scripts/demo/ssh-access-doctor.sh allow-private
```

Si durante la evaluacion te moveras de red y no puedes actualizar la IP en tiempo real, existe un modo temporal de demo:

```bash
bash scripts/demo/ssh-access-doctor.sh allow-private-anywhere
```

Esto abre SSH `22` desde `0.0.0.0/0` en el Security Group privado. Debe usarse solo mientras presentas, con SSH por llave, `PasswordAuthentication no`, `PermitRootLogin no`, UFW y Fail2ban activos. Si UFW dentro del VPS tambien limita por IP, entra una vez al servidor y ejecuta:

Si no tienes AWS CLI, el cambio equivalente en consola AWS es:

```text
EC2 > Security Groups > sg-0cfbdcb57a224f9a5 > Edit inbound rules
Add rule: SSH | TCP | 22 | Source 0.0.0.0/0
Description: PREDIA demo SSH temporal any network
```

```bash
sudo bash infra/firewall/demo-anywhere-ssh.sh enable
```

Despues de presentar, revoca la misma IP:

```bash
bash scripts/demo/ssh-access-doctor.sh revoke-private
```

Si activaste el modo abierto, revocalo tambien:

```bash
bash scripts/demo/ssh-access-doctor.sh revoke-private-anywhere
sudo bash infra/firewall/demo-anywhere-ssh.sh disable
```

## Modo no interactivo

```bash
bash scripts/demo/predia-live-demo.sh --all
```

Este modo devuelve codigo `0` solamente cuando todas las evidencias se aprueban, por lo que tambien sirve como preflight antes de presentar.

Si cambiaste de IP y aun no autorizaste SSH para Grafana/UFW remoto, usa el recorrido publico:

```bash
bash scripts/demo/predia-live-demo.sh --public
```

## Scripts utilizados

| Script | Evidencia | Efecto |
|---|---|---|
| `predia-live-demo.sh` | Menu y recorrido completo | Orquestacion local |
| `security-tests.sh` | bcrypt, AES-256-GCM y JWT | Pruebas locales aisladas |
| `jwt-api-demo.sh` | Rechazo de acceso no autorizado | Dos solicitudes de solo lectura |
| `production-readonly.sh` | Firewall, TLS, replicas y servicios | Consultas remotas de solo lectura |
| `open-grafana.sh` | Dashboard provisionado | Tunel SSH local y navegador |
| `grafana-live-pulse.sh` | Cambio visible de CPU en Grafana | Carga temporal limitada a 85% de un CPU durante 50 s |
| `data-validation-demo.sh` | Peso fuera de rango y cita pasada | Dos POST invalidos y lecturas de comprobacion |
| `ufw-status-demo.sh` | Reglas UFW activas | Consulta remota de `sudo ufw status verbose`; acepta `--private`, `--public` o `--both` |
| `ssh-access-doctor.sh` | Cambio de IP y Grafana | Detecta IP publica, prueba SSH y puede autorizar/revocar SSH temporal con AWS CLI |
| `infra/firewall/demo-anywhere-ssh.sh` | UFW temporal para demo | Permite o retira SSH desde cualquier red con rate limit |
| `start-observability-tunnel.sh` | Grafana y Prometheus privados | Reenvio SSH local |
| `stop-observability-tunnel.sh` | Cierre del acceso administrativo | Ningun cambio remoto |

## Preparacion recomendada

```bash
bash scripts/demo/preflight.sh --run-tests
bash scripts/demo/open-grafana.sh --check
```

Durante la exposicion no se deben abrir `.env`, historiales de terminal, AWS ni gestores de contrasenas. Las pruebas criptograficas usan llaves efimeras y el chequeo HTTP nunca emplea ni imprime un JWT valido de produccion.

## Configuracion opcional

Los valores actuales tienen defaults no sensibles. Para utilizar otro host, crea un archivo fuera de Git a partir de `config.example.sh` y cargalo con:

```bash
export PREDIA_DEMO_CONFIG=/ruta/segura/config.local.sh
./scripts/demo/predia-live-demo.sh
```
