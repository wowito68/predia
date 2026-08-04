# PREDIA - Guion de grabacion tecnica (5:00 exactos)

## Reglas durante la toma

- No iniciar sesion en PREDIA ni mostrar expedientes.
- Grafana debe quedar autenticado antes de iniciar OBS; no grabar la contrasena.
- No abrir `.env`, consolas de cookies, tokens, backups ni configuracion de AWS.
- No ejecutar despliegues, migraciones, backup, restore, rollback o reglas de firewall.
- La app movil y la sincronizacion movil-web se demuestran en vivo, no en este video.

## 0:00-0:40 - Introduccion

**Pantalla:** titulo de PREDIA en la web publica. Iniciar `cue-timer.sh` al comenzar OBS.

**Narracion:**

> PREDIA es una plataforma clinica inteligente para deteccion temprana y seguimiento de diabetes. En cinco minutos mostraremos su aplicacion web desplegada, controles criptograficos, arquitectura, HTTPS, balanceo y observabilidad. Esta grabacion usa exclusivamente endpoints publicos de salud, pruebas locales y consultas remotas de solo lectura. No contiene datos personales, credenciales ni la aplicacion movil; la sincronizacion movil se presentara en vivo.

## 0:40-1:40 - Aplicacion web

**Pantalla:** `https://prediaa.duckdns.org/`, candado HTTPS y despues `/login`. No escribir credenciales.

**Narracion:**

> La web se entrega por HTTPS desde AWS. La interfaz Next.js consume una API central y no accede directamente a MySQL. Nginx es el unico punto de entrada publico y sirve la experiencia web mientras enruta `/api` hacia las instancias privadas. La pantalla de acceso separa la experiencia publica de las rutas clinicas protegidas. Para conservar privacidad, no iniciaremos sesion ni mostraremos pacientes durante esta grabacion.

**Accion breve:** mostrar en terminal:

```bash
curl -sS -o /dev/null -w 'HTTP %{http_code} -> %{redirect_url}\n' http://prediaa.duckdns.org/
curl -fsS https://prediaa.duckdns.org/api/ready
```

> El 301 confirma la redireccion a HTTPS. Readiness ejecuta una consulta minima y confirma que API y base de datos pueden atender trafico.

## 1:40-2:40 - Seguridad

**Pantalla:** ventana `seguridad` de tmux. Ejecutar:

```bash
bash scripts/demo/security-tests.sh
```

**Narracion:**

> Estas son pruebas locales, aisladas de produccion. bcrypt protege contrasenas y PIN mediante un hash lento, irreversible y con salt. AES-256-GCM cifra informacion que si debe recuperarse y detecta alteraciones mediante autenticacion. Los access tokens JWT validan firma, algoritmo, emisor, audiencia, expiracion y rol, sin incluir datos clinicos. El refresh token es opaco, se almacena como hash SHA-256 y se rota en cada renovacion; una reutilizacion se rechaza. Las once pruebas cubren credenciales correctas e incorrectas, cifrado y descifrado, manipulacion de JWT, expiracion, rotacion y replay.

## 2:40-3:30 - Infraestructura y HTTPS

**Pantalla:** ventana `infraestructura`, seguida de la salida TLS preparada.

```bash
bash scripts/infra/verify-two-server-architecture.sh
bash scripts/demo/production-readonly.sh firewall
bash scripts/demo/production-readonly.sh tls
```

**Narracion:**

> La implementacion usa dos instancias EC2 fisicas dentro de la misma VPC. El servidor publico contiene Nginx, TLS, web, movil y dos replicas balanceadas. El segundo servidor ejecuta MySQL y observabilidad; MySQL solo admite la IP privada del servidor publico, mientras Grafana y Prometheus escuchan en localhost. UFW deniega entrada por defecto, Fail2ban protege SSH y una regla de Docker bloquea cualquier otro origen. El certificado de Let's Encrypt es valido y el trafico entre capas usa direcciones privadas de la VPC.

## 3:30-4:30 - Balanceo y monitoreo

**Pantalla:** ejecutar balanceo; despues cambiar a Grafana ya autenticado.

```bash
bash scripts/demo/production-readonly.sh balance
bash scripts/demo/start-observability-tunnel.sh
node scripts/demo/monitoring-summary.mjs
```

**Narracion:**

> Nginx aplica `least_conn` sobre dos replicas stateless. Doce solicitudes al health check muestran los identificadores de ambas instancias sin consultar datos clinicos. Si una replica deja de responder, los fallos pasivos y timeouts permiten usar la otra. Prometheus recopila salud de API, CPU, memoria, disco y contenedores desde la EC2 privada. Grafana visualiza esas series desde un datasource provisionado. Ambos paneles administrativos estan enlazados a localhost en el servidor privado y se consultan mediante un tunel SSH, nunca por un puerto publico.

## 4:30-5:00 - Cierre

**Pantalla:** ventana `evidencia`; mostrar nombres de jobs y lineas de validacion, no logs con variables.

```bash
bash scripts/demo/ci-recovery-evidence.sh
```

**Narracion:**

> GitHub Actions automatiza secretos, calidad, pruebas, migraciones temporales y builds antes del despliegue. Backup, restauracion y rollback estan versionados, pero no los ejecutamos. El timer de respaldo aun debe habilitarse en el VPS. Cerramos con una plataforma web protegida y observable; la sincronizacion movil se mostrara en vivo.

**A 5:00 exactos:** detener grabacion en OBS.
