# PREDIA - Explicacion del script `predia-live-demo.sh`

Fecha: 2026-08-04  
Archivo principal: `scripts/demo/predia-live-demo.sh`  
Tipo de herramienta: panel local de demostracion tecnica en vivo

## 1. Proposito general

`predia-live-demo.sh` es un panel interactivo para presentar, en una sola terminal, evidencias reales de seguridad, infraestructura, monitoreo y disponibilidad de PREDIA.

Su objetivo no es simular resultados ni mostrar capturas preparadas. El script ejecuta pruebas nuevas en el momento de la exposicion y marca cada evidencia como aprobada o fallida segun el resultado real.

El panel permite demostrar:

1. Hasheado de contrasenas con bcrypt.
2. Cifrado de datos sensibles con AES-256-GCM.
3. Proteccion de API con JWT.
4. Firewall activo con UFW, Fail2ban e iptables.
5. Certificado SSL real de la plataforma.
6. Balanceador de carga entre replicas.
7. Monitoreo con Prometheus y Grafana.
8. Actualizacion visual en vivo del dashboard de Grafana.

## 2. Como se ejecuta

Desde la raiz del repositorio:

```bash
./scripts/demo/predia-live-demo.sh
```

Tambien puede ejecutarse todo el recorrido sin menu:

```bash
./scripts/demo/predia-live-demo.sh --all
```

Y puede comprobarse solo Grafana:

```bash
./scripts/demo/predia-live-demo.sh --check-grafana
```

## 3. Que muestra el menu

El panel muestra siete opciones principales:

| Opcion | Nombre | Evidencia |
|---|---|---|
| 1 | Criptografia | bcrypt y AES-256-GCM |
| 2 | Proteccion JWT | validacion de JWT y rechazo HTTP 401 |
| 3 | Firewall | UFW, Fail2ban y filtro Docker |
| 4 | Certificado SSL | HTTPS, issuer, vigencia y huella SHA-256 |
| 5 | Balanceador | distribucion real entre replicas |
| 6 | Monitoreo | Prometheus y Grafana privados |
| 7 | Pulso en Grafana | cambio visible en dashboard |

Ademas:

| Opcion | Funcion |
|---|---|
| A | ejecuta todas las evidencias en secuencia |
| G | abre directamente el dashboard de Grafana |
| Q | sale del panel |

Cada opcion imprime antes de correr:

- **QUE HACE:** explica el control que se va a probar.
- **POR QUE ES UNA PRUEBA REAL:** explica de donde sale la evidencia y por que no es simulada.
- **Resultado:** marca la evidencia como aprobada o fallida.

## 4. Estructura interna del script

El script carga primero `scripts/demo/lib.sh`, que centraliza configuracion y funciones comunes:

- dominio publico de PREDIA;
- host SSH de la EC2 privada;
- rutas del repositorio;
- puerto local de Grafana y Prometheus;
- funcion `ssh_demo` para consultas remotas seguras;
- funciones visuales como `ok`, `warn`, `die` y `section`.

Despues define colores de terminal, una tabla interna de resultados y funciones de menu.

La funcion mas importante es `execute()`:

```bash
execute <clave> <titulo> <comando>
```

Esta funcion:

1. Limpia la pantalla si el modo es interactivo.
2. Muestra el titulo de la evidencia.
3. Imprime la explicacion de lo que se probara.
4. Ejecuta el script o comando asociado.
5. Si el comando termina correctamente, marca `[OK]`.
6. Si el comando falla, marca `[X]` y devuelve error.

Por eso la demo es verificable: cada opcion depende del codigo de salida del comando real que ejecuta.

## 5. Evidencia 1 - Criptografia

Comando invocado:

```bash
scripts/demo/security-tests.sh crypto
```

Que prueba:

- bcrypt genera un hash y no almacena la contrasena en claro;
- bcrypt valida credenciales correctas e incorrectas;
- AES-256-GCM cifra datos sensibles;
- AES-256-GCM descifra correctamente con la llave valida;
- AES-256-GCM rechaza una llave incorrecta.

Por que es real:

- Jest importa funciones reales de `apps/web/lib/auth.ts` y `apps/web/lib/crypto.ts`;
- genera datos efimeros en cada ejecucion;
- falla si el hash contiene el texto original;
- falla si el descifrado no coincide;
- falla si una llave equivocada logra descifrar.

Frase sugerida:

> Aqui demostramos que PREDIA no guarda contrasenas en texto plano. Las contrasenas se validan mediante bcrypt y los datos sensibles recuperables se protegen con AES-256-GCM, que ademas detecta manipulacion.

## 6. Evidencia 2 - Proteccion JWT

Comando invocado:

```bash
scripts/demo/jwt-api-demo.sh
```

Que prueba:

- JWT firmado con HS256;
- validacion de emisor;
- validacion de audiencia;
- validacion de expiracion;
- rechazo de token manipulado;
- rechazo de solicitudes sin token contra `/api/pacientes`;
- rechazo de solicitudes con token invalido contra `/api/pacientes`.

Por que es real:

- primero ejecuta pruebas unitarias sobre el codigo real de autenticacion;
- despues hace solicitudes HTTPS a la API desplegada;
- espera respuestas HTTP `401`;
- si la API aceptara una solicitud sin credenciales, la evidencia fallaria.

Frase sugerida:

> Esta prueba muestra que no basta con conocer una ruta de la API. Si no hay JWT valido, la API rechaza la solicitud con 401. El token se valida criptograficamente y no contiene informacion clinica sensible.

## 7. Evidencia 3 - Firewall

Comando invocado:

```bash
scripts/demo/production-readonly.sh firewall
```

Que prueba:

- UFW esta activo;
- la politica por defecto deniega entradas;
- Fail2ban esta activo para SSH;
- existe una cadena iptables `PREDIA-PRIVATE`;
- los contenedores no pueden consultar metadata EC2;
- MySQL privado solo permite el origen esperado.

Por que es real:

- se conecta por SSH a la EC2 privada;
- consulta el estado activo de UFW;
- consulta Fail2ban mediante `fail2ban-client`;
- lee las reglas activas del kernel con `iptables`;
- no se basa en archivos de configuracion guardados.

Frase sugerida:

> Aqui no estamos leyendo un documento de firewall. Estamos consultando el estado activo del servidor privado. Si UFW, Fail2ban o las reglas de Docker no estuvieran aplicadas ahora mismo, esta prueba fallaria.

## 8. Evidencia 4 - Certificado SSL

Comando invocado:

```bash
scripts/demo/production-readonly.sh tls
```

Que prueba:

- HTTP redirige a HTTPS;
- `/api/ready` responde correctamente;
- el certificado publico existe;
- el certificado pertenece al dominio;
- el certificado tiene emisor, fechas y huella SHA-256.

Por que es real:

- usa `curl` contra `http://prediaa.duckdns.org`;
- usa `curl` contra `https://prediaa.duckdns.org/api/ready`;
- usa `openssl s_client` con SNI hacia el dominio real;
- lee el certificado entregado en ese momento por el servidor.

Frase sugerida:

> Esta evidencia comprueba el transporte seguro. El dominio redirige a HTTPS y OpenSSL lee el certificado que recibiria cualquier cliente real al conectarse a PREDIA.

## 9. Evidencia 5 - Balanceador de carga

Comando invocado:

```bash
scripts/demo/production-readonly.sh balance
```

Que prueba:

- Nginx recibe solicitudes HTTPS;
- existen al menos dos replicas de API;
- las respuestas devuelven la cabecera `X-PREDIA-Instance`;
- el trafico se reparte entre instancias reales.

Por que es real:

- envia doce solicitudes reales a `/api/health`;
- agrupa la cabecera devuelta por cada replica;
- exige observar dos identificadores distintos;
- si solo respondiera una instancia, la prueba fallaria.

Frase sugerida:

> El balanceador no se demuestra solo con un diagrama. Hacemos varias solicitudes y vemos que responden dos instancias distintas de la API, cada una identificandose con su propia cabecera.

## 10. Evidencia 6 - Monitoreo

Comando invocado:

```bash
scripts/demo/production-readonly.sh monitoring
```

Que prueba:

- Prometheus responde como servidor listo;
- Prometheus tiene objetivos activos;
- todos los objetivos esperados estan `UP`;
- Grafana responde y su base interna esta sana.

Por que es real:

- se consulta la API interna de Prometheus;
- se cuenta el numero de targets activos;
- se verifica que todos esten saludables;
- se consulta `/api/health` de Grafana;
- todo viaja por tunel SSH porque Grafana y Prometheus no son publicos.

Frase sugerida:

> El monitoreo vive en la segunda EC2 y no esta expuesto a Internet. Esta prueba entra por SSH, consulta Prometheus y Grafana localmente, y confirma que todos los objetivos estan arriba.

## 11. Evidencia 7 - Pulso en Grafana

Comando invocado:

```bash
scripts/demo/grafana-live-pulse.sh
```

Que prueba:

- Grafana puede abrir el dashboard `PREDIA - Salud del sistema`;
- Prometheus recopila la metrica real de CPU del servidor privado;
- una carga temporal aparece en la grafica;
- la carga esta limitada y se detiene sola.

Como funciona:

1. Abre o reutiliza el tunel SSH hacia Grafana.
2. Consulta la CPU antes del pulso.
3. Crea una unidad temporal de systemd con `systemd-run`.
4. Le asigna `CPUQuota=85%`.
5. Le asigna `RuntimeMaxSec=50s`.
6. Espera nuevas muestras de Prometheus.
7. Aprueba solo si la CPU sube al menos 3 puntos.
8. Deja que systemd termine la carga automaticamente.

Por que es real:

- la carga se ejecuta en la EC2 privada;
- Prometheus mide el host real;
- Grafana lee esa misma metrica;
- si Prometheus no detecta el incremento, la prueba falla.

Frase sugerida:

> Para que el monitoreo no se vea estatico, generamos un pulso controlado. No toca datos clinicos ni la base. Solo aumenta CPU unos segundos, Prometheus lo detecta y Grafana lo muestra en vivo.

## 12. Seguridad operacional del panel

El panel fue disenado para presentarse sin exponer secretos:

- no imprime `.env`;
- no imprime tokens validos;
- no muestra contrasenas;
- no consulta datos clinicos;
- no modifica registros de pacientes;
- no cambia reglas de firewall;
- no reinicia la aplicacion publica.

La opcion 7 si genera una accion temporal, pero esta controlada:

- corre solo en la EC2 privada;
- usa `CPUQuota=85%`;
- usa `RuntimeMaxSec=50s`;
- no toca MySQL;
- no toca archivos clinicos;
- no cambia configuracion persistente;
- tiene limpieza por `trap` si se interrumpe.

## 13. Condiciones de fallo

El script no maquilla errores. Una evidencia falla si ocurre cualquiera de estos casos:

- una prueba Jest no pasa;
- la API acepta un token invalido;
- UFW no esta activo;
- Fail2ban no esta activo;
- no existe la regla esperada de iptables;
- HTTPS no responde;
- el certificado no puede leerse;
- solo responde una replica;
- Prometheus tiene objetivos caidos;
- Grafana no responde;
- el pulso de CPU no aparece en Prometheus.

En modo `--all`, si una evidencia falla, el script devuelve un codigo distinto de cero.

## 14. Version para explicar a cualquier publico

PREDIA tiene una herramienta de demostracion que funciona como un tablero de pruebas en vivo. En vez de pedirle al publico que confie en lo que decimos, la herramienta revisa el sistema en ese momento.

Primero comprueba que las contrasenas no se guardan como texto normal y que los datos sensibles pueden cifrarse. Esto es parecido a guardar informacion en una caja cerrada: una contrasena no se recupera, solo se verifica; y un dato sensible solo puede leerse si se tiene la llave correcta.

Despues verifica que la API no acepte visitantes sin permiso. Si alguien intenta entrar sin una credencial valida, el servidor responde "no autorizado". Esto demuestra que las pantallas no son la unica proteccion: tambien hay seguridad en el servidor.

Luego revisa el firewall. El firewall funciona como una puerta de entrada: deja pasar solo lo necesario y bloquea lo que no debe estar abierto. La prueba no lee un documento, sino el estado real del servidor.

Tambien revisa el certificado HTTPS. Eso demuestra que la conexion viaja cifrada entre el telefono, la computadora y PREDIA. Si alguien observa la red, no deberia poder leer los datos como texto plano.

Otra prueba muestra el balanceador de carga. En palabras simples, PREDIA tiene mas de una instancia lista para responder. La herramienta manda varias solicitudes y comprueba que contesten dos replicas distintas.

Despues abre el monitoreo. Prometheus recoge informacion del sistema y Grafana la muestra visualmente. Es como el tablero de signos vitales de la plataforma: disponibilidad, CPU, memoria, base de datos y servicios.

Finalmente, la herramienta genera un cambio visible en Grafana. Hace que el servidor privado trabaje un poco durante menos de un minuto. Ese cambio sube en la grafica y despues baja solo. Esto sirve para demostrar que el monitoreo no es una imagen fija, sino informacion en tiempo real.

Una forma sencilla de decirlo en la exposicion:

> Este panel es nuestra evidencia viva. Ejecuta pruebas reales sobre PREDIA: seguridad de datos, proteccion de API, firewall, HTTPS, balanceador y monitoreo. Si algo no funciona, el panel falla. Si todo esta correcto, cada punto queda marcado como aprobado.

## 15. Guion corto para presentarlo

> Vamos a usar `predia-live-demo.sh`, que es un centro de evidencia tecnica. Cada opcion ejecuta una comprobacion real. No son capturas ni resultados escritos a mano.
>
> La primera parte valida criptografia: bcrypt para contrasenas y AES-256-GCM para datos sensibles recuperables.
>
> La segunda parte prueba JWT: la API rechaza accesos sin token o con token invalido.
>
> Despues comprobamos el firewall real del servidor privado, el certificado HTTPS, el balanceador con dos replicas y el monitoreo privado con Prometheus y Grafana.
>
> Finalmente generamos un pulso controlado de CPU para que Grafana cambie en vivo. Esto demuestra que el monitoreo esta midiendo el servidor real.

## 16. Recomendaciones para la demostracion

Antes de presentar:

```bash
./scripts/demo/preflight.sh
./scripts/demo/open-grafana.sh --check
```

Durante la presentacion:

- cerrar archivos `.env`;
- no abrir AWS ni gestores de contrasenas;
- ejecutar primero opciones 1 a 6;
- usar la opcion 7 cuando Grafana ya este visible;
- esperar unos segundos para que la grafica suba;
- explicar que la carga termina automaticamente.

Para cerrar tuneles al final:

```bash
./scripts/demo/stop-observability-tunnel.sh
```

## 17. Archivos relacionados

| Archivo | Funcion |
|---|---|
| `scripts/demo/predia-live-demo.sh` | menu principal |
| `scripts/demo/lib.sh` | configuracion comun y SSH seguro |
| `scripts/demo/security-tests.sh` | pruebas bcrypt, AES y JWT |
| `scripts/demo/jwt-api-demo.sh` | prueba HTTP 401 contra API real |
| `scripts/demo/production-readonly.sh` | firewall, TLS, balanceo y monitoreo |
| `scripts/demo/open-grafana.sh` | abre el dashboard de Grafana |
| `scripts/demo/grafana-live-pulse.sh` | genera el pulso visual en Grafana |
| `scripts/demo/preflight.sh` | validacion previa de herramientas y acceso |
| `scripts/demo/stop-observability-tunnel.sh` | cierra el tunel de observabilidad |

## 18. Conclusion

`predia-live-demo.sh` convierte la defensa tecnica de PREDIA en una demostracion verificable. Permite mostrar controles de seguridad, disponibilidad e infraestructura con evidencia generada en vivo, sin exponer secretos ni alterar informacion clinica.

Para el jurado tecnico, demuestra controles concretos: hashing, cifrado, JWT, firewall, TLS, balanceador, Prometheus y Grafana. Para un publico general, comunica una idea simple: PREDIA no solo se ve funcional, tambien puede probar en vivo que esta protegida y monitoreada.
